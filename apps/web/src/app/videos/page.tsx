import type { Metadata } from "next";
import { VideoHub } from "@/components/videos/video-hub";

export const metadata: Metadata = {
  title: "相关视频",
  description:
    "《源初之结》相关视频导航：官方视频、考究杂谈、实况攻略——仅收藏外链跳转，视频版权归原作者与平台所有。",
};

export default function VideosPage() {
  return (
    <div className="mx-auto max-w-page space-y-6">
      <header>
        <p className="font-mono text-caption uppercase tracking-[0.4em] text-faint">
          Videos
        </p>
        <h1 className="mt-3 font-serif text-h1 font-semibold">相关视频</h1>
        <p className="mt-2 max-w-reading text-small text-secondary">
          本站为视频导航库：不搬运、不上传，仅收藏外链并跳转到对应平台观看。
          视频版权归原作者与发布平台所有。
        </p>
      </header>
      <VideoHub />
    </div>
  );
}
