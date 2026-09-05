import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { guidesApi, type Guide } from "@/lib/api";
import { ApiError } from "@/lib/errors";
import { GuideEditor } from "@/components/guides/guide-editor";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "编辑攻略" };

/** 编辑已有攻略（作者本人或 admin）。攻略数据服务端预取。 */
export default async function EditGuidePage({
  params,
}: {
  params: { slug: string };
}) {
  let guide: Guide;
  try {
    guide = await guidesApi.get(params.slug);
  } catch (e) {
    if (e instanceof ApiError && (e.status === 404 || e.status === 403)) notFound(); // 他人草稿对非作者隐藏存在（403 视同 404）
    throw e;
  }

  return (
    <div className="mx-auto max-w-page space-y-6">
      <header>
        <p className="font-mono text-caption uppercase tracking-[0.4em] text-faint">
          Guide Editor
        </p>
        <h1 className="mt-3 font-serif text-h1 font-semibold">
          编辑：{guide.title}
        </h1>
      </header>
      <GuideEditor mode="edit" initial={guide} />
    </div>
  );
}
