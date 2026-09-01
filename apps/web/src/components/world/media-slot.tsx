import type { MediaSlot } from "@/lib/world-content";

/**
 * 媒体槽位：管理员在内容配置里填入 src 即显示真实图片或视频；
 * 留空时渲染原创线稿占位画（细线结绳 + 星点，随主题变色），并标注「待替换」。
 * 视频使用原生 <video controls>，无第三方依赖；poster 留空时浏览器取首帧。
 */

type Variant = "banner" | "hero" | "entry" | "card";

const ASPECT: Record<Variant, string> = {
  banner: "aspect-video",
  hero: "aspect-[21/9]",
  entry: "aspect-[4/3]",
  card: "aspect-[3/2]",
};

/** 原创占位线稿：以「源点结绳」为母题的抽象线条，三套主题下均协调 */
export function PlaceholderArt({ variant }: { variant: Variant }) {
  const uid = `ph-${variant}`;
  return (
    <svg
      viewBox="0 0 840 360"
      preserveAspectRatio="xMidYMid slice"
      className="h-full w-full"
      aria-hidden
    >
      <defs>
        <radialGradient id={`${uid}-glow`} cx="50%" cy="46%" r="55%">
          <stop offset="0%" stopColor="var(--accent-amber)" stopOpacity="0.16" />
          <stop offset="100%" stopColor="var(--accent-amber)" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${uid}-thread`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--accent-amber)" stopOpacity="0.9" />
          <stop offset="100%" stopColor="var(--accent-amber)" stopOpacity="0.35" />
        </linearGradient>
      </defs>

      <rect width="840" height="360" fill="var(--bg-raised)" />
      <rect width="840" height="360" fill={`url(#${uid}-glow)`} />

      {/* 星点 */}
      {[
        [96, 62, 1.6], [210, 40, 1.1], [640, 56, 1.4], [742, 110, 1.1],
        [120, 286, 1.2], [708, 296, 1.6], [522, 42, 1.0], [356, 70, 1.2],
      ].map(([cx, cy, r]) => (
        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} fill="var(--text-faint)" />
      ))}

      {/* 源点结绳：三环交织（原创线稿） */}
      <g
        fill="none"
        stroke={`url(#${uid}-thread)`}
        strokeWidth={variant === "hero" ? 1.6 : 1.2}
        strokeLinecap="round"
      >
        <circle cx="420" cy="180" r="118" opacity="0.9" />
        <path d="M420 62 C 502 96, 502 264, 420 298 C 338 264, 338 96, 420 62 Z" />
        <path d="M302 180 C 336 96, 504 96, 538 180 C 504 264, 336 264, 302 180 Z" />
        <path d="M420 62 L420 298" opacity="0.35" />
        <path d="M302 180 L538 180" opacity="0.35" />
      </g>
      <circle cx="420" cy="180" r="4" fill="var(--accent-amber)" />

      {/* 两侧延伸的织线 */}
      <g stroke="var(--border-subtle)" strokeWidth="1" fill="none">
        <path d="M0 180 H 286" />
        <path d="M554 180 H 840" />
        <path d="M0 188 H 250" opacity="0.5" />
        <path d="M590 188 H 840" opacity="0.5" />
      </g>

      {/* 角落标尺刻度（编辑风） */}
      <g stroke="var(--text-faint)" strokeWidth="1" opacity="0.7">
        <path d="M24 336 h18 M24 336 v-18" fill="none" />
        <path d="M816 24 h-18 M816 24 v18" fill="none" />
      </g>
    </svg>
  );
}

export function MediaSlotView({
  media,
  variant,
  hint = true,
  priority = false,
}: {
  media: MediaSlot;
  variant: Variant;
  /** 是否显示「待替换」角标（编辑提示） */
  hint?: boolean;
  priority?: boolean;
}) {
  const kind = media.kind ?? "image";
  const hasMedia = media.src.trim().length > 0;
  return (
    <figure
      className={`relative w-full overflow-hidden rounded-md border border-border-subtle bg-raised ${ASPECT[variant]}`}
    >
      {hasMedia ? (
        kind === "video" ? (
          <video
            src={media.src}
            poster={media.poster || undefined}
            controls
            playsInline
            preload="metadata"
            aria-label={media.alt || undefined}
            className="h-full w-full object-cover"
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element -- 管理员自选外链/本地图，运行时路径不固定
          <img
            src={media.src}
            alt={media.alt || ""}
            loading={priority ? "eager" : "lazy"}
            className="h-full w-full object-cover"
          />
        )
      ) : (
        <PlaceholderArt variant={variant} />
      )}
      {!hasMedia && hint && (
        <figcaption className="absolute bottom-2 right-2 rounded-sm border border-border-subtle bg-canvas/80 px-2 py-0.5 font-mono text-caption text-faint backdrop-blur-sm">
          {kind === "video" ? "视频待管理员替换" : "图片待管理员替换"}
        </figcaption>
      )}
    </figure>
  );
}
