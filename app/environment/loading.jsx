import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
    return (
        <div className="p-8 animate-fade-in">
            <div className="max-w-6xl mx-auto">
                <div className="mb-8">
                    <Skeleton className="h-8 w-48 mb-2" />
                    <Skeleton className="h-4 w-64" />
                </div>
                <Skeleton className="h-64 w-full rounded-xl" />
            </div>
        </div>
    );
}
