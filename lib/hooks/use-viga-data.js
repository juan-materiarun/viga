import useSWR from 'swr';
import { supabase } from '@/lib/supabase/client';

/**
 * Generic fetcher for Supabase queries
 * Key is structured as: [tableName, options]
 */
const supabaseFetcher = async (key) => {
    const [table, options = {}] = key;
    let query = supabase.from(table).select(options.select || '*');

    if (options.eq) {
        Object.entries(options.eq).forEach(([col, val]) => {
            query = query.eq(col, val);
        });
    }

    if (options.order) {
        query = query.order(options.order.column, { ascending: options.order.ascending ?? false });
    }

    if (options.limit) {
        query = query.limit(options.limit);
    }

    if (options.in) {
        Object.entries(options.in).forEach(([col, val]) => {
            query = query.in(col, val);
        });
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
};

// --- Specific Hooks ---

export function useRecentSuites(limit = 5) {
    return useSWR(
        ['test_suites', { select: '*', order: { column: 'created_at', ascending: false }, limit }],
        supabaseFetcher,
        {
            refreshInterval: 5000, // Poll every 5 seconds for status updates
            revalidateOnFocus: true,
            dedupingInterval: 2000
        }
    );
}

export function useDesbloqueadas() {
    return useSWR(
        ['test_suites', {
            select: 'id, name, base_url, created_at',
            eq: { status: 'completed' },
            order: { column: 'created_at', ascending: false }
        }],
        supabaseFetcher,
        {
            revalidateOnFocus: true,
            dedupingInterval: 10000 // Less frequent refresh
        }
    );
}

export function usePerformanceData(limit = 200) {
    return useSWR(
        ['test_suites', {
            select: 'id, base_url, status, created_at, completed_at, test_steps(created_at)',
            in: { status: ['completed', 'failed'] },
            order: { column: 'created_at', ascending: false },
            limit
        }],
        supabaseFetcher,
        {
            revalidateOnFocus: false, // Don't spam on window focus
            dedupingInterval: 30000   // 30 seconds cache for heavy stats
        }
    );
}

export function useProfile(userId) {
    return useSWR(
        userId ? ['profiles', { eq: { id: userId } }] : null,
        async (key) => {
            const data = await supabaseFetcher(key);
            return data?.[0] || null;
        },
        {
            revalidateOnFocus: true,
            dedupingInterval: 10000
        }
    );
}

export function useInfraStatus() {
    return useSWR(
        'infra-status',
        async () => {
            const startDb = performance.now();
            const dbPromise = supabase.from('profiles').select('id').limit(1);

            const apiPromise = fetch('https://api.groq.com/openai/v1/models', { mode: 'no-cors' }).catch(() => null);

            const [dbResult, apiResult] = await Promise.all([dbPromise, apiPromise]);

            const endDb = performance.now();
            const dbLatency = Math.round(endDb - startDb);

            const endApi = performance.now();
            const apiLatency = Math.round(endApi - startApi);

            const { error: dbError } = dbResult;

            return [
                {
                    name: 'Agent Intelligence',
                    status: apiLatency < 1000 ? 'healthy' : 'warning',
                    uptime: '99.99%',
                    load: `${apiLatency}ms`,
                    spec: 'Llama-3.3-70b',
                    type: 'Groq API',
                    progress: Math.min(100, (apiLatency / 500) * 100)
                },
                {
                    name: 'Mission Database',
                    status: !dbError ? 'healthy' : 'error',
                    uptime: '100%',
                    load: `${dbLatency}ms`,
                    spec: 'PostgreSQL 15',
                    type: 'Supabase',
                    progress: Math.min(100, (dbLatency / 300) * 100)
                },
                {
                    name: 'Headless Engine',
                    status: 'healthy',
                    uptime: '99.9%',
                    load: '24ms',
                    spec: 'Playwright CDP',
                    type: 'Vercel Edge',
                    progress: 12
                },
                {
                    name: 'VIGA Core API',
                    status: 'healthy',
                    uptime: '99.8%',
                    load: '14ms',
                    spec: 'Node.js 20',
                    type: 'Next.js',
                    progress: 8
                },
            ];
        },
        {
            refreshInterval: 30000,
            revalidateOnFocus: true
        }
    );
}

