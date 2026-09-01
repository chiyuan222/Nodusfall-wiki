import type { Metadata } from "next";
import { RegisterForm } from "@/components/me/register-form";

export const metadata: Metadata = { title: "注册" };

export default function RegisterPage() {
  return (
    <div className="mx-auto max-w-sm py-12">
      <h1 className="text-center font-serif text-h1 font-semibold">注册</h1>
      <p className="mt-2 text-center text-small text-secondary">
        加入织者行列：编辑 Wiki、发布攻略、参与讨论
      </p>
      <RegisterForm />
    </div>
  );
}
