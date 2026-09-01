import type { Metadata } from "next";
import { LegalDocPage } from "@/components/legal-doc-page";

export const metadata: Metadata = {
  title: "用户协议",
  description: "源神小窝（《源初之结》非官方玩家社区）用户协议与社区规范。",
};

export default function TermsPage() {
  return <LegalDocPage docKey="terms" title="用户协议" />;
}
