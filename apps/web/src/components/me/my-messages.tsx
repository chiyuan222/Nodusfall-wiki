"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { messageApi, type MessageItem } from "@/lib/api";
import { useMe } from "@/lib/me";
import { broadcastMessagesRead } from "@/lib/messages";
import { getAccessToken } from "@/lib/session";

/**
 * 我的消息（契约 PR #59）：私信 + 全站公告，时间倒序分页。
 * - 进入面板即 POST read-all 并广播事件消除全站红点
 * - 公告：标题 + 「公告」徽标 + 站长署名
 * - 私信：支持回复（recipientId = 对方 id）；普通用户可从公告/私信 sender 发现站长 id 发起私信
 * - 站长（owner）额外拥有「发布全站公告」表单（POST /admin/announcements）
 * 后端未上线时显示提示，不使用任何 mock 字段。
 */

export function MyMessages() {
  const { me, pending } = useMe();
  const [items, setItems] = useState<MessageItem[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const markedRef = useRef(false);

  // 回复/私信目标：null = 收起；{ id, name } = 待发私信对象
  const [dmTarget, setDmTarget] = useState<{ id: string; name: string } | null>(null);
  const [dmText, setDmText] = useState("");
  const [sending, setSending] = useState(false);
  const [sendErr, setSendErr] = useState("");

  // 站长公告表单
  const [announceOpen, setAnnounceOpen] = useState(false);
  const [annTitle, setAnnTitle] = useState("");
  const [annContent, setAnnContent] = useState("");
  const [annSending, setAnnSending] = useState(false);
  const [annErr, setAnnErr] = useState("");

  const isOwner = me?.role?.toLowerCase() === "owner";

  const load = useCallback((p: number) => {
    setLoading(true);
    setErr("");
    messageApi
      .list(p, 15)
      .then((r) => {
        setItems(r.data);
        setHasMore(r.pagination.hasMore);
        // 首次成功载入后全部标记已读并消除红点（只调一次）
        if (!markedRef.current) {
          markedRef.current = true;
          messageApi
            .readAll()
            .then(broadcastMessagesRead)
            .catch(() => {});
        }
      })
      .catch(() => setErr("消息加载失败，后端消息服务可能尚未上线。"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (getAccessToken()) load(page);
  }, [page, load]);

  // 站长 id 发现：优先取私信/公告 sender 中的 owner（契约冻结备注 #2，待后端别名支持）
  const ownerBrief = useMemo(() => {
    const hit = items.find((m) => m.sender?.role?.toLowerCase() === "owner");
    return hit ? { id: hit.sender.id, name: hit.sender.displayName ?? hit.sender.username } : null;
  }, [items]);

  if (pending) return null;
  if (!me) {
    return (
      <p className="rounded-md border border-border-subtle bg-surface p-6 text-center text-small text-faint">
        请先 <Link href="/login" className="text-amber hover:underline">登录</Link> 后查看消息。
      </p>
    );
  }

  const sendDm = () => {
    if (!dmTarget || !dmText.trim() || sending) return;
    setSending(true);
    setSendErr("");
    messageApi
      .send(dmTarget.id, dmText.trim())
      .then((msg) => {
        setItems((prev) => [msg, ...prev]);
        setDmText("");
        setDmTarget(null);
      })
      .catch((e: { problem?: { detail?: string } }) =>
        setSendErr(e?.problem?.detail ?? "发送失败，请稍后重试。"),
      )
      .finally(() => setSending(false));
  };

  const publishAnnouncement = () => {
    if (!annTitle.trim() || !annContent.trim() || annSending) return;
    setAnnSending(true);
    setAnnErr("");
    messageApi
      .announce(annTitle.trim(), annContent.trim())
      .then((msg) => {
        setItems((prev) => [msg, ...prev]);
        setAnnTitle("");
        setAnnContent("");
        setAnnounceOpen(false);
      })
      .catch((e: { problem?: { detail?: string } }) =>
        setAnnErr(e?.problem?.detail ?? "发布失败，请稍后重试。"),
      )
      .finally(() => setAnnSending(false));
  };

  return (
    <div className="space-y-4">
      {/* 操作区：站长发公告 / 普通用户私信站长 */}
      <div className="flex flex-wrap items-center gap-2">
        {isOwner ? (
          <button
            type="button"
            onClick={() => setAnnounceOpen((o) => !o)}
            className="rounded-md bg-amber px-4 py-1.5 text-small font-medium text-amber-fg transition-opacity duration-fast hover:opacity-90"
          >
            {announceOpen ? "收起公告表单" : "发布全站公告"}
          </button>
        ) : ownerBrief ? (
          <button
            type="button"
            onClick={() => setDmTarget(dmTarget ? null : ownerBrief)}
            className="rounded-md bg-amber px-4 py-1.5 text-small font-medium text-amber-fg transition-opacity duration-fast hover:opacity-90"
          >
            {dmTarget ? "收起私信" : `私信站长（${ownerBrief.name}）`}
          </button>
        ) : (
          <p className="text-caption text-faint">
            收到站长公告或私信后，即可直接回复站长。
          </p>
        )}
        <p className="text-caption text-faint">私信仅限用户与站长之间，全站公告由站长发布</p>
      </div>

      {/* 公告表单（仅站长） */}
      {isOwner && announceOpen && (
        <div className="space-y-3 rounded-md border border-amber-soft/60 bg-surface p-4">
          <input
            value={annTitle}
            onChange={(e) => setAnnTitle(e.target.value)}
            maxLength={200}
            placeholder="公告标题（如：站点维护通知）"
            className="w-full rounded-md border border-border-subtle bg-page px-3 py-2 text-small text-primary placeholder:text-faint focus:border-amber-soft focus:outline-none"
          />
          <textarea
            value={annContent}
            onChange={(e) => setAnnContent(e.target.value)}
            maxLength={5000}
            rows={4}
            placeholder="公告正文，将广播到所有用户的收件箱…"
            className="w-full resize-y rounded-md border border-border-subtle bg-page px-3 py-2 text-small text-primary placeholder:text-faint focus:border-amber-soft focus:outline-none"
          />
          {annErr && <p role="alert" className="text-caption text-danger">{annErr}</p>}
          <div className="flex justify-end">
            <button
              type="button"
              disabled={!annTitle.trim() || !annContent.trim() || annSending}
              onClick={publishAnnouncement}
              className="rounded-md bg-amber px-4 py-1.5 text-small font-medium text-amber-fg transition-opacity duration-fast hover:opacity-90 disabled:opacity-40"
            >
              {annSending ? "发布中…" : "广播发布"}
            </button>
          </div>
        </div>
      )}

      {/* 私信输入框 */}
      {dmTarget && (
        <div className="space-y-2 rounded-md border border-border-subtle bg-surface p-4">
          <p className="text-caption text-faint">
            发往 <span className="text-amber">{dmTarget.name}</span>
          </p>
          <textarea
            value={dmText}
            onChange={(e) => setDmText(e.target.value)}
            maxLength={2000}
            rows={3}
            placeholder="写下想说的话…"
            className="w-full resize-y rounded-md border border-border-subtle bg-page px-3 py-2 text-small text-primary placeholder:text-faint focus:border-amber-soft focus:outline-none"
          />
          {sendErr && <p role="alert" className="text-caption text-danger">{sendErr}</p>}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setDmTarget(null)}
              className="rounded-md border border-border-subtle px-3 py-1.5 text-small text-secondary hover:border-amber-soft hover:text-amber"
            >
              取消
            </button>
            <button
              type="button"
              disabled={!dmText.trim() || sending}
              onClick={sendDm}
              className="rounded-md bg-amber px-4 py-1.5 text-small font-medium text-amber-fg transition-opacity duration-fast hover:opacity-90 disabled:opacity-40"
            >
              {sending ? "发送中…" : "发送"}
            </button>
          </div>
        </div>
      )}

      {/* 消息列表 */}
      <div className="rounded-md border border-border-subtle bg-surface">
        {loading ? (
          <p className="p-6 text-center text-small text-faint">载入中…</p>
        ) : err ? (
          <p role="alert" className="p-6 text-center text-small text-faint">{err}</p>
        ) : items.length === 0 ? (
          <p className="p-6 text-center text-small text-faint">
            暂无消息。站长的公告和私信会出现在这里。
          </p>
        ) : (
          <ol className="divide-y divide-border-subtle">
            {items.map((m) => {
              const unread = !m.readAt;
              const fromMe = m.sender?.id === me.id;
              const senderName = m.sender?.displayName ?? m.sender?.username ?? "未知用户";
              const senderIsOwner = m.sender?.role?.toLowerCase() === "owner";
              return (
                <li key={m.id} className="px-5 py-4">
                  <div className="flex items-start gap-3">
                    {/* 未读圆点 */}
                    <span
                      aria-hidden
                      className={`mt-2 h-2 w-2 shrink-0 rounded-full ${unread ? "bg-amber" : "bg-transparent"}`}
                    />
                    <div className="min-w-0 grow">
                      <div className="flex flex-wrap items-center gap-2">
                        {m.kind === "announcement" ? (
                          <span className="rounded-sm border border-amber-soft/60 px-1.5 py-0.5 font-mono text-caption text-amber">
                            公告
                          </span>
                        ) : (
                          <span className="rounded-sm border border-border-subtle px-1.5 py-0.5 font-mono text-caption text-secondary">
                            {fromMe ? "我发出的" : "私信"}
                          </span>
                        )}
                        <span className="text-small font-medium text-primary">
                          {senderName}
                        </span>
                        {senderIsOwner && (
                          <span className="rounded-sm bg-amber/10 px-1.5 py-0.5 text-caption text-amber">
                            站长
                          </span>
                        )}
                        <time className="font-mono text-caption text-faint">
                          {new Date(m.createdAt).toLocaleString("zh-CN")}
                        </time>
                      </div>
                      {m.kind === "announcement" && m.title && (
                        <p className="mt-1.5 text-body font-medium text-primary">{m.title}</p>
                      )}
                      <p className="mt-1 whitespace-pre-wrap break-words text-small text-secondary">
                        {m.content}
                      </p>
                      {/* 回复入口：他人发来的私信可回复 */}
                      {m.kind === "direct" && !fromMe && m.sender?.id && (
                        <button
                          type="button"
                          onClick={() => {
                            setDmTarget({ id: m.sender.id, name: senderName });
                            setDmText("");
                            setSendErr("");
                          }}
                          className="mt-2 rounded-sm border border-border-subtle px-2.5 py-1 text-caption text-secondary transition-colors duration-fast hover:border-amber-soft hover:text-amber"
                        >
                          回复
                        </button>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        )}

        {(page > 1 || hasMore) && (
          <div className="flex items-center justify-between border-t border-border-subtle px-5 py-3">
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => p - 1)}
              className="rounded-md border border-border-subtle px-3 py-1 text-caption text-secondary hover:border-amber-soft hover:text-amber disabled:opacity-40"
            >
              ← 上一页
            </button>
            <span className="font-mono text-caption text-faint">第 {page} 页</span>
            <button
              type="button"
              disabled={!hasMore || loading}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-md border border-border-subtle px-3 py-1 text-caption text-secondary hover:border-amber-soft hover:text-amber disabled:opacity-40"
            >
              下一页 →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
