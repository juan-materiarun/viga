import { createLog } from './supabase';

type LogLevel = 'debug' | 'info' | 'success' | 'warn' | 'error' | 'thought' | 'action';

const COLORS = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    dim: '\x1b[2m',
    underscore: '\x1b[4m',
    black: '\x1b[30m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
    bgRed: '\x1b[41m',
    bgGreen: '\x1b[42m',
    bgYellow: '\x1b[43m',
    bgBlue: '\x1b[44m',
    bgMagenta: '\x1b[45m',
    bgCyan: '\x1b[46m',
    bgWhite: '\x1b[47m'
};

export class Logger {
    private static showDebug = process.env.VIGA_DEBUG === 'true';

    private static format(level: LogLevel, message: string, suiteId?: string): string {
        const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
        const shortId = suiteId ? `[${suiteId.slice(-4)}]` : '[SYS]';

        // Define styles per level
        const styles: Record<LogLevel, string> = {
            debug: `${COLORS.dim}🔍 DEBUG${COLORS.reset}`,
            info: `${COLORS.blue}ℹ️ INFO${COLORS.reset}`,
            success: `${COLORS.green}✅ SUCCESS${COLORS.reset}`,
            warn: `${COLORS.yellow}⚠️ WARN${COLORS.reset}`,
            error: `${COLORS.red}❌ ERROR${COLORS.reset}`,
            thought: `${COLORS.cyan}💡 THOUGHT${COLORS.reset}`,
            action: `${COLORS.magenta}🖱️ ACTION${COLORS.reset}`
        };

        const prefix = `${COLORS.dim}${timestamp}${COLORS.reset} ${shortId} ${styles[level]}:`;
        return `${prefix} ${message}`;
    }

    static debug(message: string, suiteId?: string) {
        if (this.showDebug) {
            console.log(this.format('debug', message, suiteId));
        }
    }

    static info(message: string, suiteId?: string) {
        console.log(this.format('info', message, suiteId));
    }

    static success(message: string, suiteId?: string) {
        console.log(this.format('success', message, suiteId));
    }

    static warn(message: string, suiteId?: string) {
        console.log(this.format('warn', message, suiteId));
    }

    static error(message: string, error?: any, suiteId?: string) {
        console.error(this.format('error', message, suiteId));
        if (error) {
            if (error instanceof Error) {
                console.error(`${COLORS.red}${error.stack}${COLORS.reset}`);
            } else {
                console.error(`${COLORS.red}${JSON.stringify(error, null, 2)}${COLORS.reset}`);
            }
        }
    }

    static thought(message: string, suiteId?: string) {
        console.log(this.format('thought', `${COLORS.cyan}${message}${COLORS.reset}`, suiteId));
    }

    static action(message: string, suiteId?: string) {
        console.log(this.format('action', `${COLORS.bright}${message}${COLORS.reset}`, suiteId));
    }

    /**
     * Log to console AND database
     */
    static async log(suiteId: string, message: string, level: 'info' | 'success' | 'warning' | 'error' = 'info') {
        // Map DB level to console level
        switch (level) {
            case 'info': this.info(message, suiteId); break;
            case 'success': this.success(message, suiteId); break;
            case 'warning': this.warn(message, suiteId); break;
            case 'error': this.error(message, undefined, suiteId); break;
        }

        // Async save to DB (fire and forget to not block execution)
        createLog(suiteId, message, level).catch(err => {
            console.error(`${COLORS.red}[Logger] Failed to save log to DB: ${err.message}${COLORS.reset}`);
        });
    }
}
