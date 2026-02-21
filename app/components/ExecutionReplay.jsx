import React, { useState, useEffect } from 'react';
import { Play, Pause, ChevronLeft, ChevronRight, Clock, Monitor } from 'lucide-react';

const ExecutionReplay = ({
    steps = [],
    activeIndex = 0,
    onIndexChange,
    isPlaying = false,
    onTogglePlay
}) => {
    const [localIndex, setLocalIndex] = useState(activeIndex);

    // Sync with parent
    useEffect(() => {
        setLocalIndex(activeIndex);
    }, [activeIndex]);

    // Auto-play functionality
    useEffect(() => {
        if (!isPlaying || localIndex >= steps.length - 1) return;

        const timer = setTimeout(() => {
            const nextIndex = Math.min(localIndex + 1, steps.length - 1);
            setLocalIndex(nextIndex);
            onIndexChange(nextIndex);
        }, 2000); // 2 seconds per step

        return () => clearTimeout(timer);
    }, [isPlaying, localIndex, steps.length, onIndexChange]);

    const activeStep = steps[localIndex] || {};
    const screenshotUrl = activeStep.screenshot_end_url || activeStep.screenshot_url || activeStep.screenshot_start_url;

    const handlePrevious = () => {
        const newIndex = Math.max(0, localIndex - 1);
        setLocalIndex(newIndex);
        onIndexChange(newIndex);
        if (isPlaying) onTogglePlay();
    };

    const handleNext = () => {
        const newIndex = Math.min(steps.length - 1, localIndex + 1);
        setLocalIndex(newIndex);
        onIndexChange(newIndex);
        if (isPlaying) onTogglePlay();
    };

    const handleTogglePlay = () => {
        if (localIndex >= steps.length - 1) {
            setLocalIndex(0);
            onIndexChange(0);
        }
        onTogglePlay();
    };

    if (!steps || steps.length === 0) {
        return (
            <div className="h-full w-full flex flex-col items-center justify-center bg-[var(--bg-secondary)]/50 rounded-2xl border border-[var(--border-color)] backdrop-blur-md relative overflow-hidden group p-8">
                <div className="absolute inset-0 bg-gradient-to-br from-[var(--accent-primary)]/5 via-transparent to-transparent opacity-50" />
                <div className="relative text-center text-[var(--text-muted)] flex flex-col items-center gap-8 animate-in fade-in zoom-in duration-700">
                    <div className="p-10 rounded-full bg-[var(--bg-base)] border border-[var(--border-color)] shadow-2xl group-hover:scale-105 transition-transform duration-500 relative">
                        <Monitor size={56} strokeWidth={1} className="text-[var(--accent-primary)] opacity-40 translate-y-0" />
                        <div className="absolute inset-0 rounded-full border border-[var(--accent-primary)]/10 animate-ping [animation-duration:3s]" />
                    </div>
                    <div className="space-y-3">
                        <p className="text-[11px] font-bold tracking-[0.3em] uppercase opacity-60 text-[var(--accent-primary)]">Control de Misión</p>
                        <p className="text-xs font-medium tracking-tight opacity-40 max-w-[200px] leading-relaxed mx-auto">Esperando el primer reporte táctico del agente...</p>
                    </div>
                    <div className="flex gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent-primary)]/30 animate-bounce [animation-delay:-0.3s]" />
                        <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent-primary)]/30 animate-bounce [animation-delay:-0.15s]" />
                        <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent-primary)]/30 animate-bounce" />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col relative bg-[var(--bg-secondary)]/50 h-full w-full rounded-2xl overflow-hidden border border-[var(--border-color)] backdrop-blur-md">
            {/* Toolbar */}
            <div className="h-14 border-b border-[var(--border-color)] flex items-center justify-between px-4 bg-[var(--bg-base)]/40 backdrop-blur-xl absolute top-0 left-0 w-full z-10 transition-all">
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleTogglePlay}
                        className="p-2 rounded-xl bg-[var(--bg-base)] hover:bg-[var(--bg-hover)] text-[var(--accent-primary)] border border-[var(--border-color)] transition-all shadow-sm group"
                        title={isPlaying ? "Pausar" : "Reproducir"}
                    >
                        {isPlaying ? (
                            <Pause size={18} fill="currentColor" className="group-hover:scale-90 transition-transform" />
                        ) : (
                            <Play size={18} fill="currentColor" className="ml-0.5 group-hover:scale-95 transition-transform" />
                        )}
                    </button>

                    <div className="h-4 w-[1px] bg-[var(--border-color)] mx-2" />

                    <button
                        onClick={handlePrevious}
                        className="p-1.5 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors disabled:opacity-20"
                        disabled={localIndex === 0}
                    >
                        <ChevronLeft size={20} />
                    </button>
                    <span className="text-xs font-mono text-[var(--text-secondary)] w-20 text-center select-none font-bold">
                        {localIndex + 1} <span className="opacity-30 mx-1">/</span> {steps.length}
                    </span>
                    <button
                        onClick={handleNext}
                        className="p-1.5 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors disabled:opacity-20"
                        disabled={localIndex >= steps.length - 1}
                    >
                        <ChevronRight size={20} />
                    </button>
                </div>

                <div className="flex items-center gap-2 bg-[var(--bg-base)]/80 px-3 py-1.5 rounded-xl border border-[var(--border-color)] shadow-sm">
                    <Clock size={12} className="text-[var(--accent-primary)] opacity-60" />
                    <span className="text-[10px] text-[var(--text-secondary)] font-mono font-bold">
                        {activeStep.created_at ? new Date(activeStep.created_at).toLocaleTimeString() : '--:--:--'}
                    </span>
                </div>
            </div>

            {/* Screenshot Viewport */}
            <div className="flex-1 relative flex items-center justify-center bg-[var(--bg-base)]/20 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-[var(--bg-base)]/80 to-transparent h-24 z-[1]" />

                {screenshotUrl ? (
                    <div className="relative w-full h-full flex items-center justify-center p-8 pt-16 pb-12">
                        {/* Shadow casting background */}
                        <div className="absolute inset-0 flex items-center justify-center opacity-30 blur-3xl saturate-200 pointer-events-none">
                            <img src={screenshotUrl} className="w-1/2 h-1/2 object-cover" />
                        </div>

                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={screenshotUrl}
                            alt={`Paso ${localIndex + 1}`}
                            className="relative z-[2] w-full h-full object-contain drop-shadow-[0_25px_50px_rgba(0,0,0,0.5)] rounded-lg animate-in fade-in zoom-in duration-500"
                            key={screenshotUrl}
                        />

                        {/* Step Description Overlay (Simplified, now descriptive names are enough) */}
                        <div className="absolute bottom-4 left-4 right-4 z-[3] bg-[var(--bg-base)]/80 backdrop-blur-md border border-[var(--border-color)] p-4 rounded-2xl shadow-2xl flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className={`w-2 h-2 rounded-full animate-pulse ${activeStep.status === 'success' ? 'bg-emerald-500' : activeStep.status === 'failed' ? 'bg-red-500' : 'bg-amber-500'}`} />
                                <p className="text-sm font-bold text-[var(--text-primary)] tracking-tight">
                                    {activeStep.title || activeStep.description || 'Paso sin título'}
                                </p>
                            </div>
                            <span className="text-[10px] font-mono text-[var(--text-muted)] font-bold uppercase tracking-widest">
                                Step info
                            </span>
                        </div>
                    </div>
                ) : (
                    <div className="text-center text-[var(--text-muted)] flex flex-col items-center gap-4">
                        <div className="p-6 rounded-2xl bg-[var(--bg-base)] border border-[var(--border-color)]">
                            <Monitor size={48} strokeWidth={1} className="opacity-20 translate-y-1" />
                        </div>
                        <p className="text-[10px] font-bold uppercase tracking-widest opacity-40">Evidencia no disponible</p>
                    </div>
                )}
            </div>

            {/* Progress Dots */}
            <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-1.5 px-4 z-10">
                {steps.map((_, index) => (
                    <button
                        key={index}
                        onClick={() => {
                            setLocalIndex(index);
                            onIndexChange(index);
                            if (isPlaying) onTogglePlay();
                        }}
                        className={`h-1.5 rounded-full transition-all ${index === localIndex
                            ? 'w-8 bg-blue-500'
                            : 'w-1.5 bg-gray-600 hover:bg-gray-500'
                            }`}
                        aria-label={`Ir al paso ${index + 1}`}
                    />
                ))}
            </div>
        </div>
    );
};

export default ExecutionReplay;
