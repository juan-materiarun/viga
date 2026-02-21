'use client';

import { useState, useEffect, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter, useSearchParams } from 'next/navigation';
import {
    X, CheckCircle2, XCircle, Clock, Image as ImageIcon, Code, Globe, Hash, Copy,
    Play, Pause, RefreshCw, LayoutTemplate, Terminal, Shield, Cpu, ChevronRight, Activity, Monitor,
    Zap, Database, Settings, ArrowLeft, Download, FileCode
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '../contexts/AuthContext';
import Card from '../components/Card';
import Button from '../components/Button';
import LocatorEditor from '../components/LocatorEditor';
import Loader from '../components/Loader';
// import LiveBrowser from '../components/LiveBrowser'; // REMOVED: No more live streaming
import ExecutionReplay from '../components/ExecutionReplay';

function ExecutionContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user } = useAuth();
    const suiteId = searchParams.get('suite_id');

    const [suite, setSuite] = useState(null);
    const [job, setJob] = useState(null); // NEW: Job data for stats
    const [steps, setSteps] = useState([]);
    const [selectedStep, setSelectedStep] = useState(null);
    // REMOVED: logs state
    const [editingLocator, setEditingLocator] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    // UI State
    const [activeTab, setActiveTab] = useState('timeline'); // timeline | stats (logs removed)
    const [isPlaying, setIsPlaying] = useState(false);
    const [isUserInteracting, setIsUserInteracting] = useState(false);

    // Initial Fetch & Subscriptions
    useEffect(() => {
        if (!suiteId || suiteId === 'undefined' || suiteId === 'null') {
            setIsLoading(false);
            return;
        }

        const fetchData = async () => {
            const [suiteRes, stepsRes, jobRes] = await Promise.all([
                supabase.from('test_suites').select('*').eq('id', suiteId).single(),
                supabase.from('test_steps').select('*').eq('suite_id', suiteId).order('created_at', { ascending: true }),
                // NEW: Fetch Job for AI stats
                supabase.from('jobs').select('*').eq('suite_id', suiteId).limit(1).single()
            ]);

            if (suiteRes.data) setSuite(suiteRes.data);
            if (jobRes.data) setJob(jobRes.data);
            if (stepsRes.data) {
                setSteps(stepsRes.data);
                if (stepsRes.data.length > 0) setSelectedStep(stepsRes.data[0]);
            }
            setIsLoading(false);
        };

        fetchData();

        // Subscriptions
        const channels = [
            supabase.channel(`steps-${suiteId}`).on('postgres_changes', { event: '*', schema: 'public', table: 'test_steps', filter: `suite_id=eq.${suiteId}` },
                payload => {
                    console.log('Realtime Step update:', payload);
                    if (payload.eventType === 'INSERT') setSteps(prev => [...prev, payload.new]);
                    if (payload.eventType === 'UPDATE') setSteps(prev => prev.map(s => s.id === payload.new.id ? payload.new : s));
                }
            ).subscribe(),

            supabase.channel(`suite-${suiteId}`).on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'test_suites', filter: `id=eq.${suiteId}` },
                payload => setSuite(payload.new)
            ).subscribe(),

            // NEW: Subscribe to Job updates for real-time stats
            supabase.channel(`job-${suiteId}`).on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'jobs', filter: `suite_id=eq.${suiteId}` },
                payload => setJob(payload.new)
            ).subscribe()
        ];

        // POLLING FALLBACK (Every 5 seconds if running)
        const pollInterval = setInterval(async () => {
            if (suite?.status === 'running') {
                const { data } = await supabase.from('test_steps').select('*').eq('suite_id', suiteId).order('created_at', { ascending: true });
                if (data && data.length > steps.length) {
                    setSteps(data);
                }
            }
        }, 5000);

        return () => {
            channels.forEach(c => supabase.removeChannel(c));
            clearInterval(pollInterval);
        };
    }, [suiteId]);

    // Derived Status
    const isRunning = suite?.status === 'running';

    // Helper: Calculate Latency (Avg time between steps)
    const getAvgLatency = () => {
        if (steps.length < 2) return 0;
        const start = new Date(steps[0].created_at).getTime();
        const end = new Date(steps[steps.length - 1].created_at).getTime();
        const diff = end - start;
        return Math.round(diff / steps.length);
    };

    return (
        <div className="flex flex-col h-screen bg-[var(--bg-base)] text-[var(--text-primary)] font-sans selection:bg-[var(--accent-primary)]/20 overflow-hidden transition-colors duration-300">
            {isLoading && (
                <div className="absolute inset-0 bg-black/50 backdrop-blur-md z-[100] flex items-center justify-center">
                    <Loader size="lg" />
                </div>
            )}

            {(!suiteId || suiteId === 'undefined') && !isLoading && (
                <div className="absolute inset-0 bg-[var(--bg-base)] z-[50] flex flex-col items-center justify-center text-center p-6">
                    <XCircle size={48} className="text-red-500 mb-4" />
                    <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">Error de Ejecución</h2>
                    <p className="text-[var(--text-secondary)]">No se especificó un ID de misión válido.</p>
                    <Button
                        variant="secondary"
                        className="mt-6"
                        onClick={() => router.push('/dashboard')}
                    >
                        Volver al Dashboard
                    </Button>
                </div>
            )}

            {/* SOFT HEADER */}
            <header className="h-16 flex items-center justify-between px-6 bg-[var(--bg-base)] border-b border-[var(--border-color)] z-50">
                <div className="flex items-center gap-6">
                    <button onClick={() => router.back()} className="group p-2 rounded-xl hover:bg-[var(--bg-hover)] transition-all text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                        <ArrowLeft size={20} className="group-hover:-translate-x-0.5 transition-transform" />
                    </button>
                    <div>
                        <h1 className="text-sm font-medium text-[var(--text-primary)] flex items-center gap-2">
                            <div className={`p-1 rounded-md ${isRunning ? 'bg-emerald-500/10 text-emerald-400' : 'bg-[var(--bg-hover)] text-[var(--text-muted)]'}`}>
                                <Shield size={14} />
                            </div>
                            {suite?.test_goal || 'Panel de Misión'}
                        </h1>
                        <span className="text-[10px] text-[var(--text-muted)] mt-0.5 block tracking-wide">
                            ID: {suiteId?.slice(0, 8)} • {suite?.mode?.toLowerCase() === 'chaos' ? 'MODO CAOS' : 'MODO STRIKE'}
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => {
                            // Manual Refresh Trigger
                            supabase.from('test_steps').select('*').eq('suite_id', suiteId).order('created_at', { ascending: true }).then(({ data }) => {
                                if (data) setSteps(data);
                            });
                            supabase.from('test_suites').select('*').eq('id', suiteId).single().then(({ data }) => {
                                if (data) setSuite(data);
                            });
                        }}
                        className="p-2 rounded-xl hover:bg-[var(--bg-hover)] transition-all text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                        title="Refrescar Manualmente"
                    >
                        <RefreshCw size={18} />
                    </button>

                    <div className="hidden md:flex items-center gap-2 px-4 py-1.5 rounded-full bg-[var(--bg-hover)] border border-[var(--border-color)]">
                        <Activity size={12} className="text-emerald-500" />
                        <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--text-secondary)]">
                            {isRunning ? 'Ejecutando' : suite?.status || 'Esperando'}
                        </span>
                    </div>

                    {suite?.generated_code && !isRunning && (
                        <button
                            onClick={() => {
                                const blob = new Blob([suite.generated_code], { type: 'text/javascript' });
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = `viga-test-${suiteId.slice(0, 8)}.spec.js`;
                                a.click();
                            }}
                            className="flex items-center gap-2 px-4 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 border border-emerald-500/20 transition-all font-bold text-[10px] animate-fade-in"
                            title="Descargar Script de Playwright"
                        >
                            <FileCode size={14} />
                            DESCARGAR CÓDIGO
                            <Download size={14} />
                        </button>
                    )}
                </div>
            </header>

            {/* MAIN CONTENT - CONTROL DECK LAYOUT */}
            <div className="flex-1 p-4 grid grid-cols-12 gap-4 h-[calc(100vh-64px)] overflow-hidden">

                {/* LEFT PANEL: TIMELINE & CONTROLS (30%) */}
                <div className="col-span-3 flex flex-col gap-4 h-full overflow-hidden">

                    {(isRunning && isUserInteracting) && (
                        <div className="p-4 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] shadow-sm flex items-center justify-between animate-in fade-in slide-in-from-bottom-2">
                            <button
                                onClick={() => setIsUserInteracting(false)}
                                className="w-full px-3 py-2 rounded-lg bg-[var(--accent-primary)] text-white text-xs font-bold flex items-center justify-center gap-2"
                            >
                                <RefreshCw size={14} className="animate-spin" />
                                RESUMIR TRANSMISIÓN
                            </button>
                        </div>
                    )}

                    <div className="flex-1 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] shadow-sm flex flex-col overflow-hidden">
                        {/* Tabs */}
                        <div className="flex border-b border-[var(--border-color)] px-2 pt-2">
                            <button
                                onClick={() => setActiveTab('timeline')}
                                className={`flex-1 pb-2 text-[10px] font-bold uppercase tracking-wider transition-colors ${activeTab === 'timeline' ? 'text-[var(--text-primary)] border-b-2 border-[var(--accent-primary)]' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
                            >
                                Pasos
                            </button>
                            {/* LOGS TAB REMOVED */}
                            <button
                                onClick={() => setActiveTab('stats')}
                                className={`flex-1 pb-2 text-[10px] font-bold uppercase tracking-wider transition-colors ${activeTab === 'stats' ? 'text-[var(--text-primary)] border-b-2 border-[var(--accent-primary)]' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
                            >
                                Datos
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto scrollbar-thin p-3">
                            {activeTab === 'timeline' && (
                                <div className="space-y-3">
                                    <AnimatePresence initial={false}>
                                        {steps.map((step, idx) => (
                                            <motion.div
                                                key={step.id}
                                                initial={{ opacity: 0, x: -20, scale: 0.95 }}
                                                animate={{ opacity: 1, x: 0, scale: 1 }}
                                                transition={{ duration: 0.3, ease: 'easeOut' }}
                                                onClick={() => setSelectedStep(step)}
                                                className={`p-4 rounded-2xl cursor-pointer transition-all border group relative overflow-hidden backdrop-blur-sm ${selectedStep?.id === step.id ? 'bg-[var(--accent-primary)]/10 border-[var(--accent-primary)]/20 shadow-md ring-1 ring-[var(--accent-primary)]/20' : 'bg-[var(--bg-base)]/40 border-[var(--border-color)] hover:border-[var(--accent-primary)]/30 hover:bg-[var(--bg-hover)]'}`}
                                            >
                                                <div className="flex justify-between items-start mb-2">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-6 h-6 flex items-center justify-center rounded-lg text-[10px] font-bold border transition-colors ${selectedStep?.id === step.id ? 'bg-[var(--accent-primary)] text-white border-transparent' : 'bg-[var(--bg-base)] text-[var(--text-muted)] border-[var(--border-color)]'}`}>
                                                            {idx + 1}
                                                        </div>
                                                        <span className={`text-[11px] font-bold tracking-tight uppercase ${step.status === 'failed' ? 'text-red-400' : 'text-[var(--text-primary)]'}`}>
                                                            {step.title || step.action_type || 'ACCIÓN'}
                                                        </span>
                                                    </div>
                                                    <span className="text-[10px] text-[var(--text-muted)] font-mono opacity-60">{new Date(step.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                                                </div>
                                                {step.description && (
                                                    <p className="text-xs text-[var(--text-secondary)] leading-relaxed pl-9 line-clamp-2 font-medium opacity-80">
                                                        {step.description}
                                                    </p>
                                                )}
                                                {selectedStep?.id === step.id && (
                                                    <motion.div
                                                        layoutId="active-indicator"
                                                        className="absolute left-0 top-0 bottom-0 w-1 bg-[var(--accent-primary)]"
                                                    />
                                                )}
                                            </motion.div>
                                        ))}
                                    </AnimatePresence>
                                    {steps.length === 0 && (
                                        <div className="h-[400px] flex flex-col items-center justify-center text-[var(--text-muted)] group">
                                            <div className="p-10 rounded-full bg-[var(--bg-base)]/50 border border-[var(--border-color)] mb-6 group-hover:scale-110 transition-transform duration-700 relative">
                                                <Activity size={32} className="text-[var(--accent-primary)] animate-pulse" />
                                                <div className="absolute inset-x-0 -bottom-1 h-px bg-gradient-to-r from-transparent via-[var(--accent-primary)]/50 to-transparent" />
                                            </div>
                                            <span className="text-[10px] uppercase font-bold tracking-[0.2em] opacity-40">Misión Iniciada</span>
                                            <span className="text-xs mt-2 opacity-30">Escaneando ecosistema...</span>
                                        </div>
                                    )}
                                </div>
                            )}

                            {activeTab === 'stats' && (
                                <div className="space-y-4 pt-2">
                                    <div className="p-3 rounded-xl bg-[var(--bg-base)] border border-[var(--border-color)]">
                                        <div className="flex items-center gap-2 mb-1">
                                            <Globe size={12} className="text-amber-400" />
                                            <span className="text-[10px] font-bold uppercase text-[var(--text-muted)]">Objetivo & URL</span>
                                        </div>
                                        <div className="text-xs text-[var(--text-primary)] mt-1 break-all">
                                            <div className="font-bold mb-1">{suite?.test_goal || 'Exploración'}</div>
                                            <div className="text-[var(--text-muted)] font-mono text-[10px]">{suite?.base_url}</div>
                                        </div>
                                    </div>

                                    <div className="p-3 rounded-xl bg-[var(--bg-base)] border border-[var(--border-color)]">
                                        <div className="flex items-center gap-2 mb-1">
                                            <Cpu size={12} className="text-purple-400" />
                                            <span className="text-[10px] font-bold uppercase text-[var(--text-muted)]">Consumo IA</span>
                                        </div>
                                        <div className="flex justify-between text-[10px] text-[var(--text-muted)] mt-2">
                                            <span>Llamadas LLM</span>
                                            <span className="text-[var(--text-primary)] font-mono">{job?.progress?.calls || 0}</span>
                                        </div>
                                        <div className="flex justify-between text-[10px] text-[var(--text-muted)] mt-1">
                                            <span>Tokens Estimados</span>
                                            <span className="text-[var(--text-primary)] font-mono">{job?.progress?.tokens || 0}</span>
                                        </div>
                                    </div>

                                    <div className="p-3 rounded-xl bg-[var(--accent-primary)]/5 border border-[var(--accent-primary)]/10">
                                        <div className="flex items-center gap-2 mb-1 text-[var(--accent-primary)]">
                                            <Zap size={12} />
                                            <span className="text-[10px] font-bold uppercase">Rendimiento</span>
                                        </div>
                                        <div className="flex justify-between text-[10px] text-[var(--text-muted)] mt-2">
                                            <span>Latencia Promedio</span>
                                            <span className="text-[var(--text-primary)]">{getAvgLatency()}ms / paso</span>
                                        </div>
                                        <div className="flex justify-between text-[10px] text-[var(--text-muted)] mt-1">
                                            <span>Pasos Totales</span>
                                            <span className="text-[var(--text-primary)]">{steps.length}</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* RIGHT PANEL: CENTER STAGE (60%) */}
                <div className="col-span-6 flex flex-col h-full gap-4">
                    <div className="flex-1 rounded-2xl overflow-hidden shadow-lg relative bg-transparent ring-1 ring-[#000]/5">
                        <ExecutionReplay
                            steps={steps}
                            activeIndex={steps.findIndex(s => s.id === selectedStep?.id)}
                            onIndexChange={(idx) => {
                                setSelectedStep(steps[idx]);
                                if (isRunning) setIsUserInteracting(true);
                            }}
                            isPlaying={isPlaying}
                            onTogglePlay={() => setIsPlaying(!isPlaying)}
                            videoUrl={suite?.video_url}
                        />
                        {!suite?.video_url && !isRunning && steps.length > 0 && (
                            <div className="absolute top-2 right-2 px-2 py-1 bg-black/50 text-white/70 text-[10px] rounded backdrop-blur-md flex items-center gap-1">
                                <ImageIcon size={10} />
                                <span>Screenshot Replay</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* FAR RIGHT: DETAILS (30%) */}
                <div className="col-span-3 flex flex-col gap-4 h-full">
                    <div className="flex-1 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] shadow-sm p-5 overflow-y-auto">
                        <div className="flex items-center gap-2 mb-4 text-[var(--text-secondary)]">
                            <Settings size={14} />
                            <span className="text-xs font-bold uppercase tracking-wider">Detalles del Paso</span>
                        </div>

                        {selectedStep ? (
                            <div className="space-y-6">
                                <div className="p-4 rounded-xl bg-[var(--bg-base)] border border-[var(--border-color)]">
                                    <label className="text-[10px] text-[var(--accent-primary)] block mb-2 uppercase font-bold tracking-widest">🧠 Razonamiento del Agente</label>
                                    <p className="text-sm text-[var(--text-primary)] leading-relaxed font-medium">
                                        {selectedStep.expected_result || selectedStep.description}
                                    </p>
                                </div>

                                {selectedStep.selector && (
                                    <div>
                                        <label className="text-[10px] text-[var(--text-muted)] block mb-1.5 uppercase font-medium">Selector Objetivo</label>
                                        <div className="bg-[var(--bg-base)] p-3 rounded-xl border border-[var(--border-color)] group relative">
                                            <code className="text-xs text-[var(--accent-primary)] font-mono break-all">
                                                {selectedStep.selector}
                                            </code>
                                            <button
                                                onClick={() => setEditingLocator(selectedStep.id)}
                                                className="absolute top-2 right-2 p-1.5 hover:bg-[var(--bg-hover)] rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors opacity-0 group-hover:opacity-100"
                                            >
                                                <Code size={12} />
                                            </button>
                                        </div>
                                        {editingLocator === selectedStep.id && (
                                            <div className="mt-2 shadow-2xl relative z-50">
                                                <LocatorEditor
                                                    initialValue={selectedStep.selector}
                                                    onSave={(val) => {
                                                        supabase.from('test_steps').update({ selector: val }).eq('id', selectedStep.id).then();
                                                        setEditingLocator(null);
                                                    }}
                                                    onCancel={() => setEditingLocator(null)}
                                                />
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div className="p-3 rounded-xl bg-orange-500/5 border border-orange-500/10">
                                    <label className="text-[10px] text-orange-400/80 block mb-1 uppercase font-bold">Observación</label>
                                    <p className="text-xs text-[var(--text-secondary)]">
                                        {selectedStep.description || 'Sin detalles adicionales.'}
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-[var(--text-muted)] animate-in fade-in duration-500">
                                <div className="w-12 h-12 rounded-2xl bg-[var(--bg-base)] border border-[var(--border-color)] flex items-center justify-center mb-4 opacity-20">
                                    <Settings size={24} />
                                </div>
                                <span className="text-[10px] uppercase font-bold tracking-[0.2em] opacity-40">Detalles de Acción</span>
                                <span className="text-[10px] mt-1 opacity-20">Selecciona un elemento para analizar</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function ExecutionRoomPage() {
    return (
        <Suspense fallback={
            <div className="h-screen bg-[var(--bg-base)] flex items-center justify-center">
                <Loader size="lg" />
            </div>
        }>
            <ExecutionContent />
        </Suspense>
    );
}
