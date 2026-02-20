import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
    return (
        <div className="p-8 animate-fade-in">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="mb-12 flex items-center justify-between">
                    <div>
                        <Skeleton className="h-10 w-64 mb-3" />
                        <Skeleton className="h-6 w-96" />
                    </div>
                    <Skeleton className="h-12 w-12 rounded-xl" />
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-6 flex items-center justify-between">
                            <div>
                                <Skeleton className="h-4 w-32 mb-2" />
                                <Skeleton className="h-8 w-16" />
                            </div>
                            <Skeleton className="h-12 w-12 rounded-xl" />
                        </div>
                    ))}
                </div>

                {/* Controls */}
                <div className="mb-6 flex items-center justify-between">
                    <Skeleton className="h-6 w-32" />
                    <Skeleton className="h-10 w-24" />
                </div>

                {/* Grid Skeleton */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                        <div key={i} className="h-64 rounded-2xl bg-[var(--bg-secondary)] animate-pulse border border-[var(--border-color)] p-6">
                            <div className="flex justify-between mb-6">
                                <div className="flex gap-4">
                                    <Skeleton className="w-12 h-12 rounded-xl" />
                                    <div>
                                        <Skeleton className="h-4 w-24 mb-2" />
                                        <Skeleton className="h-3 w-32" />
                                    </div>
                                </div>
                                <Skeleton className="h-6 w-20 rounded-full" />
                            </div>
                            <Skeleton className="h-32 w-full rounded-lg" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
