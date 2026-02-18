import React from "react";

type SkeletonProps = {
  className?: string;
};

function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800/50",
        className
      )}
    />
  );
}

export function DetailedCardSkeleton() {
  return (
    <div className="rounded-[32px] border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 shadow-sm">
      <div className="flex items-start justify-between gap-6">
        <div className="min-w-0 flex-1">
          <Skeleton className="h-3 w-24 mb-4 opacity-60" />
          <Skeleton className="h-8 w-3/4 mb-3" />
          <Skeleton className="h-4 w-1/2 opacity-80" />
          <div className="mt-8 flex flex-wrap gap-3">
            <Skeleton className="h-8 w-20 rounded-xl" />
            <Skeleton className="h-8 w-32 rounded-xl" />
            <Skeleton className="h-8 w-24 rounded-xl" />
          </div>
        </div>
        <div className="flex gap-3">
          <Skeleton className="h-10 w-10 rounded-2xl" />
          <Skeleton className="h-10 w-10 rounded-2xl" />
        </div>
      </div>
    </div>
  );
}

export function DetailedCardGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <DetailedCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function TableSkeletonRows({ rows = 4, cols = 4, cellClassName = "px-6 py-4" }: { rows?: number; cols?: number; cellClassName?: string }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <tr key={rowIdx}>
          {Array.from({ length: cols }).map((__, colIdx) => (
            <td key={`${rowIdx}-${colIdx}`} className={cellClassName}>
              <Skeleton className="h-4 w-full max-w-[180px]" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}
