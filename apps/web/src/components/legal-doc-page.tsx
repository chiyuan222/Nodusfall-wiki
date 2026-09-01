import Link from "next/link";
import { Markdown } from "@/components/markdown";
import { readLegalDoc, type LegalDocKey } from "@/lib/legal";

/**
 * 法律文档页面骨架（/legal/terms、/legal/privacy 共用）。
 * 顶部标题 + 生效日期（文档首行 blockquote 内含），正文按章节渲染，底部「回到首页」。
 */

export function LegalDocPage({
  docKey,
  title,
}: {
  docKey: LegalDocKey;
  title: string;
}) {
  const content = readLegalDoc(docKey);

  return (
    <article className="mx-auto max-w-reading px-6 py-10">
      <header className="border-b border-border-subtle pb-4">
        <h1 className="font-serif text-h1 font-semibold text-primary">{title}</h1>
        <p className="mt-2 text-caption text-faint">
          源神小窝 · 《源初之结》非官方玩家社区
        </p>
      </header>

      {content ? (
        <div className="mt-6">
          {/* 去掉文档自带的一级标题（页头已展示），保留生效日期与章节 */}
          <Markdown content={content.replace(/^#[^\n]*\n+/, "")} />
        </div>
      ) : (
        <p className="mt-10 text-center text-small text-faint">
          文档内容暂未发布，请稍后查看。
        </p>
      )}

      <footer className="mt-12 border-t border-border-subtle pt-6">
        <Link
          href="/"
          className="text-small text-amber underline-offset-4 transition-colors duration-fast hover:underline"
        >
          ← 回到首页
        </Link>
      </footer>
    </article>
  );
}
