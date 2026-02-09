'use client';
import { ExternalLink, CheckCircle, XCircle, Clock, Image as ImageIcon } from 'lucide-react';

export default function StepsList({ steps }) {
    if (!steps || steps.length === 0) {
        return (
            <div className="text-center p-8 border border-dashed border-[var(--border-color)] rounded-xl text-[var(--text-muted)]">
                No steps recorded yet. Waiting for Chaos Agent...
            </div>
        );
    }

    return (
        <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-xl overflow-hidden">
            <div className="bg-black/10 p-4 border-b border-[var(--border-color)] flex items-center justify-between">
                <h3 className="font-bold text-[var(--text-primary)] flex items-center gap-2">
                    <Clock size={18} className="text-[var(--accent-primary)]" />
                    Live Activity Feed
                </h3>
                <span className="text-xs font-mono text-[var(--text-muted)]">{steps.length} steps</span>
            </div>

            <div className="max-h-[600px] overflow-y-auto p-4 space-y-4">
                {steps.map((step, index) => (
                    <div key={step.id} className="flex gap-4 group">
                        {/* Timeline Connector */}
                        <div className="flex flex-col items-center">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 
                                ${step.status === 'success' ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>
                                <span className="text-xs font-bold">{index + 1}</span>
                            </div>
                            {index !== steps.length - 1 && <div className="w-0.5 flex-1 bg-[var(--border-color)] my-1"></div>}
                        </div>

                        {/* Content */}
                        <div className="flex-1 bg-[var(--bg-secondary)] rounded-lg p-3 border border-transparent hover:border-[var(--border-color)] transition-colors">
                            <div className="flex justify-between items-start mb-2">
                                <p className="text-sm font-medium text-[var(--text-primary)]">{step.description || step.title}</p>
                                <span className="text-[10px] font-mono text-[var(--text-muted)] whitespace-nowrap">
                                    {new Date(step.created_at).toLocaleTimeString()}
                                </span>
                            </div>

                            {step.selector && (
                                <div className="mb-2 text-xs font-mono text-[var(--text-secondary)] bg-black/20 px-2 py-1 rounded inline-block max-w-full truncate">
                                    {step.action_type?.toUpperCase()}: {step.selector}
                                </div>
                            )}

                            {step.expected_result && (
                                <p className={`text-xs mb-3 ${step.status === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                                    {step.status === 'success' ? '✅' : '❌'} {step.expected_result}
                                </p>
                            )}

                            {/* Screenshots */}
                            <div className="flex gap-2 mt-2 overflow-x-auto pb-1">
                                {step.screenshot_url && (
                                    <a href={step.screenshot_url} target="_blank" rel="noopener noreferrer" className="relative group/img block shrink-0">
                                        <img
                                            src={step.screenshot_url}
                                            alt="Step Evidence"
                                            className="h-20 w-auto rounded border border-[var(--border-color)] group-hover/img:opacity-80 transition-opacity"
                                        />
                                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity pointer-events-none">
                                            <ExternalLink size={16} className="text-white drop-shadow-md" />
                                        </div>
                                    </a>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
