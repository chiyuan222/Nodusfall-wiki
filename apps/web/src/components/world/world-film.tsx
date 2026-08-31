"use client";

/**
 * 「源点下潜」——世界观概念艺术滚动电影（Lane A 纯代码）。
 *
 * 镜头矢量：只向下 / 只向深处。五章连续下降：
 *   星海 → 结现 → 结络 → 世间 → 归处（交接给正文）
 *
 * 技术要点：
 * - GSAP + ScrollTrigger 驱动一条主时间线（scrub），CSS sticky 承载 pinned 视口
 * - Lenis 平滑滚动与 ScrollTrigger 同步
 * - 只动 transform / opacity / stroke-dashoffset，不触发布局
 * - prefers-reduced-motion：全部静态呈现，内容立即可见
 * - 开发契约：?jump=<scrollY> 直接落位；初始化完成后置 window.__ready = true
 */

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";

declare global {
  interface Window {
    __ready?: boolean;
  }
}

const CHAPTERS = ["星海", "结现", "结络", "世间", "归处"] as const;

const CHAPTER_LINES = [
  "在时间之前，只有线。",
  "线找到了彼此，于是有了结。",
  "每一个结，都是一个源点。",
  "你从结上坠落，落入人间。",
  "现在，轮到你了。",
] as const;

/** 首屏标题逐字显现 */
function SplitTitle({ text }: { text: string }) {
  return (
    <span aria-label={text} role="heading" aria-level={1} className="block">
      {Array.from(text).map((ch, i) => (
        <span
          key={i}
          aria-hidden
          data-char
          className="inline-block will-change-transform"
        >
          {ch === " " ? " " : ch}
        </span>
      ))}
    </span>
  );
}

