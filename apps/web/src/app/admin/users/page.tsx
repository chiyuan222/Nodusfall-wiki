import type { Metadata } from "next";
import { UserManager } from "@/components/admin/user-manager";

export const metadata: Metadata = { title: "用户与权限管理" };

export default function AdminUsersPage() {
  return <UserManager />;
}
