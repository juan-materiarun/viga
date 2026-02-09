'use client';

export default function SkeletonCard({ className = '' }) {
    return (
        <div className={`animate-pulse ${className}`}>
            <div className="bg-[var(--bg-hover)] border border-[var(--border-color)] rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                    <div className="h-4 bg-[var(--border-color)] rounded w-24"></div>
                    <div className="h-4 bg-[var(--border-color)] rounded w-16"></div>
                </div>
                <div className="h-6 bg-[var(--border-color)] rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-[var(--border-color)] rounded w-1/2 mb-4"></div>
                <div className="space-y-2">
                    <div className="h-3 bg-[var(--border-color)] rounded w-full"></div>
                    <div className="h-3 bg-[var(--border-color)] rounded w-5/6"></div>
                </div>
            </div>
        </div>
    );
}

export function SkeletonTestCard() {
    return (
        <div className="animate-pulse">
            <div className="bg-[var(--bg-hover)] border border-[var(--border-color)] rounded-xl p-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                        <div className="w-5 h-5 bg-[var(--border-color)] rounded-full"></div>
                        <div className="flex-1">
                            <div className="h-5 bg-[var(--border-color)] rounded w-48 mb-2"></div>
                            <div className="h-4 bg-[var(--border-color)] rounded w-64 mb-1"></div>
                            <div className="h-3 bg-[var(--border-color)] rounded w-32"></div>
                        </div>
                        <div className="h-8 bg-[var(--border-color)] rounded w-24"></div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                        <div className="h-8 bg-[var(--border-color)] rounded w-16"></div>
                        <div className="h-8 bg-[var(--border-color)] rounded w-10"></div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export function SkeletonStatCard() {
    return (
        <div className="animate-pulse">
            <div className="bg-[var(--bg-hover)] border border-[var(--border-color)] rounded-xl p-6 text-center">
                <div className="h-8 bg-[var(--border-color)] rounded w-16 mx-auto mb-2"></div>
                <div className="h-4 bg-[var(--border-color)] rounded w-24 mx-auto"></div>
            </div>
        </div>
    );
}
