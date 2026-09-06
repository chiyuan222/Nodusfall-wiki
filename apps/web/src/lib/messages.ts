"use client";

import { useCallback, useEffect, useState } from "react";
import { messageApi } from "./api";
import { getAccessToken } from "./session";

/**
 * 未读消息红点共享钩子（契约 PR #59）。
 * - 登录后轮询 GET /users/me/messages/unread-count（默认 30s）
 * - 进入消息页后由 MyMessages 派发 MESSAGES_READ_EVENT，全站红点即时清零
 *   （不等下一次轮询）
 * - 未登录固定为 0
 */

export const MESSAGES_READ_EVENT = "nodus:messages-read";

/** 删除私信/公告后未读数变化但未必清零：派发此事件让红点重新拉取 */
export const MESSAGES_REFRESH_EVENT = "nodus:messages-refresh";

/** 消息页全部标记已读后调用：广播事件让顶栏/Tab/底栏红点立即消失 */
export function broadcastMessagesRead() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(MESSAGES_READ_EVENT));
  }
}

/** 删除私信会话/公告后调用：广播事件让红点立即重新拉取真实未读数 */
export function broadcastMessagesRefresh() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(MESSAGES_REFRESH_EVENT));
  }
}

export function useUnreadMessages(pollMs = 30_000): number {
  const [unread, setUnread] = useState(0);

  const refresh = useCallback(() => {
    if (!getAccessToken()) {
      setUnread(0);
      return;
    }
    messageApi
      .unreadCount()
      .then(setUnread)
      .catch(() => {
        /* 后端离线/未实现时静默，不打断页面 */
      });
  }, []);

  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, pollMs);
    const onRead = () => setUnread(0);
    const onRefresh = () => refresh();
    window.addEventListener(MESSAGES_READ_EVENT, onRead);
    window.addEventListener(MESSAGES_REFRESH_EVENT, onRefresh);
    return () => {
      clearInterval(timer);
      window.removeEventListener(MESSAGES_READ_EVENT, onRead);
      window.removeEventListener(MESSAGES_REFRESH_EVENT, onRefresh);
    };
  }, [refresh, pollMs]);

  return unread;
}
