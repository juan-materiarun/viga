'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import {
    Activity, Globe, Zap, ArrowUpRight, ArrowDownRight,
    CheckCircle2, LayoutGrid, List, RefreshCw
} from 'lucide-react';
import Card from '../components/Card';
import PerformanceChart from '@/components/PerformanceChart';
import { Skeleton } from '@/components/ui/skeleton';


export default function PerformancePage() {
    const router = useRouter();
    const [sites, setSites] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [viewMode, setViewMode] = useState('grid'); // grid | list
    const [stats, setStats] = useState({ total_runs: 0, avg_global_latency: 0, global_success_rate: 0 });

    useEffect(() => {
        fetchPerformanceData();
    }, []);

    const fetchPerformanceData = async () => {
        setIsLoading(true);

        // 1. Fetch completed suites ordered by date
        const { data: suites, error } = await supabase
            .from('test_suites')
            .select('id, base_url, status, created_at, completed_at, test_steps(created_at)')
            .in('status', ['completed', 'failed']) // Include failed runs for partial data
            .order('created_at', { ascending: false })
            .limit(200); // Analyze last 200 runs for performance

        if (error) {
            console.error("Error fetching performance data:", error);
            setIsLoading(false);
            return;
        }

        // 2. Process Data
        const siteMap = {};
        let totalLatency = 0;
        let successfulRuns = 0;
        let validRunsCount = 0;

        suites.forEach(suite => {
            if (!suite.base_url) return;

            let url;
            try {
                url = new URL(suite.base_url).hostname; // Group by hostname
            } catch (e) {
                console.warn("Invalid URL in test suite:", suite.base_url);
                return;
            }

            // Calculate Latency for this run
            let runLatency = 0;
            // Allow even single step runs to be counted (latency 0 or fallback)
            if (suite.test_steps && suite.test_steps.length > 0) {
                const sortedSteps = [...suite.test_steps].sort((a, b) =>
                    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
                );

                if (sortedSteps.length > 1) {
                    const first = new Date(sortedSteps[0].created_at).getTime();
                    const last = new Date(sortedSteps[sortedSteps.length - 1].created_at).getTime();
                    const duration = last - first;
                    const stepCount = sortedSteps.length;
                    runLatency = stepCount > 0 ? Math.round(duration / stepCount) : 0; // Avg Time Per Step
                }
            }

            // Global Stats Accumulation
            totalLatency += runLatency;
            if (suite.status === 'completed') {
                successfulRuns++;
            }
            validRunsCount++;

            // Site Aggregation
            if (!siteMap[url]) {
                siteMap[url] = {
                    url: suite.base_url,
                    hostname: url,
                    runs: [],
                    total_latency: 0,
                    success_count: 0
                };
            }

            if (suite.status === 'completed') {
                siteMap[url].success_count++;
            }

            siteMap[url].runs.push({
                created_at: suite.created_at,
                latency: runLatency,
                status: suite.status
            });
            siteMap[url].total_latency += runLatency;
        });

        // 3. Finalize Site Stats
        const processedSites = Object.values(siteMap).map((site) => {
            const avgLatency = Math.round(site.total_latency / site.runs.length);
            const successRate = Math.round((site.success_count / site.runs.length) * 100);

            // Reverse runs for chart (oldest to newest)
            const chartData = [...site.runs].reverse();

            // Trend (Compare last run vs avg)
            const lastRun = chartData.length > 0 ? chartData[chartData.length - 1] : { latency: 0 };
            const trend = lastRun.latency < avgLatency ? 'improving' : 'degrading';

            return {
                ...site,
                avgLatency,
                successRate,
                chartData,
                trend
            };
        });

        setSites(processedSites);
        setStats({
            total_runs: validRunsCount,
            avg_global_latency: validRunsCount > 0 ? Math.round(totalLatency / validRunsCount) : 0,
            global_success_rate: validRunsCount > 0 ? Math.round((successfulRuns / validRunsCount) * 100) : 0
        });
        setIsLoading(false);
    };

    return (
        <div className="p-8 animate-fade-in">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="mb-12 flex items-center justify-between">
                    <div>
                        <h1 className="text-4xl font-bold text-[var(--text-primary)] mb-3">
                            Rendimiento Web
                        </h1>
                        <p className="text-[var(--text-secondary)] text-lg">
                            MÉTRICAS DE LATENCIA Y UPTIME EN TIEMPO REAL
                        </p>
                    </div>
                    <button
                        onClick={fetchPerformanceData}
                        className="p-3 hover:bg-[var(--bg-hover)] rounded-xl text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all border border-transparent hover:border-[var(--border-color)]"
                        title="Actualizar datos"
                    >
                        <RefreshCw size={20} className={isLoading ? 'animate-spin' : ''} />
                    </button>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                    <Card className="p-6 flex items-center justify-between bg-gradient-to-br from-[var(--bg-secondary)] to-[var(--bg-base)] border border-[var(--border-color)]">
                        <div>
                            <p className="text-xs uppercase font-bold text-[var(--text-muted)] mb-2">Websites Monitoreados</p>
                            {isLoading ? <Skeleton className="h-9 w-16" /> : <h2 className="text-3xl font-bold font-mono">{sites.length}</h2>}
                        </div>
                        <div className="p-3 rounded-xl bg-blue-500/10 text-blue-500">
                            <Globe size={28} />
                        </div>
                    </Card>
                    <Card className="p-6 flex items-center justify-between bg-gradient-to-br from-[var(--bg-secondary)] to-[var(--bg-base)] border border-[var(--border-color)]">
                        <div>
                            <p className="text-xs uppercase font-bold text-[var(--text-muted)] mb-2">Latencia Global (Promedio)</p>
                            {isLoading ? <Skeleton className="h-9 w-24" /> : (
                                <h2 className="text-3xl font-bold font-mono">{stats.avg_global_latency}<span className="text-sm text-[var(--text-muted)] ml-1">ms</span></h2>
                            )}
                        </div>
                        <div className="p-3 rounded-xl bg-amber-500/10 text-amber-500">
                            <Zap size={28} />
                        </div>
                    </Card>
                    <Card className="p-6 flex items-center justify-between bg-gradient-to-br from-[var(--bg-secondary)] to-[var(--bg-base)] border border-[var(--border-color)]">
                        <div>
                            <p className="text-xs uppercase font-bold text-[var(--text-muted)] mb-2">Muestras Analizadas</p>
                            {isLoading ? <Skeleton className="h-9 w-20" /> : <h2 className="text-3xl font-bold font-mono">{stats.total_runs}</h2>}
                        </div>
                        <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-500">
                            <Activity size={28} />
                        </div>
                    </Card>
                </div>

                {/* Site Grid Controls */}
                <div className="mb-6 flex items-center justify-between">
                    <h3 className="text-lg font-bold text-[var(--text-primary)]">Sitios Activos</h3>
                    <div className="flex bg-[var(--bg-secondary)] p-1 rounded-lg border border-[var(--border-color)]">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`p-2 rounded-md transition-all ${viewMode === 'grid' ? 'bg-[var(--bg-base)] shadow-sm text-[var(--text-primary)]' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
                        >
                            <LayoutGrid size={16} />
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-[var(--bg-base)] shadow-sm text-[var(--text-primary)]' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
                        >
                            <List size={16} />
                        </button>
                    </div>
                </div>

                {isLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[1, 2, 3, 4, 5, 6].map(i => (
                            <div key={i} className="h-64 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] p-6 animate-pulse">
                                <div className="flex justify-between mb-6">
                                    <div className="flex gap-4">
                                        <Skeleton className="w-12 h-12 rounded-xl" />
                                        <div>
                                            <Skeleton className="h-4 w-24 mb-2" />
                                            <Skeleton className="h-3 w-32" />
                                        </div>
                                    </div>
                                    <Skeleton className="h-6 w-20 rounded-full" />
                                </div>
                                <Skeleton className="h-32 w-full rounded-lg" />
                            </div>
                        ))}
                    </div>
                ) : sites.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-[var(--border-color)] rounded-2xl bg-[var(--bg-secondary)]/30">
                        <Activity size={48} className="text-[var(--text-muted)] mb-4 opacity-50" />
                        <h3 className="text-lg font-semibold text-[var(--text-secondary)]">No hay datos de rendimiento</h3>
                        <p className="text-[var(--text-muted)] text-sm mt-1">
                            Ejecuta tests que se completen o fallen para ver métricas aquí.
                        </p>
                    </div>
                ) : (
                    <div className={`grid gap-6 ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}`}>
                        {sites.map((site) => (
                            <Card key={site.hostname} className="overflow-hidden group hover:border-[var(--accent-primary)]/50 transition-all duration-300">
                                <div className="p-6">
                                    <div className="flex items-start justify-between mb-6">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-xl bg-[var(--bg-base)] flex items-center justify-center border border-[var(--border-color)] shadow-sm group-hover:shadow-md transition-shadow">
                                                <img
                                                    src={`https://www.google.com/s2/favicons?domain=${site.hostname}&sz=64`}
                                                    alt="favicon"
                                                    className="w-6 h-6 opacity-80 group-hover:opacity-100 transition-opacity"
                                                    onError={(e) => e.target.style.display = 'none'}
                                                />
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-base text-[var(--text-primary)] mb-0.5">{site.hostname}</h3>
                                                <a href={site.url} target="_blank" className="text-xs text-[var(--text-muted)] hover:text-[var(--accent-primary)] transition-colors truncate block max-w-[180px]">
                                                    {site.url}
                                                </a>
                                            </div>
                                        </div>
                                        <div className={`px-3 py-1.5 rounded-full text-xs font-bold border ${site.trend === 'improving' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}>
                                            {site.trend === 'improving' ? (
                                                <span className="flex items-center gap-1.5"><ArrowDownRight size={12} /> {site.avgLatency}ms</span>
                                            ) : (
                                                <span className="flex items-center gap-1.5"><ArrowUpRight size={12} /> {site.avgLatency}ms</span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Chart */}
                                    <div className="h-40 -mx-3 mb-6">
                                        <PerformanceChart data={site.chartData} height={160} />
                                    </div>

                                    {/* Stats Footer */}
                                    <div className="grid grid-cols-3 gap-4 pt-4 border-t border-[var(--border-color)]">
                                        <div className="text-center">
                                            <div className="text-[10px] text-[var(--text-muted)] uppercase font-bold mb-1">Muestras</div>
                                            <div className="text-sm font-mono text-[var(--text-primary)]">{site.runs.length}</div>
                                        </div>
                                        <div className="text-center border-l border-[var(--border-color)]">
                                            <div className="text-[10px] text-[var(--text-muted)] uppercase font-bold mb-1">Uptime</div>
                                            <div className="text-sm font-mono text-emerald-500">{site.successRate}%</div>
                                        </div>
                                        <div className="text-center border-l border-[var(--border-color)]">
                                            <div className="text-[10px] text-[var(--text-muted)] uppercase font-bold mb-1">Estado</div>
                                            <div className="text-sm font-bold text-emerald-500 flex justify-center mt-0.5">
                                                <CheckCircle2 size={16} />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

