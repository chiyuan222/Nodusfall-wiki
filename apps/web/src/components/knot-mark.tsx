/**
 * 站点标识：节点-连线母题（「结绳源点」）。
 * 参数化 SVG，同一生成逻辑复用于 favicon、加载动画与空状态插画。
 */
export function KnotMark({
  size = 28,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      role="img"
      aria-label="Nodusfall 站点标识"
      className={className}
    >
      <path
        d="M6 22 C6 14, 12 10, 16 10 C20 10, 26 14, 26 22"
        stroke="var(--accent-amber)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M6 22 C10 26, 22 26, 26 22"
        stroke="var(--accent-amber-soft)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="16" cy="10" r="2.5" fill="var(--accent-amber)" />
      <circle cx="6" cy="22" r="2" fill="var(--text-secondary)" />
      <circle cx="26" cy="22" r="2" fill="var(--text-secondary)" />
    </svg>
  );
}
