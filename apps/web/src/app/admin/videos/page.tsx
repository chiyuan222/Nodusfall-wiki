import type { Metadata } from "next";
import { VideoManager } from "@/components/admin/video-manager";

export const metadata: Metadata = {
  title: "相关视频管理",
  robots: { index: false },
};

export default function AdminVideosPage() {
  return (
    <div className="mx-auto max-w-page space-y-6">
      <header>
        <p className="font-mono text-caption uppercase tracking-[0.4em] text-faint">
          Admin · Videos
        </p>
        <h1 className="mt-3 font-serif text-h1 font-semibold">相关视频管理</h1>
        <p className="mt-2 text-small text-secondary">
          收录外链视频（不搬运不上传），按分区展示到 /videos；支持排序与发布/隐藏。
        </p>
      </header>
      <VideoManager />
    </div>
  );
}
