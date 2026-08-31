/**
 * 站点标识：「源初之结」——三环交织的结绳，被一刃斩断（呼应「诸神入刃，斩断死结」）。
 * 参数化 SVG，同一生成逻辑复用于页头、页脚、favicon、加载动画与空状态插画。
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
      <defs>
        <radialGradient id="km-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="var(--accent-amber)" stopOpacity="0.22" />
          <stop offset="100%" stopColor="var(--accent-amber)" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="km-thread" x1="6" y1="6" x2="26" y2="26">
          <stop offset="0%" stopColor="var(--accent-amber)" />
          <stop offset="100%" stopColor="var(--accent-amber-soft)" />
        </linearGradient>
      </defs>

      {/* 微光底晕 */}
      <circle cx="16" cy="16" r="14" fill="url(#km-glow)" />

      {/* 三环交织的结绳（波罗米环式） */}
      <g stroke="url(#km-thread)" strokeWidth="1.7" strokeLinecap="round">
        <circle cx="16" cy="11" r="6.5" />
        <circle cx="11.4" cy="19" r="6.5" />
        <circle cx="20.6" cy="19" r="6.5" />
      </g>

      {/* 斩断死结的一刃：先以底色开缝，再压刃线 */}
      <path
        d="M24.5 5.5 L8 26.5"
        stroke="var(--bg-canvas)"
        strokeWidth="4.2"
        strokeLinecap="round"
      />
      <path
        d="M24.5 5.5 L8 26.5"
        stroke="var(--text-primary)"
        strokeWidth="1.9"
        strokeLinecap="round"
      />

      {/* 源点 */}
      <circle cx="16" cy="16" r="2.1" fill="var(--accent-amber)" />
    </svg>
  );
}
