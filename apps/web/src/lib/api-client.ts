/**
 * API 客户端核心。
 *
 * 契约约定（docs/plan/04-api-contract.md §2）：
 * - Base URL：/v1；成功单对象 { data }，列表 { data, pagination }
 * - 错误：RFC 7807 application/problem+json
 * - 认证：Authorization: Bearer <accessToken>
 * - 写操作支持可选 Idempotency-Key
 *
 * 行为：
 * - 401 时用 refreshToken 无感刷新一次并重试原请求
 * - 429 时从 Retry-After 头提取等待秒数，挂到 ApiError.retryAfter
 * - 非 2xx 一律抛 ApiError；非 JSON / 网络错误走 fallbackProblem 兜底
 */

import { ApiError, fallbackProblem, type ProblemDetails } from "./errors";
import {
  clearSession,
  getStoredSession,
  getAccessToken,
  saveSession,
} from "./session";
import type { paths } from "./schema";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:4000/v1";

export interface Pagination {
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

export interface ListResult<T> {
  data: T[];
  pagination: Pagination;
}

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

interface RequestOptions {
  method?: HttpMethod;
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
  /** 默认自动附带 accessToken（若已登录） */
  auth?: boolean;
  /** 写操作幂等键；不传则自动生成 UUID */
  idempotencyKey?: string;
  /** 内部分页标记：已经历过一次刷新重试 */
  _retried?: boolean;
}

let refreshPromise: Promise<boolean> | null = null;

/** 刷新 accessToken；并发请求共享同一次刷新 */
async function refreshAccessToken(): Promise<boolean> {
  refreshPromise ??= doRefresh().finally(() => {
    refreshPromise = null;
  });
  return refreshPromise;
}

async function doRefresh(): Promise<boolean> {
  const stored = getStoredSession();
  if (!stored?.refreshToken) return false;
  try {
    const res = await fetch(`${API_BASE_URL}/auth/sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grantType: "refreshToken",
        refreshToken: stored.refreshToken,
      }),
    });
    if (!res.ok) {
      clearSession();
      return false;
    }
    const json = (await res.json()) as {
      data: {
        accessToken: string;
        refreshToken: string;
        sessionId: string;
        expiresIn: number;
      };
    };
    saveSession(json.data);
    return true;
  } catch {
    return false;
  }
}

/** 解析 problem+json 错误响应 */
async function parseError(res: Response): Promise<ApiError> {
  const retryAfterHeader = res.headers.get("Retry-After");
  const retryAfter = retryAfterHeader ? Number(retryAfterHeader) : undefined;
  try {
    const problem = (await res.json()) as ProblemDetails;
    return new ApiError(
      { ...problem, status: problem.status ?? res.status },
      retryAfter,
    );
  } catch {
    return new ApiError(
      fallbackProblem(res.status, `HTTP ${res.status}`),
      retryAfter,
    );
  }
}

export async function request<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { method = "GET", body, query, auth = true, _retried } = options;

  const url = new URL(`${API_BASE_URL}${path}`);
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }

  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (auth) {
    const token = getAccessToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }
  if (method !== "GET") {
    headers["Idempotency-Key"] =
      options.idempotencyKey ?? crypto.randomUUID();
  }

  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      // Next 14 服务端组件的 fetch 默认进 Data Cache；内容型站点必须每次直读后端，
      // 否则编辑/评论后详情页会展示过期数据（客户端调用不受影响）
      cache: "no-store",
    });
  } catch {
    throw new ApiError(fallbackProblem(0, "网络连接失败，请稍后重试"));
  }

  // 401：尝试刷新令牌后重试一次
  if (res.status === 401 && auth && !_retried) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      return request<T>(path, { ...options, _retried: true });
    }
  }

  if (res.status === 204) return undefined as T;
  if (!res.ok) throw await parseError(res);

  return (await res.json()) as T;
}

/** 登录（grantType=password），成功后持久化会话 */
export async function login(
  email: string,
  password: string,
): Promise<void> {
  const res = await request<{
    data: {
      accessToken: string;
      refreshToken: string;
      sessionId: string;
      expiresIn: number;
    };
  }>("/auth/sessions", {
    method: "POST",
    auth: false,
    body: { grantType: "password", email, password },
  });
  saveSession(res.data);
}

/** 登出：撤销服务端会话并清空本地 */
export async function logout(): Promise<void> {
  const stored = getStoredSession();
  if (stored?.sessionId) {
    try {
      await request(`/auth/sessions/${stored.sessionId}`, { method: "DELETE" });
    } catch {
      // 撤销失败不阻塞本地登出
    }
  }
  clearSession();
}

// ---------------------------------------------------------------------------
// 资源类型：由 `pnpm codegen` 从 openapi.yaml 生成（src/lib/schema.d.ts）
// 在 packages/contract 就绪前，此处为前端的唯一类型来源；不手写字段。
// ---------------------------------------------------------------------------

export type { paths };
