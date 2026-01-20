import { pollPendingJobs, updateJobStatus, Job } from './lib/supabase';
import { runChaosAgent } from './agents/chaos';
import { runStrikeAgent } from './agents/strike';
import { runReplayAgent } from './agents/replay';

const POLL_INTERVAL = parseInt(process.env.POLL_INTERVAL_MS || '3000', 10);
const MAX_RETRIES = parseInt(process.env.MAX_RETRIES || '3', 10);

let isShuttingDown = false;

async function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function executeJob(job: Job) {
    console.log(`[WORKER] 🚀 Executing job ${job.id} (${job.job_type}) for suite ${job.suite_id}`);

    try {
        await updateJobStatus(job.id, 'running');

        switch (job.job_type) {
            case 'chaos':
                await runChaosAgent(job.id, job.url, job.suite_id, job.credentials);
                break;

            case 'strike':
                if (!job.goal) {
                    throw new Error('Strike job requires a goal');
                }
                await runStrikeAgent(job.id, job.url, job.suite_id, job.goal);
                break;

            case 'replay':
                if (!job.steps || !Array.isArray(job.steps)) {
                    throw new Error('Replay job requires steps array');
                }
                await runReplayAgent(job.id, job.url, job.suite_id, job.steps);
                break;

            default:
                throw new Error(`Unknown job type: ${job.job_type}`);
        }

        await updateJobStatus(job.id, 'completed', {
            result: { success: true, completed_at: new Date().toISOString() }
        });

        console.log(`[WORKER] ✅ Job ${job.id} completed successfully`);

    } catch (error: any) {
        console.error(`[WORKER] ❌ Job ${job.id} failed:`, error.message);
        console.error(error.stack);

        await updateJobStatus(job.id, 'failed', {
            error: error.message,
            result: { success: false, error: error.message }
        });
    }
}

async function workerLoop() {
    console.log('[WORKER] 🤖 VIGA Worker started');
    console.log(`[WORKER] 📊 Poll interval: ${POLL_INTERVAL}ms`);
    console.log(`[WORKER] 🔄 Max retries: ${MAX_RETRIES}`);
    console.log(`[WORKER] 🌐 Browserless WS: ${process.env.BROWSERLESS_WS ? '✅ Configured' : '❌ Missing'}`);

    let consecutiveErrors = 0;

    while (!isShuttingDown) {
        try {
            const jobs = await pollPendingJobs();

            if (jobs.length > 0) {
                console.log(`[WORKER] 📥 Found ${jobs.length} pending job(s)`);

                for (const job of jobs) {
                    if (isShuttingDown) {
                        console.log('[WORKER] 🛑 Shutdown requested, stopping job processing');
                        break;
                    }

                    await executeJob(job);
                }

                consecutiveErrors = 0; // Reset error counter on successful processing
            } else {
                // No jobs, just heartbeat
                if (consecutiveErrors === 0) {
                    console.log('[WORKER] 💤 No pending jobs, waiting...');
                }
            }

        } catch (error: any) {
            consecutiveErrors++;
            console.error(`[WORKER] ⚠️ Error in worker loop (${consecutiveErrors}/${MAX_RETRIES}):`, error.message);

            if (consecutiveErrors >= MAX_RETRIES) {
                console.error('[WORKER] 💥 Max consecutive errors reached. Exiting...');
                process.exit(1);
            }

            // Exponential backoff on errors
            await sleep(POLL_INTERVAL * Math.min(consecutiveErrors, 5));
            continue;
        }

        // Wait before next poll
        await sleep(POLL_INTERVAL);
    }

    console.log('[WORKER] 👋 Worker stopped gracefully');
}

// Graceful shutdown handling
function setupShutdownHandlers() {
    const shutdown = (signal: string) => {
        console.log(`[WORKER] 🛑 Received ${signal}, initiating graceful shutdown...`);
        isShuttingDown = true;

        // Give current job 30 seconds to finish
        setTimeout(() => {
            console.log('[WORKER] ⏱️ Shutdown timeout reached, forcing exit');
            process.exit(0);
        }, 30000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
}

// Main entry point
async function main() {
    console.log('');
    console.log('╔═══════════════════════════════════════╗');
    console.log('║   VIGA CHAOS WORKER v1.0.0            ║');
    console.log('║   Autonomous Testing Agent            ║');
    console.log('╚═══════════════════════════════════════╝');
    console.log('');

    // Validate environment
    if (!process.env.SUPABASE_URL) {
        console.error('❌ SUPABASE_URL is required');
        process.exit(1);
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
        console.error('❌ SUPABASE_SERVICE_ROLE_KEY is required');
        process.exit(1);
    }

    if (!process.env.BROWSERLESS_WS) {
        console.error('❌ BROWSERLESS_WS is required');
        process.exit(1);
    }

    if (!process.env.GROQ_API_KEY) {
        console.error('❌ GROQ_API_KEY is required');
        process.exit(1);
    }

    setupShutdownHandlers();

    try {
        await workerLoop();
    } catch (error: any) {
        console.error('[WORKER] 💥 Fatal error:', error);
        process.exit(1);
    }
}

// Start the worker
main().catch((error) => {
    console.error('[WORKER] 💥 Unhandled error:', error);
    process.exit(1);
});
