import type { Metadata } from "next";
import { LoginForm } from "@/components/me/login-form";

export const metadata: Metadata = { title: "登录" };

export default function LoginPage() {
  return (
    <div className="mx-auto max-w-sm py-12">
      <h1 className="text-center font-serif text-h1 font-semibold">登录</h1>
      <p className="mt-2 text-center text-small text-secondary">
        登录后可编辑 Wiki、发布攻略与参与讨论
      </p>
      <LoginForm />
    </div>
  );
}
