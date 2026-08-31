import Link from "next/link";

/** 内容标签：可点击（链接到筛选）或纯展示 */
export function Tag({
  label,
  href,
  active = false,
}: {
  label: string;
  href?: string;
  active?: boolean;
}) {
  const className = `inline-flex items-center rounded-sm border px-2 py-0.5 text-caption transition-colors duration-fast ${
    active
      ? "border-amber bg-amber-soft/30 text-amber"
      : "border-border-subtle bg-raised text-secondary hover:border-amber-soft hover:text-primary"
  }`;

  if (href) {
    return (
      <Link href={href} className={className}>
        #{label}
      </Link>
    );
  }
  return <span className={className}>#{label}</span>;
}
