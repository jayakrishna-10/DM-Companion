export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`skeleton ${className}`} />
}

export function EntrySkeleton() {
  return (
    <div className="p-3 space-y-2">
      <div className="flex items-center gap-2">
        <Skeleton className="h-4 w-12" />
        <Skeleton className="h-4 flex-1" />
      </div>
      <Skeleton className="h-3 w-40" />
    </div>
  )
}

export function HomeSkeleton() {
  return (
    <div className="p-4 space-y-4">
      <Skeleton className="h-20 w-full rounded-xl" />
      <Skeleton className="h-5 w-32" />
      {[1, 2, 3].map(i => (
        <EntrySkeleton key={i} />
      ))}
    </div>
  )
}