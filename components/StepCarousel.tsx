import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Play, Pause } from 'lucide-react';

interface TestStep {
    id: string;
    description: string;
    screenshot_url?: string;
    screenshot_start_url?: string;
    screenshot_end_url?: string;
    status: 'success' | 'failed' | 'pending';
    created_at: string;
}

interface StepCarouselProps {
    steps: TestStep[];
    className?: string;
}

export default function StepCarousel({ steps, className = '' }: StepCarouselProps) {
    const [activeIndex, setActiveIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);

    // Auto-play functionality
    useEffect(() => {
        if (!isPlaying || activeIndex >= steps.length - 1) return;

        const timer = setTimeout(() => {
            setActiveIndex(prev => Math.min(prev + 1, steps.length - 1));
        }, 2000); // 2 seconds per step

        return () => clearTimeout(timer);
    }, [isPlaying, activeIndex, steps.length]);

    const currentStep = steps[activeIndex];
    const screenshotUrl = currentStep?.screenshot_end_url || currentStep?.screenshot_url;

    const handlePrevious = () => {
        setActiveIndex(prev => Math.max(0, prev - 1));
        setIsPlaying(false);
    };

    const handleNext = () => {
        setActiveIndex(prev => Math.min(steps.length - 1, prev + 1));
        setIsPlaying(false);
    };

    const togglePlayPause = () => {
        if (activeIndex >= steps.length - 1) {
            setActiveIndex(0);
        }
        setIsPlaying(!isPlaying);
    };

    if (!steps || steps.length === 0) {
        return (
            <div className={`flex items-center justify-center bg-gray-900 text-gray-400 ${className}`}>
                <p>No hay pasos para mostrar</p>
            </div>
        );
    }

    return (
        <div className={`relative w-full h-full bg-black ${className}`}>
            {/* Screenshot Display */}
            <div className="relative w-full h-full">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeIndex}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 1.05 }}
                        transition={{ duration: 0.3 }}
                        className="absolute inset-0 flex items-center justify-center"
                    >
                        {screenshotUrl ? (
                            <img
                                src={screenshotUrl}
                                alt={currentStep.description}
                                className="max-w-full max-h-full object-contain"
                            />
                        ) : (
                            <div className="text-gray-500">
                                <p>Screenshot no disponible</p>
                            </div>
                        )}
                    </motion.div>
                </AnimatePresence>

                {/* Step Description Overlay */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-6">
                    <div className="flex items-center gap-3 mb-2">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${currentStep.status === 'success' ? 'bg-green-500/20 text-green-400' :
                            currentStep.status === 'failed' ? 'bg-red-500/20 text-red-400' :
                                'bg-yellow-500/20 text-yellow-400'
                            }`}>
                            {currentStep.status === 'success' ? '✓ Exitoso' :
                                currentStep.status === 'failed' ? '✗ Fallido' :
                                    '○ Pendiente'}
                        </span>
                        <span className="text-gray-400 text-sm">
                            Paso {activeIndex + 1} de {steps.length}
                        </span>
                    </div>
                    <p className="text-white text-base font-medium">
                        {currentStep.description}
                    </p>
                </div>
            </div>

            {/* Navigation Controls */}
            <div className="absolute top-1/2 left-4 right-4 -translate-y-1/2 flex justify-between pointer-events-none">
                <button
                    onClick={handlePrevious}
                    disabled={activeIndex === 0}
                    className="pointer-events-auto bg-black/60 hover:bg-black/80 text-white p-3 rounded-full disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    aria-label="Paso anterior"
                >
                    <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                    onClick={handleNext}
                    disabled={activeIndex >= steps.length - 1}
                    className="pointer-events-auto bg-black/60 hover:bg-black/80 text-white p-3 rounded-full disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    aria-label="Siguiente paso"
                >
                    <ChevronRight className="w-6 h-6" />
                </button>
            </div>

            {/* Bottom Controls */}
            <div className="absolute bottom-24 left-0 right-0 flex justify-center gap-2 px-4">
                {/* Play/Pause Button */}
                <button
                    onClick={togglePlayPause}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                    aria-label={isPlaying ? 'Pausar' : 'Reproducir'}
                >
                    {isPlaying ? (
                        <>
                            <Pause className="w-4 h-4" />
                            <span className="text-sm font-medium">Pausar</span>
                        </>
                    ) : (
                        <>
                            <Play className="w-4 h-4" />
                            <span className="text-sm font-medium">Reproducir</span>
                        </>
                    )}
                </button>
            </div>

            {/* Progress Dots */}
            <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-1.5 px-4">
                {steps.map((_, index) => (
                    <button
                        key={index}
                        onClick={() => {
                            setActiveIndex(index);
                            setIsPlaying(false);
                        }}
                        className={`h-1.5 rounded-full transition-all ${index === activeIndex
                            ? 'w-8 bg-blue-500'
                            : 'w-1.5 bg-gray-600 hover:bg-gray-500'
                            }`}
                        aria-label={`Ir al paso ${index + 1}`}
                    />
                ))}
            </div>
        </div>
    );
}
