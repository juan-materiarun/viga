import { cn } from "@/lib/utils"

function Skeleton({ className, ...props }) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-[var(--bg-hover)]", className)}
      {...props}
    />
  )
}

export { Skeleton }
