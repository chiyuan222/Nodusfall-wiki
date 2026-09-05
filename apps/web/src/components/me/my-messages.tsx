"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  messageApi,
  type ConversationItem,
  type DirectMessageItem,
  type MessageItem,
  type UserSummary,
} from "@/lib/api";
import { request, type ListResult } from "@/lib/api-client";
import { ApiError } from "@/lib/errors";
import { Avatar } from "@/components/avatar";
import { useMe } from "@/lib/me";
import { broadcastMessagesRead } from "@/lib/messages";

/**
 * 我的消息（契约 PR #108 B 组）：「公告」与「私信」双页签（QQ/微信式）。
 * - 公告：卡片列表，进入页签即 read-all 并广播消除全站红点；
 *   站长在此保留「发布全站公告」入口
 * - 私信：左栏会话列表（头像/名称/最后消息摘要/时间/未读徽标，updatedAt 倒序），
 *   右栏聊天窗（气泡：自己靠右、对方靠左带头像与时间）；进入会话即 read 清未读；
 *   发送后即时刷新，无 WebSocket 时 12s 轮询新消息
 * - 普通用户仅可与站长会话（UI 明示规则；从未聊过时从公告 sender 发现站长入口）
 * - 站长可与所有用户会话，顶部「发起新会话」搜索用户（GET /admin/users?q=）
 * - 移动端窄屏：会话列表与聊天窗切换（返回按钮）
 */

const POLL_MS = 12_000;

const inputCls =
  "w-full rounded-md border border-border-subtle bg-page px-3 py-2 text-small text-primary placeholder:text-faint focus:border-amber-soft focus:outline-none";

const fmtTime = (iso: string) => {
  const d = new Date(iso);
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  return sameDay
    ? d.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })
    : d.toLocaleDateString("zh-CN", { month: "2-digit", day: "2-digit" });
};

const nameOf = (u?: UserSummary | null) =>
  u?.displayName ?? u?.username ?? "未知用户";

/* ================= 公告页签 ================= */

