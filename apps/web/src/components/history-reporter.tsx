"use client";

import { useEffect } from "react";
import { request } from "@/lib/api-client";
import { getAccessToken } from "@/lib/session";

/**
 * 浏览记录上报（契约 PR #45）：详情页挂载时登录用户 POST /users/me/history 一次。
 * 静默失败（未登录/后端离线/内容不存在都不影响页面）。
 */
export function HistoryReporter({
  kind,
  slug,
}: {
  kind: "wikiPage" | "guide" | "forumThread";
  /** wiki/guide 传 slug；forumThread 传 threadId */
  slug: string;
}) {
  useEffect(() => {
    if (!getAccessToken()) return;
    request("/users/me/history", {
      method: "POST",
      body: { kind, slug },
    }).catch(() => undefined);
  }, [kind, slug]);

  return null;
}
