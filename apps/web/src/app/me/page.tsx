import type { Metadata } from "next";
import { MeTabs } from "@/components/me/me-tabs";

export const metadata: Metadata = { title: "用户中心" };

export default function MePage() {
  return (
    <div className="space-y-6">
      <h1 className="font-serif text-h1 font-semibold">用户中心</h1>
      <MeTabs />
    </div>
  );
}
