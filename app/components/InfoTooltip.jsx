'use client';

import { Info } from 'lucide-react';

export default function InfoTooltip({ text, size = 16 }) {
    return (
        <div className="inline-block relative group">
            <Info
                size={size}
                className="text-[var(--text-muted)] hover:text-[var(--accent-primary)] cursor-help smooth-transition"
            />
            <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 px-3 py-2 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 w-64 pointer-events-none">
                <p className="text-xs text-[var(--text-primary)] leading-relaxed">
                    {text}
                </p>
                <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 w-2 h-2 bg-[var(--bg-primary)] border-r border-b border-[var(--border-color)] rotate-45" />
            </div>
        </div>
    );
}
