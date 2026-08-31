import { KnotMark } from "./knot-mark";
import Link from "next/link";

/** 空状态：节点母题插画 + 引导操作 */
export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: { href: string; label: string };
}) {
  return (
    <div className="flex flex-col items-center rounded-md border border-dashed border-border-subtle bg-surface/50 px-6 py-16 text-center">
      <KnotMark size={48} className="opacity-60" />
      <h2 className="mt-4 font-serif text-h2 font-medium text-secondary">
        {title}
      </h2>
      {description && (
        <p className="mt-2 max-w-reading text-small text-faint">{description}</p>
      )}
      {action && (
        <Link
          href={action.href}
          className="mt-6 rounded-md bg-amber px-5 py-2 text-small font-medium text-amber-fg transition-opacity duration-fast hover:opacity-90"
        >
          {action.label}
        </Link>
      )}
    </div>
  );
}
