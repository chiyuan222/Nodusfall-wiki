import type { Config } from "tailwindcss";

/**
 * Tailwind theme 全部映射到 src/styles/tokens.css 中的 CSS 变量。
 * 不允许在这里直接写死色值 / 字号 —— token 唯一事实源是 tokens.css。
 */
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    screens: {
      // 移动端优先断点，见提案 §3.5
      md: "640px",
      lg: "1024px",
      xl: "1280px",
    },
    colors: {
      canvas: "var(--bg-canvas)",
      surface: "var(--bg-surface)",
      raised: "var(--bg-raised)",
      "border-subtle": "var(--border-subtle)",
      primary: "var(--text-primary)",
      secondary: "var(--text-secondary)",
      faint: "var(--text-faint)",
      amber: {
        DEFAULT: "var(--accent-amber)",
        soft: "var(--accent-amber-soft)",
        fg: "var(--accent-amber-fg)",
      },
      success: "var(--semantic-success)",
      danger: "var(--semantic-danger)",
      info: "var(--semantic-info)",
    },
    fontFamily: {
      sans: ["var(--font-sans)"],
      serif: ["var(--font-serif)"],
      mono: ["var(--font-mono)"],
    },
    fontSize: {
      display: ["var(--text-display)", { lineHeight: "1.25" }],
      h1: ["var(--text-h1)", { lineHeight: "1.3" }],
      h2: ["var(--text-h2)", { lineHeight: "1.35" }],
      h3: ["var(--text-h3)", { lineHeight: "1.4" }],
      body: ["var(--text-body)", { lineHeight: "1.75" }],
      small: ["var(--text-small)", { lineHeight: "1.6" }],
      caption: ["var(--text-caption)", { lineHeight: "1.5" }],
    },
    borderRadius: {
      sm: "var(--radius-sm)",
      md: "var(--radius-md)",
      lg: "var(--radius-lg)",
    },
    boxShadow: {
      card: "var(--shadow-card)",
      overlay: "var(--shadow-overlay)",
    },
    transitionDuration: {
      instant: "var(--dur-instant)",
      fast: "var(--dur-fast)",
      base: "var(--dur-base)",
      slow: "var(--dur-slow)",
    },
    transitionTimingFunction: {
      out: "var(--ease-out)",
      spring: "var(--ease-spring)",
    },
    maxWidth: {
      reading: "var(--slot-reading)",
      list: "var(--slot-list)",
      page: "var(--slot-page)",
    },
    extend: {},
  },
  plugins: [],
};

export default config;
