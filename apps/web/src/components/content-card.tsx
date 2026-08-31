import Link from "next/link";
import type { ReactNode } from "react";

/**
 * 内容卡片：Wiki 条目 / 攻略 / 论坛主题三变体共用外壳。
 * 字段对应契约 *Summary schema；契约冻结前仅渲染结构，不绑定数据源。
 */
export function ContentCard({
  href,
  title,
  excerpt,
  meta,
  children,
}: {
  href: string;
  title: string;
  excerpt?: string;
  /** 右上角元信息（评分、状态徽章等） */
  meta?: ReactNode;
  /** 底部标签区 */
  children?: ReactNode;
}) {
  return (
    <article className="group rounded-md border border-border-subtle bg-surface p-4 shadow-card transition-colors duration-fast hover:border-amber-soft">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-h3 font-semibold leading-snug">
          <Link
            href={href}
            className="text-primary decoration-amber underline-offset-4 group-hover:text-amber group-hover:underline"
          >
            {title}
          </Link>
        </h3>
        {meta}
      </div>
      {excerpt && (
        <p className="mt-2 line-clamp-2 text-small text-secondary">{excerpt}</p>
      )}
      {children && <div className="mt-3 flex flex-wrap gap-1.5">{children}</div>}
    </article>
  );
}