/** 星海画布：环境粒子，随滚动缓缓下坠 */
function Starfield({ progressRef }: { progressRef: React.MutableRefObject<number> }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let width = 0;
    let height = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const stars = Array.from({ length: 140 }, () => ({
      x: Math.random(),
      y: Math.random(),
      r: Math.random() * 1.4 + 0.3,
      depth: Math.random() * 0.8 + 0.2,
      amber: Math.random() < 0.12,
    }));

    const resize = () => {
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const draw = (t: number) => {
      ctx.clearRect(0, 0, width, height);
      const p = progressRef.current;
      for (const s of stars) {
        // 星星随滚动向下漂移（镜头在下降），深处星星移动更慢
        const drift = reduced ? 0 : t / 60000;
        const y = ((s.y + p * 1.6 * s.depth + drift * s.depth) % 1) * height;
        const x = s.x * width;
        const alpha = 0.25 + 0.75 * s.depth;
        ctx.beginPath();
        ctx.arc(x, y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = s.amber
          ? `rgba(217, 164, 65, ${alpha})`
          : `rgba(237, 232, 223, ${alpha * 0.7})`;
        ctx.fill();
      }
      if (!reduced) raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [progressRef]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="absolute inset-0 h-full w-full"
    />
  );
}

export function WorldFilm() {
  const rootRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef(0);
  const [chapter, setChapter] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      window.__ready = true;
      return;
    }

    gsap.registerPlugin(ScrollTrigger);

    const lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
    lenis.on("scroll", ScrollTrigger.update);
    const rafLenis = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(rafLenis);
    gsap.ticker.lagSmoothing(0);

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: root,
          start: "top top",
          end: "bottom bottom",
          scrub: 1.2,
          onUpdate: (self) => {
            progressRef.current = self.progress;
            setProgress(self.progress);
            setChapter(
              Math.min(
                CHAPTERS.length - 1,
                Math.floor(self.progress * CHAPTERS.length),
              ),
            );
          },
        },
      });

      // 首屏标题：逐字升起点亮
      gsap.from("[data-char]", {
        yPercent: 110,
        opacity: 0,
        rotate: 4,
        duration: 1.1,
        stagger: 0.06,
        ease: "power3.out",
        delay: 0.3,
      });

      // 第一章 → 第二章：标题升起消散，镜头下潜（场景一放大退场）
      tl.to("[data-scene='void']", { scale: 1.35, opacity: 0, duration: 1.4 }, 0.6)
        .to("[data-hero-copy]", { yPercent: -60, opacity: 0, duration: 1 }, 0.6)
        // 第二章「结现」：绳结被一笔画出，镜头持续推进
        .fromTo(
          "[data-scene='knot']",
          { opacity: 0, scale: 1.25 },
          { opacity: 1, scale: 1, duration: 1.2 },
          1.2,
        )
        .fromTo(
          "[data-knot-path]",
          { strokeDashoffset: 1 },
          { strokeDashoffset: 0, duration: 2.2, stagger: 0.25 },
          1.3,
        )
        // 第二章 → 第三章：结放大退场，网络展开
        .to("[data-scene='knot']", { scale: 2.2, opacity: 0, duration: 1.4 }, 3.8)
        .fromTo(
          "[data-scene='network']",
          { opacity: 0 },
          { opacity: 1, duration: 1 },
          4.6,
        )
        .fromTo(
          "[data-net-line]",
          { strokeDashoffset: 1 },
          { strokeDashoffset: 0, duration: 1.6, stagger: 0.12 },
          4.8,
        )
        .fromTo(
          "[data-net-node]",
          { scale: 0, opacity: 0, transformOrigin: "center" },
          { scale: 1, opacity: 1, duration: 0.8, stagger: 0.1, ease: "back.out(2)" },
          5.2,
        )
        // 第三章 → 第四章：网络隐去，世间浮现
        .to("[data-scene='network']", { opacity: 0, scale: 1.4, duration: 1.2 }, 7)
        .fromTo(
          "[data-scene='world']",
          { opacity: 0, scale: 1.15 },
          { opacity: 1, scale: 1, duration: 1.6 },
          7.8,
        )
        .fromTo(
          "[data-city]",
          { opacity: 0, scale: 0 },
          { opacity: 1, scale: 1, duration: 0.7, stagger: 0.15, ease: "back.out(3)" },
          8.6,
        )
        // 第四章 → 终章：整体变暗下沉，交接给正文
        .to("[data-scene='world']", { opacity: 0.25, y: 80, duration: 1.4 }, 10)
        .fromTo(
          "[data-finale]",
          { opacity: 0, y: 40 },
          { opacity: 1, y: 0, duration: 1, ease: "power2.out" },
          10.4,
        );

      // 章节文案随进度切换
      CHAPTER_LINES.forEach((_, i) => {
        tl.fromTo(
          `[data-line='${i}']`,
          { opacity: 0, y: 24 },
          { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" },
          0.9 + i * 2.1,
        ).to(`[data-line='${i}']`, { opacity: 0, y: -24, duration: 0.5 }, 2.6 + i * 2.1);
      });

      ScrollTrigger.refresh();

      // 开发契约：?jump=<scrollY> 直接落位
      const jump = new URLSearchParams(window.location.search).get("jump");
      if (jump) {
        const y = Number(jump);
        if (Number.isFinite(y)) {
          lenis.scrollTo(y, { immediate: true });
          ScrollTrigger.refresh();
        }
      }

      window.__ready = true;
    }, root);

    return () => {
      ctx.revert();
      gsap.ticker.remove(rafLenis);
      lenis.destroy();
    };
  }, []);

  return (
    <div ref={rootRef} className="relative" style={{ height: "520vh" }}>
      <div className="sticky top-0 h-screen overflow-hidden bg-canvas">
        {/* 章节一：星海 */}
        <div data-scene="void" className="absolute inset-0 will-change-transform">
          <Starfield progressRef={progressRef} />
        </div>

        {/* 章节二：结现——一笔画出的源初之结 */}
        <div
          data-scene="knot"
          className="absolute inset-0 flex items-center justify-center opacity-0 will-change-transform"
        >
          <svg viewBox="0 0 400 400" className="h-[70vmin] w-[70vmin]" aria-hidden>
            <defs>
              <radialGradient id="knot-glow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#d9a441" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#d9a441" stopOpacity="0" />
              </radialGradient>
            </defs>
            <circle cx="200" cy="200" r="190" fill="url(#knot-glow)" />
            {[
              "M200 80 C300 80 340 160 340 200 C340 280 260 340 200 340 C140 340 60 280 60 200 C60 160 100 80 200 80",
              "M200 80 C260 140 260 260 200 340 C140 260 140 140 200 80",
              "M60 200 C140 140 260 140 340 200 C260 260 140 260 60 200",
            ].map((d, i) => (
              <path
                key={i}
                data-knot-path
                d={d}
                fill="none"
                stroke={i === 0 ? "#d9a441" : "#8a6b2f"}
                strokeWidth={i === 0 ? 2.5 : 1.5}
                strokeLinecap="round"
                pathLength={1}
                strokeDasharray={1}
                strokeDashoffset={1}
              />
            ))}
          </svg>
        </div>

        {/* 章节三：结络——节点与连线构成的世界脉络 */}
        <div
          data-scene="network"
          className="absolute inset-0 flex items-center justify-center opacity-0 will-change-transform"
        >
          <svg viewBox="0 0 800 500" className="h-[80vmin] w-[110vmin]" aria-hidden>
            {[
              "M120 250 L300 150 L500 200 L680 120",
              "M300 150 L380 320 L580 350",
              "M120 250 L260 400 L380 320",
              "M500 200 L580 350 L680 420",
              "M260 400 L460 460 L680 420",
              "M500 200 L680 120",
            ].map((d, i) => (
              <path
                key={i}
                data-net-line
                d={d}
                fill="none"
                stroke="#8a6b2f"
                strokeWidth="1"
                pathLength={1}
                strokeDasharray={1}
                strokeDashoffset={1}
                opacity={0.7}
              />
            ))}
            {[
              [120, 250], [300, 150], [500, 200], [680, 120], [380, 320],
              [260, 400], [580, 350], [680, 420], [460, 460],
            ].map(([cx, cy], i) => (
              <g key={i} data-net-node opacity={0}>
                <circle cx={cx} cy={cy} r={i % 3 === 0 ? 7 : 4} fill="#d9a441" />
                <circle cx={cx} cy={cy} r={i % 3 === 0 ? 16 : 10} fill="none" stroke="#d9a441" strokeOpacity="0.3" />
              </g>
            ))}
          </svg>
        </div>

        {/* 章节四：世间——节点亮起如城 */}
        <div
          data-scene="world"
          className="absolute inset-0 flex items-center justify-center opacity-0 will-change-transform"
        >
          <svg viewBox="0 0 800 500" className="h-[85vmin] w-[120vmin]" aria-hidden>
            <defs>
              <radialGradient id="land" cx="50%" cy="45%" r="60%">
                <stop offset="0%" stopColor="#2b2820" />
                <stop offset="100%" stopColor="#161511" stopOpacity="0" />
              </radialGradient>
            </defs>
            <ellipse cx="400" cy="260" rx="330" ry="180" fill="url(#land)" />
            <ellipse cx="260" cy="220" rx="120" ry="80" fill="url(#land)" opacity="0.7" />
            <ellipse cx="560" cy="300" rx="140" ry="90" fill="url(#land)" opacity="0.7" />
            {[
              [300, 210], [430, 250], [540, 290], [360, 320], [250, 270], [620, 240],
            ].map(([cx, cy], i) => (
              <g key={i} data-city opacity={0}>
                <circle cx={cx} cy={cy} r="5" fill="#d9a441" />
                <circle cx={cx} cy={cy} r="12" fill="none" stroke="#d9a441" strokeOpacity="0.4" />
              </g>
            ))}
          </svg>
        </div>

        {/* 首屏文案 */}
        <div
          data-hero-copy
          className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center"
        >
          <p className="text-caption uppercase tracking-[0.4em] text-faint">
            Nodusfall · 概念艺术
          </p>
          <h1 className="mt-6 font-serif text-[13vw] font-semibold leading-none text-primary md:text-[8vw]">
            <SplitTitle text="源初之结" />
          </h1>
          <p className="mt-6 max-w-reading text-body text-secondary">
            一部关于「结」的世界观导览
          </p>
        </div>

        {/* 章节文案 */}
        {CHAPTER_LINES.map((line, i) => (
          <p
            key={i}
            data-line={i}
            className="absolute inset-x-0 bottom-[18vh] mx-auto max-w-reading px-6 text-center font-serif text-h2 font-medium text-primary opacity-0"
          >
            {line}
          </p>
        ))}

        {/* 终章交接文案 */}
        <div
          data-finale
          className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center opacity-0"
        >
          <p className="font-serif text-display font-semibold text-primary">
            结之下，是世界。
          </p>
          <p className="mt-4 text-small text-secondary">继续下滑，进入它的框架</p>
          <svg
            aria-hidden
            viewBox="0 0 24 24"
            className="mt-8 h-6 w-6 animate-bounce text-amber"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path d="M12 4v16m0 0l-6-6m6 6l6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        {/* 章节读数 / 高度计 */}
        <div className="absolute right-4 top-1/2 hidden -translate-y-1/2 flex-col items-center gap-3 md:flex lg:right-8">
          <span className="font-mono text-caption text-faint">
            {String(chapter + 1).padStart(2, "0")} / {String(CHAPTERS.length).padStart(2, "0")}
          </span>
          <div className="relative h-32 w-px overflow-hidden bg-border-subtle">
            <div
              className="absolute top-0 w-px bg-amber transition-[height] duration-instant"
              style={{ height: `${progress * 100}%` }}
            />
          </div>
          <span className="font-serif text-caption text-secondary [writing-mode:vertical-rl]">
            {CHAPTERS[chapter]}
          </span>
        </div>
      </div>
    </div>
  );
}
