'use client';
import React, { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Check, X, Circle, GitBranch, Terminal } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

export default function ExecutionGraph({ steps, selectedStep, onSelectStep }) {
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const containerRef = useRef(null);

    // Auto-scroll to bottom of graph
    useEffect(() => {
        if (containerRef.current) {
            containerRef.current.scrollTop = containerRef.current.scrollHeight;
        }
    }, [steps.length]);

    return (
        <div
            ref={containerRef}
            className={`relative w-[400px] h-full overflow-y-auto overflow-x-hidden select-none custom-scrollbar border-r ${isDark ? 'bg-[#050505] border-white/10' : 'bg-slate-50 border-slate-200'
                }`}
        >
            {/* Background Grid Pattern (Subtle) */}
            <div className="absolute inset-0 pointer-events-none opacity-5"
                style={{ backgroundImage: `radial-gradient(${isDark ? '#fff' : '#000'} 1px, transparent 1px)`, backgroundSize: '20px 20px' }}
            />

            <div className="relative min-h-full py-10 px-6">
                {/* Main Vertical Timeline Line */}
                <div className={`absolute left-[39px] top-0 bottom-0 w-0.5 ${isDark ? 'bg-white/10' : 'bg-slate-300'}`} />

                {/* Steps Rendering */}
                <div className="relative space-y-8">
                    {steps.map((step, idx) => {
                        const isSelected = selectedStep?.id === step.id;
                        const isSuccess = step.status === 'success';
                        const isFailed = step.status === 'failed';
                        const isRunning = step.status === 'running';

                        // Detect if this step implies a branch/context switch (heuristic based on content)
                        const isBranchSwitch = step.title?.toLowerCase().includes('branch') || step.expected_result?.toLowerCase().includes('branch');

                        return (
                            <motion.div
                                key={step.id}
                                initial={{ opacity: 0, x: -20, scale: 0.9 }}
                                animate={{ opacity: 1, x: 0, scale: 1 }}
                                onClick={() => onSelectStep(step)}
                                className={`relative pl-12 group cursor-pointer ${isBranchSwitch ? 'ml-6' : ''}`}
                            >
                                {/* Connection Curve (SVG) for Branching visual effect */}
                                {isBranchSwitch && (
                                    <svg className="absolute left-[-26px] top-4 w-8 h-8 pointer-events-none stroke-current opacity-30 text-orange-500" fill="none">
                                        <path d="M 0 0 C 15 0, 15 15, 30 15" strokeWidth="2" />
                                    </svg>
                                )}

                                {/* Node Circle */}
                                <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full border-2 flex items-center justify-center z-10 transition-all duration-300 ${isSelected
                                        ? 'border-blue-500 bg-blue-500 text-white scale-110 shadow-[0_0_15px_rgba(59,130,246,0.5)]'
                                        : isSuccess
                                            ? `border-emerald-500 ${isDark ? 'bg-black' : 'bg-white'} text-emerald-500 group-hover:bg-emerald-500/10`
                                            : isFailed
                                                ? `border-red-500 ${isDark ? 'bg-black' : 'bg-white'} text-red-500`
                                                : `${isDark ? 'border-slate-700 bg-slate-900' : 'border-slate-300 bg-white'} text-slate-500`
                                    }`}>
                                    {isSuccess ? <Check size={14} strokeWidth={3} /> :
                                        isFailed ? <X size={14} strokeWidth={3} /> :
                                            isBranchSwitch ? <GitBranch size={14} /> :
                                                <Circle size={10} fill="currentColor" opacity={0.5} />}
                                </div>

                                {/* Node Content Card */}
                                <div className={`
                   relative p-4 rounded-xl border transition-all duration-200
                   ${isSelected
                                        ? 'bg-blue-500/5 border-blue-500/30 translate-x-1'
                                        : isDark
                                            ? 'bg-[#0A0A0A] border-white/5 hover:border-white/10 hover:bg-white/5'
                                            : 'bg-white border-slate-200 hover:border-blue-200 hover:shadow-md'
                                    }
                `}>
                                    <div className="flex items-center justify-between mb-1">
                                        <span className={`text-[9px] font-black uppercase tracking-widest ${isSelected ? 'text-blue-500' : isFailed ? 'text-red-500' : 'text-slate-500'}`}>
                                            Step {idx + 1}
                                        </span>
                                        <span className="text-[9px] font-mono opacity-40">{new Date(step.created_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                                    </div>

                                    <h4 className={`text-[11px] font-bold uppercase leading-tight line-clamp-2 ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                                        {step.title}
                                    </h4>

                                    {isBranchSwitch && (
                                        <div className="mt-2 flex items-center gap-1.5 text-orange-500">
                                            <GitBranch size={10} />
                                            <span className="text-[8px] font-black uppercase tracking-widest">Branch Switch Detected</span>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        );
                    })}

                    {/* Running Indicator at bottom */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="pl-12 relative"
                    >
                        <div className={`absolute left-[3px] top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-white/20 flex items-center justify-center z-10 ${isDark ? 'bg-black' : 'bg-white'}`}>
                            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
                        </div>
                        <div className={`text-[9px] font-black uppercase tracking-[0.2em] animate-pulse ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>
                            Processing...
                        </div>
                    </motion.div>

                </div>
            </div>
        </div>
    );
}
