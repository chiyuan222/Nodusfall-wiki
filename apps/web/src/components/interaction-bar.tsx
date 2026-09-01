"use client";

import { useState } from "react";
import Link from "next/link";
import { wikiApi, guidesApi, forumApi } from "@/lib/api";
import { getAccessToken } from "@/lib/session";

/**
 * 内容互动条（契约 PR #52）：浏览量 + 点赞 + 收藏。
 * - 点赞/收藏幂等 PUT/DELETE 204，前端乐观更新、失败回滚
 * - 未登录点击显示登录引导提示
 * 覆盖：Wiki 词条 / 攻略 / 论坛主题详情页。
 */

export type InteractionKind = "wiki" | "guide" | "thread";

interface Props {
  kind: InteractionKind;
  /** wiki/guide 传 slug；thread 传 threadId */
  target: string;
  viewCount: number;
  likeCount: number;
  likedByMe: boolean;
  bookmarkedByMe: boolean;
}

function toggleApi(kind: InteractionKind, action: "like" | "bookmark", on: boolean, target: string) {
  if (kind === "wiki")
    return action === "like"
      ? on ? wikiApi.like(target) : wikiApi.unlike(target)
      : on ? wikiApi.bookmark(target) : wikiApi.unbookmark(target);
  if (kind === "guide")
    return action === "like"
      ? on ? guidesApi.like(target) : guidesApi.unlike(target)
      : on ? guidesApi.bookmark(target) : guidesApi.unbookmark(target);
  return action === "like"
    ? on ? forumApi.likeThread(target) : forumApi.unlikeThread(target)
    : on ? forumApi.bookmark(target) : forumApi.unbookmark(target);
}

const baseCls =
  "flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-small transition-colors duration-fast";

export function InteractionBar({
  kind,
  target,
  viewCount,
  likeCount,
  likedByMe,
  bookmarkedByMe,
}: Props) {
  const [liked, setLiked] = useState(likedByMe);
  const [likes, setLikes] = useState(likeCount);
  const [bookmarked, setBookmarked] = useState(bookmarkedByMe);
  const [msg, setMsg] = useState("");

  const guard = (): boolean => {
    if (getAccessToken()) return true;
    setMsg("login");
    return false;
  };

  const onLike = () => {
    if (!guard()) return;
    const prev = { liked, likes };
    setLiked(!liked);
    setLikes(likes + (liked ? -1 : 1));
    setMsg("");
    toggleApi(kind, "like", !liked, target).catch(() => {
      setLiked(prev.liked);
      setLikes(prev.likes);
      setMsg("操作失败，请稍后重试。");
    });
  };

  const onBookmark = () => {
    if (!guard()) return;
    const prev = bookmarked;
    setBookmarked(!bookmarked);
    setMsg("");
    toggleApi(kind, "bookmark", !bookmarked, target).catch(() => {
      setBookmarked(prev);
      setMsg("操作失败，请稍后重试。");
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="flex items-center gap-1.5 font-mono text-caption text-faint" title="浏览量">
        <span aria-hidden>◉</span> {viewCount} 次浏览
      </span>
      <button
        type="button"
        onClick={onLike}
        aria-pressed={liked}
        className={`${baseCls} ${
          liked
            ? "border-amber-soft text-amber"
            : "border-border-subtle text-secondary hover:border-amber-soft hover:text-amber"
        }`}
      >
        <span aria-hidden>👍</span> {likes}
      </button>
      <button
        type="button"
        onClick={onBookmark}
        aria-pressed={bookmarked}
        className={`${baseCls} ${
          bookmarked
            ? "border-amber-soft text-amber"
            : "border-border-subtle text-secondary hover:border-amber-soft hover:text-amber"
        }`}
      >
        <span aria-hidden>{bookmarked ? "★" : "☆"}</span>{" "}
        {bookmarked ? "已收藏" : "收藏"}
      </button>
      {msg === "login" ? (
        <span role="status" className="text-caption text-secondary">
          <Link href="/login" className="text-amber hover:underline">登录</Link>
          后即可点赞与收藏。
        </span>
      ) : (
        msg && <span role="alert" className="text-caption text-danger">{msg}</span>
      )}
    </div>
  );
}
