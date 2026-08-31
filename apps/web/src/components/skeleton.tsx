/**
 * 骨架屏：尺寸与真实布局 1:1，避免 CLS。
 * 列表用 CardSkeleton 若干条；详情页用 DetailSkeleton。
 */
function Bar({ className }: { className: string }) {
  return (
    <div
      aria-hidden
      className={`animate-pulse rounded-sm bg-raised ${className}`}
    />
  );
}

export function CardSkeleton() {
  return (
    <div
      role="status"
      aria-label="加载中"
      className="rounded-md border border-border-subtle bg-surface p-4"
    >
      <Bar className="h-5 w-2/3" />
      <Bar className="mt-3 h-4 w-full" />
      <Bar className="mt-2 h-4 w-4/5" />
      <div className="mt-4 flex gap-1.5">
        <Bar className="h-5 w-12" />
        <Bar className="h-5 w-12" />
      </div>
    </div>
  );
}

export function ListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="grid gap-4">
      {Array.from({ length: count }, (_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}

export function DetailSkeleton() {
  return (
    <div role="status" aria-label="加载中" className="max-w-reading">
      <Bar className="h-9 w-3/4" />
      <Bar className="mt-3 h-4 w-1/3" />
      <div className="mt-8 space-y-3">
        {Array.from({ length: 6 }, (_, i) => (
          <Bar key={i} className={`h-4 ${i % 3 === 2 ? "w-2/3" : "w-full"}`} />
        ))}
      </div>
    </div>
  );
}
