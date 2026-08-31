"use client";

/**
 * 页面 CMS 读写助手（/admin/home 与 /admin/world 编辑器共用）。
 *
 * 契约（openapi.yaml）：
 * - 读：GET  /content/pages/{slug}        → { data: HomePageContent | WorldPageContent }
 * - 写：PUT  /admin/content/pages/{slug} → 请求体即内容对象本身，需管理员 Bearer
 *
 * 读策略：接口优先；接口不可用时回退 public/content/*.json 本地兜底文件。
 */

import { request } from "@/lib/api-client";
import { ApiError } from "@/lib/errors";

export type CmsSlug = "home" | "world";

export type LoadSource = "api" | "file";

export interface CmsLoadResult<T> {
  data: T;
  source: LoadSource;
}

export async function loadCmsPage<T>(
  slug: CmsSlug,
  fallbackPath: string,
): Promise<CmsLoadResult<T>> {
  try {
    const res = await request<{ data: T }>(`/content/pages/${slug}`, {
      auth: false,
    });
    if (res && typeof res === "object" && res.data) {
      return { data: res.data, source: "api" };
    }
  } catch {
    // 接口不可用 → 回退本地文件
  }
  const r = await fetch(fallbackPath, { cache: "no-store" });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return { data: (await r.json()) as T, source: "file" };
}

export async function saveCmsPage<T>(slug: CmsSlug, draft: T): Promise<void> {
  await request(`/admin/content/pages/${slug}`, { method: "PUT", body: draft });
}

/** 把保存异常翻译成管理员可操作的提示 */
export function describeSaveError(e: unknown): string {
  if (e instanceof ApiError) {
    if (e.status === 401)
      return "未登录或会话已失效：请先在 /login 登录管理员账号后再保存。";
    if (e.status === 403)
      return "当前账号没有管理员权限（需要 ADMIN 角色）。";
    if (e.status === 400)
      return `保存被校验拒绝：${e.problem.detail ?? e.problem.title}`;
    return `保存失败（HTTP ${e.status}）：${e.problem.title}`;
  }
  return "无法连接后端，保存未生效。仍可用「下载 JSON」走本地兜底流程。";
}
