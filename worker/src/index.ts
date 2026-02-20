import 'dotenv/config';
import { pollPendingJobs, updateJobStatus, Job, enforceJobTimeouts, claimJob } from './lib/supabase';
import { runChaosAgent } from './agents/chaos';
import { runScoutAgent } from './agents/scout';
import { runAtlasAgent } from './agents/atlas';
import { runStrikeAgent } from './agents/strike';
import { runReplayAgent } from './agents/replay';
import { Logger } from './lib/logger';

const POLL_INTERVAL = parseInt(process.env.POLL_INTERVAL_MS || '3000', 10);
const MAX_RETRIES = parseInt(process.env.MAX_RETRIES || '3', 10);

let isShuttingDown = false;

async function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function executeJob(job: Job) {
    Logger.info(`🚀 Starting job ${job.id} (${job.job_type})`, job.suite_id);
    await Logger.log(job.suite_id, `🤖 Worker asignado. Iniciando trabajo: ${job.job_type.toUpperCase()}`, 'info');

    try {
        await updateJobStatus(job.id, 'running');

        switch (job.job_type) {
            case 'chaos':
                await runChaosAgent(job.id, job.url, job.suite_id, job.credentials);
                break;

            case 'scout':
                await runScoutAgent(job.id, job.url, job.suite_id);
                break;

            case 'atlas':
                await runAtlasAgent(job.id, job.suite_id);
                break;

            case 'strike':
                await runStrikeAgent(job.id, job.url, job.suite_id, job.objective || 'Objective not specified', job.credentials);
                break;

            case 'replay':
                await runReplayAgent(job.id, job.url, job.suite_id, job.steps || [], job.credentials);
                break;

            default:
                throw new Error(`Unknown job type: ${job.job_type}`);
        }

        await updateJobStatus(job.id, 'completed', {
            result: { success: true, completed_at: new Date().toISOString() }
        });

        Logger.success(`Job ${job.id} completed successfully`, job.suite_id);

    } catch (error: any) {
        Logger.error(`Job ${job.id} failed`, error, job.suite_id);

        await updateJobStatus(job.id, 'failed', {
            error: error.message,
            result: { success: false, error: error.message }
        });
    }
}

async function workerLoop() {
    Logger.info(`🤖 VIGA Worker started (PID: ${process.pid})`);
    Logger.info(`📊 Poll interval: ${POLL_INTERVAL}ms`);
    Logger.info(`🌐 Browserless WS: ${process.env.BROWSERLESS_WS ? 'configured' : 'missing'}`);

    let consecutiveErrors = 0;

    // Status reporting variants
    let lastStatusReport = 0;
    const REPORT_INTERVAL = 60000; // 1 minute

    // Periodic job timeout enforcement (every 5 minutes)
    const timeoutInterval = setInterval(async () => {
        try {
            await enforceJobTimeouts();
        } catch (error: any) {
            Logger.error('Error enforcing timeouts', error);
        }
    }, 5 * 60 * 1000); // 5 minutes

    // Cleanup interval on shutdown
    process.on('beforeExit', () => clearInterval(timeoutInterval));

    while (!isShuttingDown) {
        try {
            const jobs = await pollPendingJobs();

            if (jobs.length > 0) {
                Logger.info(`📥 Found ${jobs.length} pending job(s)`);
                consecutiveErrors = 0;

                for (const job of jobs) {
                    if (isShuttingDown) {
                        Logger.warn('🛑 Shutdown requested, stopping job processing');
                        break;
                    }

                    await sleep(Math.random() * 2000); // Small jitter

                    // Optimistic Locking Claim
                    const claimedJob = await claimJob(job.id);

                    if (!claimedJob) {
                        Logger.warn(`⚠️ Job ${job.id} was already claimed by another worker. Skipping.`);
                        continue;
                    }

                    await executeJob(claimedJob);
                }
            } else {
                // Silent polling - report only periodically
                const now = Date.now();
                if (now - lastStatusReport > REPORT_INTERVAL) {
                    process.stdout.write(`\r[${new Date().toISOString().split('T')[1].split('.')[0]}] 💤 Worker Idle (Polling every ${POLL_INTERVAL}ms)`);
                    lastStatusReport = now;
                }
            }

        } catch (error: any) {
            consecutiveErrors++;
            Logger.error(`⚠️ Error in worker loop (${consecutiveErrors}/${MAX_RETRIES})`, error);

            if (consecutiveErrors >= MAX_RETRIES) {
                Logger.error('💥 Max consecutive errors reached. Exiting...');
                process.exit(1);
            }

            await sleep(POLL_INTERVAL * Math.min(consecutiveErrors, 5));
            continue;
        }

        await sleep(POLL_INTERVAL);
    }

    Logger.info('👋 Worker stopped gracefully');
}

// Graceful shutdown handling
function setupShutdownHandlers() {
    const shutdown = (signal: string) => {
        Logger.warn(`🛑 Received ${signal}, initiating graceful shutdown...`);
        isShuttingDown = true;

        // Give current job 30 seconds to finish
        setTimeout(() => {
            Logger.error('⏱️ Shutdown timeout reached, forcing exit');
            process.exit(0);
        }, 30000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
}

// Main entry point
async function main() {
    process.stdout.write('\x1b[2J\x1b[0f'); // Clear screen
    console.log('');
    console.log('╔═══════════════════════════════════════╗');
    console.log('║   VIGA CHAOS WORKER v1.0.0            ║');
    console.log('║   Autonomous Testing Agent            ║');
    console.log('╚═══════════════════════════════════════╝');
    console.log('');
    Logger.info('🧪 LOGGER TEST: Si ves esto, los logs funcionan correctamente.');

    // Validate environment
    if (!process.env.SUPABASE_URL) {
        console.error('❌ SUPABASE_URL is required');
        process.exit(1);
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
        console.error('❌ SUPABASE_SERVICE_ROLE_KEY is required');
        process.exit(1);
    }

    if (!process.env.GROQ_API_KEY) {
        console.error('❌ GROQ_API_KEY is required');
        process.exit(1);
    }

    setupShutdownHandlers();

    try {
        // Cleanup function is imported dynamically to avoid circular dependencies in some setups, but here it's fine.
        // We'll trust the direct import if available or stick to the dynamic one if we want to keep it consistent.
        // Let's import it directly at the top to be clean.
        const { cleanupStaleJobs } = await import('./lib/supabase');
        await cleanupStaleJobs();

        await workerLoop();
    } catch (error: any) {
        Logger.error('💥 Fatal error', error);
        process.exit(1);
    }
}

// Start the worker
main().catch((error) => {
    console.error('[WORKER] 💥 Unhandled error:', error);
    process.exit(1);
});
