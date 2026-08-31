import type { Metadata } from "next";

export const metadata: Metadata = { title: "登录" };

/** 登录骨架：POST /v1/auth/sessions（grantType=password），表单逻辑在阶段 5 实现 */
export default function LoginPage() {
  return (
    <div className="mx-auto max-w-sm py-12">
      <h1 className="text-center font-serif text-h1 font-semibold">登录</h1>
      <p className="mt-2 text-center text-small text-secondary">
        登录后可编辑 Wiki、发布攻略与参与讨论
      </p>
      <form className="mt-8 space-y-4" aria-label="登录表单">
        <div>
          <label htmlFor="email" className="mb-1 block text-small text-secondary">
            邮箱
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            disabled
            className="w-full rounded-md border border-border-subtle bg-raised px-4 py-2.5 text-body text-primary disabled:opacity-50"
          />
        </div>
        <div>
          <label htmlFor="password" className="mb-1 block text-small text-secondary">
            密码
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            disabled
            className="w-full rounded-md border border-border-subtle bg-raised px-4 py-2.5 text-body text-primary disabled:opacity-50"
          />
        </div>
        <button
          type="submit"
          disabled
          className="w-full rounded-md bg-amber px-4 py-2.5 text-small font-medium text-amber-fg disabled:opacity-50"
        >
          登录（接口就绪后开放）
        </button>
      </form>
    </div>
  );
}
