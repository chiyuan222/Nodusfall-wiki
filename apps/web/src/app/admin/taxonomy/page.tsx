import type { Metadata } from "next";
import Link from "next/link";
import { TaxonomyManager } from "@/components/admin/taxonomy-manager";

export const metadata: Metadata = {
  title: "板块与分类管理",
  description: "管理 Wiki 分类与论坛板块：新建、改名、调序、删除（仅管理员）。",
  robots: { index: false },
};

export default function AdminTaxonomyPage() {
  return (
    <div className="mx-auto max-w-page py-8">
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <h1 className="font-serif text-h1 font-semibold">板块与分类管理</h1>
        <span className="grow" />
        <Link
          href="/me"
          className="rounded-md border border-border-subtle px-4 py-2 text-small text-secondary hover:border-amber-soft hover:text-primary"
        >
          ← 返回用户中心
        </Link>
      </div>
      <TaxonomyManager />
    </div>
  );
}
