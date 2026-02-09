'use client';

import React, { useState } from 'react';

export default function PerformanceChart({ data, height = 200 }) {
    // Data expected format: { date: string, latency: number, status: 'success'|'failed' }[]
    const [hoveredIndex, setHoveredIndex] = useState(null);

    if (!data || data.length < 2) {
        return (
            <div className="flex items-center justify-center text-[var(--text-muted)] text-xs h-full bg-[var(--bg-base)] rounded-xl border border-[var(--border-color)] border-dashed">
                Datos insuficientes para graficar
            </div>
        );
    }

    // configure
    const padding = 20;
    const chartHeight = height - padding * 2;
    // Normalize data
    const maxLatency = Math.max(...data.map(d => d.latency)) * 1.2; // 20% headroom
    const points = data.map((d, i) => {
        const x = (i / (data.length - 1)) * 100; // percent
        const y = 100 - (d.latency / maxLatency) * 100; // percent inverted
        return { x, y, ...d };
    });

    // SVG Path
    const pathD = points.map((p, i) =>
        `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`
    ).join(' ');

    // Area Path (for gradient)
    const areaD = `${pathD} L 100 100 L 0 100 Z`;

    return (
        <div className="relative w-full select-none" style={{ height: `${height}px` }}>
            <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" className="overflow-visible">
                {/* Gradient Definition */}
                <defs>
                    <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--accent-primary)" stopOpacity="0.2" />
                        <stop offset="100%" stopColor="var(--accent-primary)" stopOpacity="0" />
                    </linearGradient>
                </defs>

                {/* Grid Lines (Horizontal) */}
                {[0, 25, 50, 75, 100].map(y => (
                    <line key={y} x1="0" y1={y} x2="100" y2={y} stroke="var(--border-color)" strokeWidth="0.5" vectorEffect="non-scaling-stroke" strokeDasharray="2" />
                ))}

                {/* Area Fill */}
                <path d={areaD} fill="url(#chartGradient)" />

                {/* Line */}
                <path d={pathD} fill="none" stroke="var(--accent-primary)" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />

                {/* Interactive Points */}
                {points.map((p, i) => (
                    <g key={i}>
                        {/* Invisible larger hover target */}
                        <circle
                            cx={p.x} cy={p.y} r="6" fill="transparent"
                            onMouseEnter={() => setHoveredIndex(i)}
                            onMouseLeave={() => setHoveredIndex(null)}
                            className="cursor-pointer"
                        />
                        {/* Visible Point (only on hover or last point) */}
                        {(hoveredIndex === i || i === points.length - 1) && (
                            <circle
                                cx={p.x} cy={p.y} r="3"
                                fill="var(--bg-base)"
                                stroke={p.status === 'failed' ? '#ef4444' : 'var(--accent-primary)'}
                                strokeWidth="2"
                                vectorEffect="non-scaling-stroke"
                            />
                        )}
                    </g>
                ))}
            </svg>

            {/* Tooltip */}
            {hoveredIndex !== null && (
                <div
                    className="absolute bg-[var(--bg-secondary)] border border-[var(--border-color)] p-2 rounded-lg shadow-xl z-10 pointer-events-none transform -translate-x-1/2 -translate-y-full transition-all"
                    style={{
                        left: `${points[hoveredIndex].x}%`,
                        top: `${(points[hoveredIndex].y / 100) * height - 10}px`
                    }}
                >
                    <div className="flex flex-col gap-0.5 min-w-[120px]">
                        <span className="text-[10px] text-[var(--text-muted)] font-mono">
                            {new Date(points[hoveredIndex].created_at).toLocaleString()}
                        </span>
                        <div className="flex items-center justify-between gap-4">
                            <span className="text-xs font-bold text-[var(--text-primary)]">
                                {points[hoveredIndex].latency}ms
                            </span>
                            <span className={`text-[10px] uppercase font-bold ${points[hoveredIndex].status === 'success' ? 'text-emerald-500' : 'text-red-500'}`}>
                                {points[hoveredIndex].status === 'success' ? 'Éxito' : 'Fallo'}
                            </span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
