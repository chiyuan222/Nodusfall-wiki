"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { PlaceholderArt } from "./world/media-slot";

/**
 * 通用轮播推荐框（5 个轮替位）
 *
 * - 自动轮替（默认 6 秒），悬停 / 聚焦 / 系统减弱动效时暂停
 * - 不足 5 条时用占位画补齐槽位，占位不可点击
 * - 每页 slide：图片（或占位画）+ 底部渐变 + 标题（衬线大字），点击整卡跳转
 * - 支持箭头与圆点手动切换，键盘可操作，aria 标注完整
 *
 * 使用方：
 * - 首页首屏（CMS 配置的 slides）
 * - Wiki / 攻略 / 论坛首页（真实内容推荐，lib/carousel-data.ts）
 */

export interface CarouselSlide {
  /** 跳转链接；空字符串 = 不可点击（纯展示 / 占位） */
  href: string;
  /** 标题（叠加在图片下方） */
  title: string;
  /** 副标题 / 摘要（可留空） */
  subtitle?: string;
  /** 角标（如「置顶」「评分 4.8」），可留空 */
  badge?: string;
  /** 图片地址；留空 = 原创占位线稿 */
  image?: string;
  /** 图片替代文本 */
  alt?: string;
}

export const CAROUSEL_SLOTS = 5;

const ROTATE_MS = 6000;

