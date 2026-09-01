import type { Metadata } from "next";
import { LegalDocPage } from "@/components/legal-doc-page";

export const metadata: Metadata = {
  title: "隐私政策",
  description: "源神小窝（《源初之结》非官方玩家社区）隐私政策。",
};

export default function PrivacyPage() {
  return <LegalDocPage docKey="privacy" title="隐私政策" />;
}
