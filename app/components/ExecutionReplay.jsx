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
            <div className="flex-1 flex items-center justify-center bg-[#0a0a0a] rounded-2xl">
                <div className="text-center text-white/20 flex flex-col items-center gap-4 animate-pulse">
                    <Monitor size={64} strokeWidth={1} />
                    <p className="font-light tracking-wide">No hay pasos para mostrar</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col relative bg-[var(--bg-primary)] h-full w-full rounded-2xl overflow-hidden">
            {/* Toolbar */}
            <div className="h-14 border-b border-[var(--border-color)] flex items-center justify-between px-4 bg-[var(--bg-secondary)]/30 backdrop-blur-sm absolute top-0 left-0 w-full z-10 transition-all hover:bg-[var(--bg-secondary)]/80">
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleTogglePlay}
                        className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md border border-white/10 transition-colors shadow-lg group"
                        title={isPlaying ? "Pausar" : "Reproducir"}
                    >
                        {isPlaying ? (
                            <Pause size={20} fill="currentColor" className="group-hover:scale-95 transition-transform" />
                        ) : (
                            <Play size={20} fill="currentColor" className="ml-0.5 group-hover:scale-95 transition-transform" />
                        )}
                    </button>

                    <div className="h-4 w-[1px] bg-white/20 mx-2" />

                    <button
                        onClick={handlePrevious}
                        className="p-1 rounded hover:bg-white/10 text-white/70 hover:text-white transition-colors disabled:opacity-30"
                        disabled={localIndex === 0}
                    >
                        <ChevronLeft size={20} />
                    </button>
                    <span className="text-sm font-mono text-white/90 w-16 text-center drop-shadow-md select-none">
                        {localIndex + 1} / {steps.length}
                    </span>
                    <button
                        onClick={handleNext}
                        className="p-1 rounded hover:bg-white/10 text-white/70 hover:text-white transition-colors disabled:opacity-30"
                        disabled={localIndex >= steps.length - 1}
                    >
                        <ChevronRight size={20} />
                    </button>
                </div>

                <div className="flex items-center gap-2 bg-black/40 px-3 py-1 rounded-full border border-white/10 backdrop-blur-md">
                    <Clock size={12} className="text-white/60" />
                    <span className="text-[10px] text-white/80 font-mono">
                        {activeStep.created_at ? new Date(activeStep.created_at).toLocaleTimeString() : '--:--:--'}
                    </span>
                </div>
            </div>

            {/* Screenshot Viewport */}
            <div className="flex-1 relative flex items-center justify-center bg-[#0a0a0a] overflow-hidden">
                {screenshotUrl ? (
                    <div className="relative w-full h-full flex items-center justify-center p-8 pt-16 pb-20">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={screenshotUrl}
                            alt={`Paso ${localIndex + 1}`}
                            className="w-full h-full object-contain drop-shadow-2xl animate-in fade-in zoom-in duration-300"
                            key={screenshotUrl}
                        />

                        {/* Step Description Overlay */}
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-6">
                            <div className="flex items-center gap-3 mb-2">
                                <span className={`px-2 py-1 rounded text-xs font-medium ${activeStep.status === 'success' ? 'bg-green-500/20 text-green-400' :
                                        activeStep.status === 'failed' ? 'bg-red-500/20 text-red-400' :
                                            'bg-yellow-500/20 text-yellow-400'
                                    }`}>
                                    {activeStep.status === 'success' ? '✓ Exitoso' :
                                        activeStep.status === 'failed' ? '✗ Fallido' :
                                            '○ Pendiente'}
                                </span>
                                <span className="text-gray-400 text-sm">
                                    Paso {localIndex + 1} de {steps.length}
                                </span>
                            </div>
                            <p className="text-white text-base font-medium">
                                {activeStep.description || activeStep.title || 'Sin descripción'}
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="text-center text-white/20 flex flex-col items-center gap-4 animate-pulse">
                        <Monitor size={64} strokeWidth={1} />
                        <p className="font-light tracking-wide">Screenshot no disponible</p>
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
