import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ReactNode } from "react";

/** 标题文本 → 锚点 id（与详情页目录提取共用，保证一致） */
export function slugifyHeading(text: string, seen: Map<string, number>): string {
  const base = text
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
  const n = seen.get(base) ?? 0;
  seen.set(base, n + 1);
  return n === 0 ? base : `${base}-${n}`;
}

function textOf(node: ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join("");
  if (typeof node === "object" && "props" in node)
    return textOf((node.props as { children?: ReactNode }).children);
  return "";
}

/**
 * Markdown 正文渲染（Wiki 条目 / 攻略 / 帖子共用）。
 * react-markdown 默认不注入原始 HTML，无 XSS 面；样式全走设计 token。
 */

const cls = {
  h2: "mt-10 border-b border-border-subtle pb-2 font-serif text-h2 font-semibold text-primary first:mt-0",
  h3: "mt-8 font-serif text-h3 font-semibold text-primary",
  h4: "mt-6 text-body font-semibold text-primary",
  p: "mt-4 leading-relaxed text-body text-primary",
  a: "text-amber underline decoration-amber-soft underline-offset-4 transition-colors duration-fast hover:text-primary",
  ul: "mt-4 list-disc space-y-1.5 pl-6 text-body text-primary marker:text-amber",
  ol: "mt-4 list-decimal space-y-1.5 pl-6 text-body text-primary marker:text-amber",
  blockquote:
    "mt-4 border-l-2 border-amber-soft bg-surface px-4 py-3 text-small text-secondary",
  code: "rounded-sm bg-surface px-1.5 py-0.5 font-mono text-caption text-amber",
  pre: "mt-4 overflow-x-auto rounded-md border border-border-subtle bg-surface p-4 font-mono text-small text-primary [&_code]:bg-transparent [&_code]:p-0 [&_code]:text-primary",
  hr: "my-8 border-border-subtle",
  table: "mt-4 w-full border-collapse text-small",
  th: "border border-border-subtle bg-surface px-3 py-2 text-left font-semibold text-primary",
  td: "border border-border-subtle px-3 py-2 text-primary",
  img: "mt-4 max-w-full rounded-md border border-border-subtle",
  strong: "font-semibold text-primary",
};

export function Markdown({ content }: { content: string }) {
  const seen = new Map<string, number>();
  return (
    <div className="max-w-reading">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h2: (p) => (
            <h2 {...p} id={slugifyHeading(textOf(p.children), seen)} className={cls.h2} />
          ),
          h3: (p) => (
            <h3 {...p} id={slugifyHeading(textOf(p.children), seen)} className={cls.h3} />
          ),
          h4: (p) => <h4 className={cls.h4} {...p} />,
          p: (p) => <p className={cls.p} {...p} />,
          a: (p) => <a className={cls.a} {...p} />,
          ul: (p) => <ul className={cls.ul} {...p} />,
          ol: (p) => <ol className={cls.ol} {...p} />,
          blockquote: (p) => <blockquote className={cls.blockquote} {...p} />,
          code: (p) => <code className={cls.code} {...p} />,
          pre: (p) => <pre className={cls.pre} {...p} />,
          hr: (p) => <hr className={cls.hr} {...p} />,
          table: (p) => (
            <div className="overflow-x-auto">
              <table className={cls.table} {...p} />
            </div>
          ),
          th: (p) => <th className={cls.th} {...p} />,
          td: (p) => <td className={cls.td} {...p} />,
          img: (p) => (
            // eslint-disable-next-line @next/next/no-img-element -- 用户内容图片，尺寸未知
            <img className={cls.img} loading="lazy" {...p} alt={p.alt ?? ""} />
          ),
          strong: (p) => <strong className={cls.strong} {...p} />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
