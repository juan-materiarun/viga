'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, CheckCircle, XCircle, Play, AlertTriangle } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import Image from 'next/image';

export default function JourneyStoryboard({ journeyId, onClose }) {
    const [steps, setSteps] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentStepIndex, setCurrentStepIndex] = useState(0);

    useEffect(() => {
        if (journeyId) fetchJourneyDetails();
    }, [journeyId]);

    const fetchJourneyDetails = async () => {
        setLoading(true);
        try {
            // 1. Fetch Definition (Plan)
            const { data: planData } = await supabase
                .from('test_case_steps')
                .select('*')
                .eq('journey_id', journeyId)
                .order('step_order', { ascending: true });

            // 2. Fetch Execution (Evidence)
            const { data: execData } = await supabase
                .from('test_steps')
                .select('*')
                .eq('journey_id', journeyId);

            // 3. Merge
            const merged = (planData || []).map(plan => {
                const exec = execData?.find(e => e.step_number === plan.step_order);
                return {
                    ...plan,
                    status: exec?.status || 'pending',
                    screenshot_url: exec?.screenshot_url,
                    actual_result: exec?.result,
                    error_message: exec?.error || exec?.expected_result // In VIGA worker, expected_result field is sometimes used for error msg if failed
                };
            });

            setSteps(merged);
        } catch (e) {
            console.error('Error fetching journey:', e);
        } finally {
            setLoading(false);
        }
    };

    const nextStep = () => {
        if (currentStepIndex < steps.length - 1) setCurrentStepIndex(prev => prev + 1);
    };

    const prevStep = () => {
        if (currentStepIndex > 0) setCurrentStepIndex(prev => prev - 1);
    };

    if (loading) return null;

    const currentStep = steps[currentStepIndex];

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
            {/* Main Container */}
            <div className="w-full max-w-6xl h-[85vh] bg-[var(--card-bg)] border border-[var(--border-color)] rounded-2xl flex overflow-hidden shadow-2xl relative">

                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 z-50 p-2 text-white/50 hover:text-white bg-black/50 hover:bg-black/80 rounded-full transition-all"
                >
                    <X size={24} />
                </button>

                {/* Left: Visual Evidence (Screenshot) */}
                <div className="w-2/3 bg-black/90 relative flex items-center justify-center border-r border-[var(--border-color)]">
                    {currentStep?.screenshot_url ? (
                        <div className="relative w-full h-full">
                            <Image
                                src={currentStep.screenshot_url}
                                alt={`Step ${currentStep.step_order}`}
                                fill
                                className="object-contain"
                            />
                        </div>
                    ) : (
                        <div className="text-center text-white/30">
                            <div className="mb-4 flex justify-center"><AlertTriangle size={48} /></div>
                            <p>No Visual Evidence</p>
                        </div>
                    )}

                    {/* Floating Controls Overlay */}
                    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-6 bg-black/60 backdrop-blur-md px-6 py-3 rounded-full border border-white/10">
                        <button
                            onClick={prevStep}
                            disabled={currentStepIndex === 0}
                            className="p-2 text-white/70 hover:text-[var(--accent-primary)] disabled:opacity-30 transition-colors"
                        >
                            <ChevronLeft size={32} />
                        </button>
                        <span className="text-white font-mono font-bold text-lg">
                            STEP {currentStepIndex + 1} / {steps.length}
                        </span>
                        <button
                            onClick={nextStep}
                            disabled={currentStepIndex === steps.length - 1}
                            className="p-2 text-white/70 hover:text-[var(--accent-primary)] disabled:opacity-30 transition-colors"
                        >
                            <ChevronRight size={32} />
                        </button>
                    </div>
                </div>

                {/* Right: Narrative & Data */}
                <div className="w-1/3 flex flex-col bg-[var(--bg-secondary)]">
                    {/* Header */}
                    <div className="p-6 border-b border-[var(--border-color)]">
                        <div className="flex items-center gap-3 mb-2">
                            {currentStep.status === 'success' && <CheckCircle className="text-green-500" size={24} />}
                            {currentStep.status === 'failed' && <XCircle className="text-red-500" size={24} />}
                            {currentStep.status === 'pending' && <div className="w-6 h-6 rounded-full border-2 border-dashed border-gray-500 animate-spin" />}
                            <span className="text-sm font-bold uppercase tracking-wider text-[var(--text-muted)]">
                                Action Type: {currentStep.action_type}
                            </span>
                        </div>
                        <h2 className="text-xl font-bold text-[var(--text-primary)] leading-tight">
                            {currentStep.intent}
                        </h2>
                    </div>

                    {/* Details Scroll */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-6">

                        {/* Payload */}
                        {currentStep.payload && (
                            <div className="bg-[var(--bg-primary)] p-4 rounded-xl border border-[var(--border-color)]">
                                <label className="text-xs font-bold text-[var(--text-muted)] uppercase mb-2 block">Payload / Input</label>
                                <code className="text-sm text-[var(--accent-primary)] font-mono break-all">
                                    {currentStep.payload}
                                </code>
                            </div>
                        )}

                        {/* Expected */}
                        <div>
                            <label className="text-xs font-bold text-[var(--text-muted)] uppercase mb-2 block">Expected Outcome</label>
                            <p className="text-sm text-[var(--text-secondary)]">
                                {currentStep.expected_observation}
                            </p>
                        </div>

                        {/* Actual / Error */}
                        {currentStep.status === 'failed' && (
                            <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl">
                                <label className="text-xs font-bold text-red-500 uppercase mb-2 block">Failure Reason</label>
                                <p className="text-sm text-red-400 font-mono">
                                    {currentStep.error_message || 'Unknown execution error'}
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Timeline Mini Map */}
                    <div className="p-6 border-t border-[var(--border-color)] bg-[var(--bg-primary)]">
                        <div className="flex gap-1 overflow-x-auto pb-2 noscroll">
                            {steps.map((s, i) => (
                                <button
                                    key={i}
                                    onClick={() => setCurrentStepIndex(i)}
                                    className={`h-2 flex-1 rounded-full min-w-[20px] transition-all ${i === currentStepIndex
                                        ? 'bg-[var(--accent-primary)] scale-y-150'
                                        : s.status === 'success'
                                            ? 'bg-green-500/30 hover:bg-green-500/50'
                                            : s.status === 'failed' ? 'bg-red-500/30' : 'bg-[var(--border-color)]'
                                        }`}
                                    title={s.intent}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
