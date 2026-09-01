import type { Metadata } from "next";
import { StatsOverview } from "@/components/admin/stats-overview";

export const metadata: Metadata = { title: "站点统计" };

export default function AdminStatsPage() {
  return <StatsOverview />;
}
