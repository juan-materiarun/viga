'use client';
import React, { useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, Circle, GitBranch, Terminal, ArrowDownRight, ChevronRight, ChevronDown } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

const StepNode = ({ step, index, childrenIds, allSteps, depth = 0, onSelect, selectedId, isDark, isLast }) => {
    const isSelected = selectedId === step.id;
    const isBranchSwitch = step.title?.toLowerCase().includes('branch') || step.expected_result?.toLowerCase().includes('branch');
    const isSuccess = step.status === 'success';
    const isFailed = step.status === 'failed';

    // Resolve children
    const children = childrenIds.map(id => allSteps.find(s => s.id === id)).filter(Boolean);
    const hasChildren = children.length > 0;

    return (
        <div className="relative flex flex-col">
            {/* Node Row */}
            <div className="flex items-start group relative">

                {/* Vertical Line from parent (if not root) */}
                {depth > 0 && (
                    <div className={`absolute left-[-20px] top-0 w-[20px] h-[24px] rounded-bl-xl border-b -z-10 ${isDark ? 'border-white/20' : 'border-slate-300'}`}
                        style={{ borderLeftWidth: '2px', borderLeftColor: isDark ? 'rgba(255,255,255,0.1)' : '#cbd5e1' }}
                    />
                )}

                {/* Icon / Marker */}
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    onClick={(e) => { e.stopPropagation(); onSelect(step); }}
                    className={`
               w-8 h-8 rounded-full border-2 flex items-center justify-center shrink-0 z-20 cursor-pointer transition-all
               ${isSelected
                            ? 'border-blue-500 bg-blue-500 text-white shadow-[0_0_15px_rgba(59,130,246,0.6)] scale-110'
                            : isSuccess
                                ? `border-emerald-500 ${isDark ? 'bg-black' : 'bg-white'} text-emerald-500`
                                : isFailed
                                    ? `border-red-500 ${isDark ? 'bg-black' : 'bg-white'} text-red-500`
                                    : `${isDark ? 'border-slate-700 bg-slate-900' : 'border-slate-300 bg-white'} text-slate-500`
                        }
            `}
                >
                    {isSuccess ? <Check size={14} strokeWidth={3} /> :
                        isFailed ? <X size={14} strokeWidth={3} /> :
                            isBranchSwitch ? <GitBranch size={14} /> :
                                <Circle size={10} fill="currentColor" opacity={0.5} />}
                </motion.div>

                {/* Content Card */}
                <motion.div
                    layoutId={`card-${step.id}`}
                    onClick={() => onSelect(step)}
                    className={`
              ml-4 mb-6 flex-1 p-3 rounded-xl border cursor-pointer min-w-[200px] transition-all relative
              ${isSelected ? 'border-blue-500 bg-blue-500/10' : isDark ? 'border-white/10 bg-white/5 hover:bg-white/10' : 'border-slate-200 bg-white hover:bg-slate-50'}
            `}
                >
                    <div className="flex items-center justify-between gap-2">
                        <span className={`text-[9px] font-black uppercase tracking-wider ${isFailed ? 'text-red-500' : 'opacity-50'}`}>Step {step.tempIndex + 1}</span>
                        <span className="text-[8px] font-mono opacity-30">{new Date(step.created_at).toLocaleTimeString().slice(0, 8)}</span>
                    </div>
                    <div className={`text-[11px] font-bold mt-1 leading-tight ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{step.title}</div>
                    {step.selector && <div className="mt-1 text-[9px] font-mono opacity-40 truncate max-w-[180px]">{step.selector}</div>}

                    {isBranchSwitch && (
                        <div className="absolute -right-2 -top-2 bg-orange-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full shadow-lg animate-pulse">
                            BRANCH
                        </div>
                    )}
                </motion.div>
            </div>

            {/* Children Container (Recursive) */}
            {hasChildren && (
                <div className="pl-4 ml-4 border-l-2 relative flex flex-col" style={{ borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}>
                    {children.map((child, i) => (
                        <StepNode
                            key={child.id}
                            step={child}
                            childrenIds={child.childrenIds || []}
                            allSteps={allSteps}
                            depth={depth + 1}
                            index={i}
                            onSelect={onSelect}
                            selectedId={selectedId}
                            isDark={isDark}
                            isLast={i === children.length - 1}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default function ExecutionGraph({ steps, selectedStep, onSelectStep }) {
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const containerRef = useRef(null);

    // Transform flat list to Tree
    const { treeRoots, processedSteps } = useMemo(() => {
        if (!steps.length) return { treeRoots: [], processedSteps: [] };

        // 1. Map ID -> Step & Initialize children
        const stepMap = {};
        steps.forEach((s, idx) => {
            stepMap[s.id] = { ...s, childrenIds: [], tempIndex: idx };
        });

        const roots = [];

        // 2. Build Hierarchy
        steps.forEach(step => {
            const enriched = stepMap[step.id];
            if (enriched.parent_step_id && stepMap[enriched.parent_step_id]) {
                stepMap[enriched.parent_step_id].childrenIds.push(step.id);
            } else {
                // Fallback for linear legacy data
                roots.push(enriched);
            }
        });

        // Fallback: If everything is a root (legacy data), chain them linearly
        if (roots.length === steps.length && steps.length > 1) {
            // Clear roots, rebuild as linked list
            roots.length = 0;
            roots.push(stepMap[steps[0].id]);
            for (let i = 0; i < steps.length - 1; i++) {
                stepMap[steps[i].id].childrenIds = [steps[i + 1].id];
            }
        }

        return { treeRoots: roots, processedSteps: Object.values(stepMap) };
    }, [steps]);

    useEffect(() => {
        if (containerRef.current) containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }, [steps.length]);

    return (
        <div
            ref={containerRef}
            className={`relative w-[400px] h-full overflow-y-auto overflow-x-hidden custom-scrollbar border-r p-6 pb-20 select-none ${isDark ? 'bg-[#050505] border-white/10' : 'bg-slate-50 border-slate-200'
                }`}
        >
            <div className="space-y-4">
                {treeRoots.length === 0 && steps.length === 0 && (
                    <div className="text-center opacity-40 text-xs mt-10">Waiting for uplink...</div>
                )}

                {treeRoots.map(root => (
                    <StepNode
                        key={root.id}
                        step={root}
                        childrenIds={root.childrenIds}
                        allSteps={processedSteps}
                        depth={0}
                        onSelect={onSelectStep}
                        selectedId={selectedStep?.id}
                        isDark={isDark}
                    />
                ))}

                {/* Live Indicator */}
                {steps.length > 0 && (
                    <div className="pl-4 ml-4 mt-2 border-l-2 border-dashed border-opacity-20 h-8 border-gray-500" />
                )}
                {steps.length > 0 && steps[steps.length - 1].status === 'running' && (
                    <div className="flex items-center gap-3 pl-2 opacity-50">
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-ping" />
                        <span className="text-[9px] font-mono uppercase">Thinking...</span>
                    </div>
                )}
            </div>
        </div>
    );
}
