import Link from "next/link";

/** 分页：字段对应契约 Pagination { page, totalPages, hasMore } */
export function Pagination({
  page,
  totalPages,
  makeHref,
}: {
  page: number;
  totalPages: number;
  makeHref: (page: number) => string;
}) {
  if (totalPages <= 1) return null;

  // 窗口化页码：当前页前后各 2 页
  const start = Math.max(1, Math.min(page - 2, totalPages - 4));
  const end = Math.min(totalPages, start + 4);
  const pages = Array.from({ length: end - start + 1 }, (_, i) => start + i);

  const itemClass = (active: boolean) =>
    `flex h-9 min-w-9 items-center justify-center rounded-md px-2 font-mono text-small transition-colors duration-fast ${
      active
        ? "bg-amber font-medium text-amber-fg"
        : "text-secondary hover:bg-raised hover:text-primary"
    }`;

  return (
    <nav aria-label="分页" className="mt-8 flex items-center justify-center gap-1">
      {page > 1 && (
        <Link href={makeHref(page - 1)} className={itemClass(false)} rel="prev">
          ‹
        </Link>
      )}
      {pages.map((p) => (
        <Link
          key={p}
          href={makeHref(p)}
          aria-current={p === page ? "page" : undefined}
          className={itemClass(p === page)}
        >
          {p}
        </Link>
      ))}
      {page < totalPages && (
        <Link href={makeHref(page + 1)} className={itemClass(false)} rel="next">
          ›
        </Link>
      )}
    </nav>
  );
}
