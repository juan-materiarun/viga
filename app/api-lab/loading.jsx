import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
    return (
        <div className="flex flex-col h-screen bg-[var(--bg-base)]">
            {/* Header Skeleton */}
            <div className="px-8 pt-8 pb-4 shrink-0 dashboard-header">
                <div className="flex items-center gap-4 mb-4">
                    <Skeleton className="w-8 h-8 rounded-md" />
                    <div>
                        <Skeleton className="h-8 w-32 mb-2" />
                        <Skeleton className="h-4 w-48" />
                    </div>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden border-t border-[var(--border-color)]">
                {/* Sidebar Skeleton */}
                <div className="w-64 border-r border-[var(--border-color)] bg-[var(--bg-secondary)] flex flex-col p-4 space-y-4">
                    <div className="flex justify-between items-center mb-2">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-6 w-6 rounded" />
                    </div>
                    {[1, 2, 3].map(i => (
                        <div key={i} className="mb-4">
                            <Skeleton className="h-5 w-32 mb-2 rounded" />
                            <div className="pl-4 space-y-2">
                                <Skeleton className="h-4 w-full rounded" />
                                <Skeleton className="h-4 w-3/4 rounded" />
                            </div>
                        </div>
                    ))}
                </div>

                {/* Main Content Skeleton */}
                <div className="flex-1 flex flex-col min-w-0">
                    {/* Top Bar */}
                    <div className="h-16 border-b border-[var(--border-color)] flex items-center gap-2 px-4 bg-[var(--bg-base)]">
                        <Skeleton className="h-10 w-24 rounded-lg" />
                        <Skeleton className="h-10 flex-1 rounded-lg" />
                        <Skeleton className="h-10 w-24 rounded-lg" />
                        <Skeleton className="h-10 w-24 rounded-lg" />
                    </div>

                    <div className="flex-1 flex overflow-hidden">
                        {/* Left Panel */}
                        <div className="flex-1 flex flex-col border-r border-[var(--border-color)] p-4">
                            <div className="flex border-b border-[var(--border-color)] mb-4">
                                <Skeleton className="h-8 w-16 mr-4" />
                                <Skeleton className="h-8 w-16" />
                            </div>
                            <Skeleton className="flex-1 w-full rounded-lg" />
                        </div>
                        {/* Right Panel */}
                        <div className="flex-1 flex flex-col bg-[var(--bg-secondary)]/50 p-4">
                            <div className="flex justify-between mb-4">
                                <Skeleton className="h-4 w-16" />
                            </div>
                            <div className="flex-1 flex items-center justify-center">
                                <Skeleton className="h-16 w-16 rounded-full opacity-20" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