export function Carousel({
  slides,
  label,
  emptyHint = "虚位以待 · 待内容接入",
  variant = "hero",
}: {
  slides: CarouselSlide[];
  /** aria-label，如「Wiki 推荐轮播」 */
  label: string;
  /** 空槽位提示文字 */
  emptyHint?: string;
  /**
   * hero：首页首屏大轮播（16/9 → 21/9，大标题）
   * compact：分区页推荐条（更扁、标题降一级、内边距收紧），不抢正文列表视觉重心
   */
  variant?: "hero" | "compact";
}) {
  const compact = variant === "compact";
  // 固定 5 个槽位：真实条目 + 空槽补齐
  const slots: (CarouselSlide | null)[] = Array.from(
    { length: CAROUSEL_SLOTS },
    (_, i) => slides[i] ?? null,
  );

  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const go = useCallback(
    (next: number) => setIndex(((next % CAROUSEL_SLOTS) + CAROUSEL_SLOTS) % CAROUSEL_SLOTS),
    [],
  );

  // 自动轮替：悬停 / 聚焦暂停；尊重 prefers-reduced-motion
  useEffect(() => {
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (paused || reduced) return;
    timer.current = setInterval(() => {
      setIndex((i) => (i + 1) % CAROUSEL_SLOTS);
    }, ROTATE_MS);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [paused]);

  return (
    <div
      role="group"
      aria-roledescription="轮播"
      aria-label={label}
      className="group/carousel relative overflow-hidden rounded-lg border border-border-subtle bg-surface shadow-card"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      {/* slide 视窗 */}
      <div
        className={`relative w-full ${
          compact ? "aspect-[16/7] sm:aspect-[21/6]" : "aspect-[16/9] sm:aspect-[21/9]"
        }`}
      >
        {slots.map((slide, i) => {
          const active = i === index;
          const inner = (
            <>
              {slide?.image ? (
                // eslint-disable-next-line @next/next/no-img-element -- 图片来源为 CMS 或用户内容，运行时路径不固定
                <img
                  src={slide.image}
                  alt={slide.alt || slide.title || ""}
                  loading={i === 0 ? "eager" : "lazy"}
                  className="h-full w-full object-cover"
                />
              ) : (
                <PlaceholderArt variant="banner" />
              )}
              {/* 底部渐变：加深加高，保证叠加文字在复杂图片上也可读 */}
              <span
                aria-hidden
                className="absolute inset-x-0 bottom-0 h-3/4 bg-gradient-to-t from-black/90 via-black/55 to-transparent"
              />
              {/* 角标 */}
              {slide?.badge && (
                <span className="absolute left-4 top-4 rounded-sm border border-amber-soft/80 bg-black/45 px-2 py-0.5 font-mono text-caption tracking-widest text-amber backdrop-blur-sm">
                  {slide.badge}
                </span>
              )}
              {/* 文案区：有图片的帧标题留空即不叠加文字（不回退主标题/提示语）；
                  无图片的占位帧保留 emptyHint 提示。
                  轮播标题与全站标题外观变量解耦（不加 .site-heading）：有图帧强制白字 +
                  加强文字阴影；无图占位帧跟随主题文字色 + 浅底衬（浅色主题 oracle 下可读）。 */}
              {(() => {
                const hasImage = !!slide?.image;
                const caption = hasImage
                  ? slide?.title || ""
                  : slide?.title || emptyHint;
                return (
                  <span
                    className={`absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 ${
                      compact ? "p-4" : "p-5 sm:p-6"
                    }`}
                  >
                    {(caption || slide?.subtitle) && (
                      <span
                        className={`min-w-0 rounded-md backdrop-blur-md ${
                          hasImage
                            ? "bg-black/50"
                            : "border border-border-subtle bg-surface/85"
                        } ${compact ? "px-3 py-2" : "px-3.5 py-2.5"}`}
                      >
                        {caption && (
                          <span
                            className={`block truncate font-serif font-semibold ${
                              hasImage
                                ? "text-white [text-shadow:0_2px_10px_rgba(0,0,0,0.85)]"
                                : "text-primary"
                            } ${
                              compact ? "text-h3 sm:text-h2" : "text-h2 sm:text-h1"
                            }`}
                          >
                            {caption}
                          </span>
                        )}
                        {slide?.subtitle && (
                          <span
                            className={`mt-1 line-clamp-1 block text-small ${
                              hasImage ? "text-white/90" : "text-secondary"
                            }`}
                          >
                            {slide.subtitle}
                          </span>
                        )}
                      </span>
                    )}
                    <span
                      aria-hidden
                      className="shrink-0 rounded-sm bg-black/40 px-2 py-1 font-mono text-caption tracking-[0.3em] text-white/80 backdrop-blur-sm"
                    >
                      {String(i + 1).padStart(2, "0")} / {String(CAROUSEL_SLOTS).padStart(2, "0")}
                    </span>
                  </span>
                );
              })()}
            </>
          );
          const cls = `absolute inset-0 transition-opacity duration-slow ease-out ${
            active ? "opacity-100" : "pointer-events-none opacity-0"
          }`;
          return slide?.href ? (
            <Link
              key={i}
              href={slide.href}
              className={cls}
              aria-hidden={!active}
              tabIndex={active ? 0 : -1}
            >
              {inner}
            </Link>
          ) : (
            <span key={i} className={cls} aria-hidden={!active}>
              {inner}
            </span>
          );
        })}
      </div>

      {/* 左右箭头 */}
      <button
        type="button"
        aria-label="上一张"
        onClick={() => go(index - 1)}
        className="absolute left-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/25 bg-black/40 text-white/85 backdrop-blur-sm transition-opacity duration-fast hover:bg-black/60 sm:opacity-0 sm:group-hover/carousel:opacity-100 sm:focus-visible:opacity-100"
      >
        ‹
      </button>
      <button
        type="button"
        aria-label="下一张"
        onClick={() => go(index + 1)}
        className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/25 bg-black/40 text-white/85 backdrop-blur-sm transition-opacity duration-fast hover:bg-black/60 sm:opacity-0 sm:group-hover/carousel:opacity-100 sm:focus-visible:opacity-100"
      >
        ›
      </button>

      {/* 圆点指示器 */}
      <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-2" role="tablist" aria-label="轮播页码">
        {slots.map((_, i) => (
          <button
            key={i}
            type="button"
            role="tab"
            aria-selected={i === index}
            aria-label={`第 ${i + 1} 张`}
            onClick={() => go(i)}
            className={`h-1.5 rounded-full transition-all duration-fast ${
              i === index ? "w-6 bg-amber" : "w-1.5 bg-white/50 hover:bg-white/80"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
