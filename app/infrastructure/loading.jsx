import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
    return (
        <div className="p-8 animate-fade-in">
            <div className="max-w-6xl mx-auto">
                {/* Header Skeleton */}
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <Skeleton className="h-8 w-48 mb-2" />
                        <Skeleton className="h-4 w-64" />
                    </div>
                    <Skeleton className="h-10 w-32" />
                </div>

                {/* Grid Skeleton */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="bg-[var(--bg-hover)] border border-[var(--border-color)] rounded-xl p-6">
                            <div className="flex justify-between mb-4">
                                <Skeleton className="h-4 w-20" />
                                <Skeleton className="h-4 w-16" />
                            </div>
                            <Skeleton className="h-6 w-32 mb-2" />
                            <Skeleton className="h-4 w-24 mb-4" />
                            <Skeleton className="h-2 w-full rounded-full" />
                        </div>
                    ))}
                </div>

                {/* Footer Skeleton */}
                <Skeleton className="h-20 w-full rounded-xl" />
            </div>
        </div>
    );
}
