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

/** 消息页全部标记已读后调用：广播事件让顶栏/Tab/底栏红点立即消失 */
export function broadcastMessagesRead() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(MESSAGES_READ_EVENT));
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
    window.addEventListener(MESSAGES_READ_EVENT, onRead);
    return () => {
      clearInterval(timer);
      window.removeEventListener(MESSAGES_READ_EVENT, onRead);
    };
  }, [refresh, pollMs]);

  return unread;
}
