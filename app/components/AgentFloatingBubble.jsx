'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Search, Zap, Crosshair, AlertCircle, CheckCircle2, Maximize2 } from 'lucide-react';

export default function AgentFloatingBubble({ mode, total, success, alerts, onExpand, isDark }) {
    const getAgentColor = () => {
        switch (mode) {
            case 'scout': return 'text-blue-500';
            case 'chaos': return 'text-orange-500';
            case 'strike': return 'text-purple-500';
            default: return 'text-blue-500';
        }
    };

    const getAgentBg = () => {
        switch (mode) {
            case 'scout': return 'bg-blue-500/10 border-blue-500/20';
            case 'chaos': return 'bg-orange-500/10 border-orange-500/20';
            case 'strike': return 'bg-purple-500/10 border-purple-500/20';
            default: return 'bg-blue-500/10 border-blue-500/20';
        }
    };

    const getAgentIcon = () => {
        switch (mode) {
            case 'scout': return <Search size={16} />;
            case 'chaos': return <Zap size={16} />;
            case 'strike': return <Crosshair size={16} />;
            default: return <Search size={16} />;
        }
    };

    return (
        <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className={`fixed bottom-10 right-10 z-[100] p-1.5 rounded-[32px] border shadow-2xl backdrop-blur-xl flex items-center gap-4 animate-in slide-in-from-bottom-10 ${isDark ? 'bg-black/80 border-white/10' : 'bg-white/90 border-slate-200 shadow-slate-200/50'
                }`}
        >
            {/* Icono del Agente */}
            <div className={`w-12 h-12 rounded-full flex items-center justify-center border ${getAgentBg()} ${getAgentColor()} relative`}>
                <div className={`absolute inset-0 rounded-full animate-ping opacity-20 ${getAgentBg()}`} />
                {getAgentIcon()}
            </div>

            {/* Stats */}
            <div className="flex items-center gap-4 px-2">
                <div className="flex flex-col">
                    <span className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                        Mission: <span className={getAgentColor()}>{mode}</span>
                    </span>
                    <div className="flex items-center gap-3 mt-0.5">
                        <div className="flex items-center gap-1.5 text-emerald-500 text-[9px] font-black">
                            <CheckCircle2 size={12} /> {success}
                        </div>
                        {alerts > 0 && (
                            <div className="flex items-center gap-1.5 text-red-500 text-[9px] font-black">
                                <AlertCircle size={12} /> {alerts}
                            </div>
                        )}
                        <div className={`text-[9px] font-bold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                            / {total}
                        </div>
                    </div>
                </div>

                {/* Action */}
                <button
                    onClick={onExpand}
                    className={`p-3 rounded-2xl transition-all ${isDark ? 'bg-white/5 hover:bg-white/10 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-900'
                        }`}
                >
                    <Maximize2 size={14} />
                </button>
            </div>
        </motion.div>
    );
}
