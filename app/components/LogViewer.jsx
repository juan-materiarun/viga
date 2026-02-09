'use client';
import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Terminal, Scroll, PlayCircle } from 'lucide-react';

export default function LogViewer({ logs = [] }) {
    const bottomRef = useRef(null);

    // Auto-scroll on logs update
    useEffect(() => {
        if (bottomRef.current) bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }, [logs.length]);

    const getLogColor = (level) => {
        switch (level) {
            case 'success': return 'text-green-400';
            case 'error': return 'text-red-400';
            case 'warning': return 'text-yellow-400';
            default: return 'text-[var(--text-secondary)]';
        }
    };

    return (
        <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-xl overflow-hidden flex flex-col h-[400px]">
            <div className="bg-black/20 p-3 border-b border-[var(--border-color)] flex items-center gap-2">
                <Terminal size={16} className="text-[var(--text-muted)]" />
                <span className="text-sm font-mono text-[var(--text-muted)]">Live Execution Logs</span>
                <div className="ml-auto flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                    <span className="text-xs text-green-500 font-mono">LIVE</span>
                </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 font-mono text-xs space-y-1 bg-[#0f1115]">
                {logs.length === 0 && (
                    <div className="text-[var(--text-muted)] italic text-center mt-10">Waiting for agent logs...</div>
                )}
                {logs.map((log) => (
                    <div key={log.id} className="flex gap-2">
                        <span className="text-gray-600 shrink-0">
                            {new Date(log.timestamp).toLocaleTimeString().split(' ')[0]}
                        </span>
                        <span className={`${getLogColor(log.level)} break-all`}>
                            {log.message}
                        </span>
                    </div>
                ))}
                <div ref={bottomRef} />
            </div>
        </div>
    );
}