function AnnouncementsPane({ isOwner }: { isOwner: boolean }) {
  const [items, setItems] = useState<MessageItem[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const markedRef = useRef(false);

  // 站长公告表单
  const [announceOpen, setAnnounceOpen] = useState(false);
  const [annTitle, setAnnTitle] = useState("");
  const [annContent, setAnnContent] = useState("");
  const [annSending, setAnnSending] = useState(false);
  const [annErr, setAnnErr] = useState("");

  const load = useCallback((p: number) => {
    setLoading(true);
    setErr("");
    messageApi
      .myAnnouncements(p, 10)
      .then((r) => {
        setItems(r.data);
        setHasMore(r.pagination.hasMore);
        // 进入公告页签即全部标记已读，红点消除（只调一次）
        if (!markedRef.current) {
          markedRef.current = true;
          messageApi
            .readAllAnnouncements()
            .then(broadcastMessagesRead)
            .catch(() => {});
        }
      })
      .catch(() => setErr("公告加载失败，后端可能未在线。"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load(page);
  }, [page, load]);

  const publish = () => {
    if (!annTitle.trim() || !annContent.trim() || annSending) return;
    setAnnSending(true);
    setAnnErr("");
    messageApi
      .announce(annTitle.trim(), annContent.trim())
      .then(() => {
        setAnnTitle("");
        setAnnContent("");
        setAnnounceOpen(false);
        load(1);
        setPage(1);
      })
      .catch((e: { problem?: { detail?: string } }) =>
        setAnnErr(e?.problem?.detail ?? "发布失败，请稍后重试。"),
      )
      .finally(() => setAnnSending(false));
  };

  return (
    <div className="space-y-4">
      {isOwner && (
        <div>
          <button
            type="button"
            onClick={() => setAnnounceOpen((o) => !o)}
            className="rounded-md bg-amber px-4 py-1.5 text-small font-medium text-amber-fg transition-opacity duration-fast hover:opacity-90"
          >
            {announceOpen ? "收起公告表单" : "发布全站公告"}
          </button>
          {announceOpen && (
            <div className="mt-3 space-y-3 rounded-md border border-amber-soft/60 bg-surface p-4">
              <input
                value={annTitle}
                onChange={(e) => setAnnTitle(e.target.value)}
                maxLength={200}
                placeholder="公告标题（如：站点维护通知）"
                className={inputCls}
              />
              <textarea
                value={annContent}
                onChange={(e) => setAnnContent(e.target.value)}
                maxLength={5000}
                rows={4}
                placeholder="公告正文，将广播到所有用户的公告页签…"
                className={`${inputCls} resize-y`}
              />
              {annErr && (
                <p role="alert" className="text-caption text-danger">
                  {annErr}
                </p>
              )}
              <div className="flex justify-end">
                <button
                  type="button"
                  disabled={!annTitle.trim() || !annContent.trim() || annSending}
                  onClick={publish}
                  className="rounded-md bg-amber px-4 py-1.5 text-small font-medium text-amber-fg transition-opacity duration-fast hover:opacity-90 disabled:opacity-40"
                >
                  {annSending ? "发布中…" : "广播发布"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="rounded-md border border-border-subtle bg-surface">
        {loading ? (
          <p className="p-6 text-center text-small text-faint">载入中…</p>
        ) : err ? (
          <p role="alert" className="p-6 text-center text-small text-faint">
            {err}
          </p>
        ) : items.length === 0 ? (
          <p className="p-6 text-center text-small text-faint">暂无公告。</p>
        ) : (
          <ol className="divide-y divide-border-subtle">
            {items.map((m) => (
              <li key={m.id} className="px-5 py-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-sm border border-amber-soft/60 px-1.5 py-0.5 font-mono text-caption text-amber">
                    公告
                  </span>
                  {m.title && (
                    <span className="text-body font-medium text-primary">
                      {m.title}
                    </span>
                  )}
                  <span className="text-caption text-faint">
                    {nameOf(m.sender)}（站长） ·{" "}
                    <time className="font-mono">
                      {new Date(m.createdAt).toLocaleString("zh-CN")}
                    </time>
                  </span>
                </div>
                <p className="mt-2 whitespace-pre-wrap break-words text-small text-secondary">
                  {m.content}
                </p>
              </li>
            ))}
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
              className="rounded-md border border-border-subtle px-3 py-1.5 text-caption text-secondary hover:border-amber-soft hover:text-amber disabled:opacity-40"
            >
              下一页 →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ================= 私信页签 ================= */

interface AdminUserBrief {
  id: string;
  username: string;
  displayName?: string | null;
  avatarUrl?: string | null;
}

function DirectPane({ isOwner, myId }: { isOwner: boolean; myId: string }) {
  const [convs, setConvs] = useState<ConversationItem[]>([]);
  const [listErr, setListErr] = useState("");
  const [activePeer, setActivePeer] = useState<UserSummary | null>(null);

  // 聊天窗
  const [msgs, setMsgs] = useState<DirectMessageItem[]>([]);
  const [msgErr, setMsgErr] = useState("");
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [sendErr, setSendErr] = useState("");

  // 站长：发起新会话（用户搜索）
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [candidates, setCandidates] = useState<AdminUserBrief[]>([]);

  // 普通用户：从未聊过时，从公告 sender 发现站长作为发信入口
  const [ownerPeer, setOwnerPeer] = useState<UserSummary | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const loadConvs = useCallback(() => {
    messageApi
      .conversations(1, 50)
      .then((r) => setConvs(r.data))
      .catch(() => setListErr("会话列表加载失败，后端可能未在线。"));
  }, []);

  useEffect(() => {
    loadConvs();
  }, [loadConvs]);

  // 普通用户发现站长：取一条公告的 sender（公告仅站长可发）
  useEffect(() => {
    if (isOwner) return;
    messageApi
      .myAnnouncements(1, 1)
      .then((r) => {
        const s = r.data[0]?.sender;
        if (s && s.role?.toLowerCase() === "owner") setOwnerPeer(s);
      })
      .catch(() => {});
  }, [isOwner]);

  const loadMsgs = useCallback(
    (peerId: string, silent = false) => {
      if (!silent) setMsgErr("");
      messageApi
        .conversationMessages(peerId, 1, 50)
        .then((r) => setMsgs(r.data))
        .catch(() => {
          if (!silent) setMsgErr("私信记录加载失败。");
        });
    },
    [],
  );

  // 进入会话：加载消息 + 标记该会话已读 + 刷新会话列表未读徽标
  const openConversation = useCallback(
    (peer: UserSummary) => {
      setActivePeer(peer);
      setMsgs([]);
      setSendErr("");
      loadMsgs(peer.id);
      messageApi
        .readConversation(peer.id)
        .then(() => {
          loadConvs();
          broadcastMessagesRead();
        })
        .catch(() => {});
    },
    [loadMsgs, loadConvs],
  );

  // 轮询：会话打开时 12s 拉新消息 + 会话列表
  useEffect(() => {
    if (!activePeer) return;
    const t = setInterval(() => {
      loadMsgs(activePeer.id, true);
      loadConvs();
    }, POLL_MS);
    return () => clearInterval(t);
  }, [activePeer, loadMsgs, loadConvs]);

  // 新消息到达后滚到底部
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [msgs.length]);

  const send = () => {
    const text = draft.trim();
    if (!activePeer || !text || sending) return;
    setSending(true);
    setSendErr("");
    messageApi
      .sendConversation(activePeer.id, text)
      .then(() => {
        setDraft("");
        loadMsgs(activePeer.id, true);
        loadConvs();
      })
      .catch((e: unknown) => {
        if (e instanceof ApiError && e.status === 403) {
          setSendErr("普通用户仅可给站长发私信。");
        } else if (e instanceof ApiError && e.status === 400) {
          setSendErr(e.problem.detail ?? "内容不符合要求。");
        } else {
          setSendErr("发送失败，请稍后重试。");
        }
      })
      .finally(() => setSending(false));
  };

  // 站长搜索用户发起会话
  const searchUsers = (q: string) => {
    setQuery(q);
    if (!q.trim()) {
      setCandidates([]);
      return;
    }
    setSearching(true);
    request<ListResult<AdminUserBrief>>("/admin/users", {
      query: { q: q.trim(), perPage: 8 },
    })
      .then((r) => setCandidates(r.data.filter((u) => u.id !== myId)))
      .catch(() => setCandidates([]))
      .finally(() => setSearching(false));
  };

  // 会话列表项（普通用户无会话时展示「联系站长」入口）
  const listItems = useMemo(() => {
    if (!isOwner && convs.length === 0 && ownerPeer) {
      return [
        {
          peer: ownerPeer,
          unreadCount: 0,
          lastMessage: null,
          updatedAt: "",
        } as ConversationItem,
      ];
    }
    return convs;
  }, [isOwner, convs, ownerPeer]);

  return (
    <div className="space-y-3">
      <p className="text-caption text-faint">
        私信规则：{isOwner ? "你可以主动私信任意用户。" : "仅可与站长互发私信。"}
      </p>

      <div
        ref={listRef}
        className="overflow-hidden rounded-md border border-border-subtle bg-surface md:grid md:grid-cols-[280px_1fr]"
      >
        {/* 左栏：会话列表（窄屏在打开会话时隐藏） */}
        <div
          className={`border-border-subtle md:border-r ${
            activePeer ? "hidden md:block" : ""
          }`}
        >
          {isOwner && (
            <div className="border-b border-border-subtle p-3">
              {searchOpen ? (
                <div className="space-y-2">
                  <input
                    value={query}
                    onChange={(e) => searchUsers(e.target.value)}
                    placeholder="搜索用户名 / 昵称…"
                    className={inputCls}
                  />
                  {searching && (
                    <p className="text-caption text-faint">搜索中…</p>
                  )}
                  {candidates.length > 0 && (
                    <ul className="divide-y divide-border-subtle rounded-md border border-border-subtle">
                      {candidates.map((u) => (
                        <li key={u.id}>
                          <button
                            type="button"
                            onClick={() => {
                              openConversation(u as unknown as UserSummary);
                              setSearchOpen(false);
                              setQuery("");
                              setCandidates([]);
                            }}
                            className="flex w-full items-center gap-2 px-3 py-2 text-left transition-colors duration-fast hover:bg-raised"
                          >
                            <Avatar
                              url={u.avatarUrl}
                              name={u.displayName ?? u.username}
                              size="sm"
                            />
                            <span className="min-w-0 truncate text-small text-primary">
                              {u.displayName ?? u.username}
                              <span className="ml-1 font-mono text-caption text-faint">
                                @{u.username}
                              </span>
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setSearchOpen(false);
                      setQuery("");
                      setCandidates([]);
                    }}
                    className="text-caption text-faint hover:text-amber"
                  >
                    收起搜索
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setSearchOpen(true)}
                  className="w-full rounded-md border border-amber-soft px-3 py-1.5 text-small text-amber transition-colors duration-fast hover:bg-amber hover:text-amber-fg"
                >
                  ＋ 发起新会话
                </button>
              )}
            </div>
          )}

          {listErr ? (
            <p role="alert" className="p-4 text-center text-small text-faint">
              {listErr}
            </p>
          ) : listItems.length === 0 ? (
            <p className="p-6 text-center text-small text-faint">
              暂无私信会话。
            </p>
          ) : (
            <ul className="divide-y divide-border-subtle">
              {listItems.map((c) => {
                const active = activePeer?.id === c.peer.id;
                const name = nameOf(c.peer);
                const isPeerOwner =
                  c.peer.role?.toLowerCase() === "owner" && name !== "站长";
                const summary = c.lastMessage
                  ? `${c.lastMessage.senderId === myId ? "我：" : ""}${c.lastMessage.content}`
                  : "开始会话";
                return (
                  <li key={c.peer.id}>
                    <button
                      type="button"
                      onClick={() => openConversation(c.peer)}
                      aria-current={active}
                      className={`flex w-full items-center gap-3 border-l-2 px-4 py-3 text-left transition-colors duration-fast ${
                        active
                          ? "border-amber bg-raised"
                          : "border-transparent hover:bg-raised"
                      }`}
                    >
                      <Avatar url={c.peer.avatarUrl} name={name} size="sm" />
                      <span className="min-w-0 grow">
                        <span className="flex items-center gap-1.5">
                          <span className="truncate text-small font-medium text-primary">
                            {name}
                          </span>
                          {isPeerOwner && (
                            <span className="shrink-0 rounded-sm bg-amber/10 px-1 py-0.5 text-caption text-amber">
                              站长
                            </span>
                          )}
                        </span>
                        <span className="mt-0.5 block truncate text-caption text-faint">
                          {summary}
                        </span>
                      </span>
                      <span className="flex shrink-0 flex-col items-end gap-1">
                        {c.updatedAt && (
                          <time className="font-mono text-caption text-faint">
                            {fmtTime(c.updatedAt)}
                          </time>
                        )}
                        {c.unreadCount > 0 && (
                          <span
                            aria-label={`${c.unreadCount} 条未读`}
                            className="flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 font-mono text-[10px] leading-none text-white"
                          >
                            {c.unreadCount > 99 ? "99+" : c.unreadCount}
                          </span>
                        )}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* 右栏：聊天窗（窄屏仅打开会话时显示）；撑满与左栏等高 */}
        <div className={`${activePeer ? "" : "hidden md:flex"} min-w-0 md:flex md:flex-col`}>
          {!activePeer ? (
            <div className="flex min-h-[26rem] grow flex-col items-center justify-center gap-2 text-center">
              <span aria-hidden className="font-serif text-h1 text-faint">✉</span>
              <p className="text-small text-faint">选择左侧会话开始聊天。</p>
            </div>
          ) : (
            <div className="flex min-h-[26rem] grow flex-col">
              {/* 聊天窗头部 */}
              <div className="flex items-center gap-2 border-b border-border-subtle px-4 py-2.5">
                <button
                  type="button"
                  onClick={() => setActivePeer(null)}
                  aria-label="返回会话列表"
                  className="rounded-md border border-border-subtle bg-raised px-3 py-1.5 text-small text-secondary hover:border-amber-soft hover:text-amber md:hidden"
                >
                  ← 会话列表
                </button>
                <Avatar
                  url={activePeer.avatarUrl}
                  name={nameOf(activePeer)}
                  size="sm"
                />
                <span className="text-small font-medium text-primary">
                  {nameOf(activePeer)}
                </span>
                {activePeer.role?.toLowerCase() === "owner" &&
                  nameOf(activePeer) !== "站长" && (
                  <span className="rounded-sm bg-amber/10 px-1 py-0.5 text-caption text-amber">
                    站长
                  </span>
                )}
              </div>

              {/* 气泡区（接口倒序返回，渲染时翻转为正序） */}
              <div className="grow space-y-3 overflow-y-auto px-4 py-3">
                {msgErr ? (
                  <p role="alert" className="pt-8 text-center text-small text-faint">
                    {msgErr}
                  </p>
                ) : msgs.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
                    <span aria-hidden className="font-serif text-h2 text-faint">✉</span>
                    <p className="text-caption text-faint">
                      还没有消息，说点什么吧。
                    </p>
                  </div>
                ) : (
                  (() => {
                    const ordered = [...msgs].reverse();
                    const dayOf = (iso: string) => new Date(iso).toDateString();
                    let lastDay = "";
                    return ordered.map((m) => {
                      const fromMe = m.sender.id === myId;
                      const day = dayOf(m.createdAt);
                      const showDay = day !== lastDay;
                      lastDay = day;
                      return (
                        <div key={m.id} className="space-y-3">
                          {showDay && (
                            <div className="flex items-center gap-3 pt-1" aria-hidden>
                              <span className="h-px grow bg-border-subtle" />
                              <span className="font-mono text-caption text-faint">
                                {new Date(m.createdAt).toLocaleDateString("zh-CN", {
                                  month: "long",
                                  day: "numeric",
                                  weekday: "short",
                                })}
                              </span>
                              <span className="h-px grow bg-border-subtle" />
                            </div>
                          )}
                          <div
                            className={`flex items-end gap-2 ${fromMe ? "flex-row-reverse" : ""}`}
                          >
                            {!fromMe && (
                              <Avatar
                                url={m.sender.avatarUrl}
                                name={nameOf(m.sender)}
                                size="sm"
                              />
                            )}
                            <div
                              className={`max-w-[75%] ${fromMe ? "text-right" : ""}`}
                            >
                              <p
                                className={`inline-block whitespace-pre-wrap break-words px-3 py-2 text-left text-small shadow-sm ${
                                  fromMe
                                    ? "rounded-2xl rounded-br-sm bg-amber text-amber-fg"
                                    : "rounded-2xl rounded-bl-sm border border-border-subtle bg-raised text-primary"
                                }`}
                              >
                                {m.content}
                              </p>
                              <p className="mt-0.5 font-mono text-[10px] text-faint/80">
                                {fmtTime(m.createdAt)}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    });
                  })()
                )}
                <div ref={bottomRef} />
              </div>

              {/* 发送区 */}
              <div className="border-t border-border-subtle p-3">
                {sendErr && (
                  <p role="alert" className="mb-2 text-caption text-danger">
                    {sendErr}
                  </p>
                )}
                <div className="flex items-end gap-2">
                  <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        send();
                      }
                    }}
                    maxLength={1000}
                    rows={2}
                    placeholder="输入消息，Enter 发送（Shift+Enter 换行）…"
                    className={`${inputCls} grow resize-none`}
                  />
                  <button
                    type="button"
                    disabled={!draft.trim() || sending}
                    onClick={send}
                    className="shrink-0 rounded-md bg-amber px-4 py-2 text-small font-medium text-amber-fg transition-opacity duration-fast hover:opacity-90 disabled:opacity-40"
                  >
                    {sending ? "…" : "发送"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ================= 主面板 ================= */

export function MyMessages() {
  const { me, pending } = useMe();
  const [pane, setPane] = useState<"announcements" | "direct">("announcements");
  const isOwner = me?.role?.toLowerCase() === "owner";

  if (pending) return null;
  if (!me) {
    return (
      <p className="rounded-md border border-border-subtle bg-surface p-6 text-center text-small text-faint">
        请先 <Link href="/login" className="text-amber hover:underline">登录</Link> 后查看消息。
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div
        role="tablist"
        aria-label="消息分区"
        className="flex gap-1 rounded-md border border-border-subtle bg-surface p-1.5"
      >
        {(
          [
            { key: "announcements", label: "公告" },
            { key: "direct", label: "私信" },
          ] as const
        ).map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={pane === t.key}
            onClick={() => setPane(t.key)}
            className={`rounded-md px-4 py-1.5 text-small transition-colors duration-fast ${
              pane === t.key
                ? "bg-raised font-medium text-primary"
                : "text-secondary hover:text-amber"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {pane === "announcements" ? (
        <AnnouncementsPane isOwner={isOwner} />
      ) : (
        <DirectPane isOwner={isOwner} myId={me.id} />
      )}
    </div>
  );
}
