/**
 * 用户身份标识（契约 PR #51：UserSummary 必填 group/level；status 含 muted/banned）。
 * 全站统一：名字旁的 用户组 + 等级 徽章、禁言/封禁受限标识。
 */

const GROUP_LABEL: Record<string, string> = {
  normal: "普通",
  verified: "认证",
  premium: "付费",
};

/** 用户组 + 等级徽章（如「认证 · Lv.3」）；字段缺失时不渲染 */
export function UserGroupBadge({
  group,
  level,
}: {
  group?: string;
  level?: number;
}) {
  if (!group && level === undefined) return null;
  return (
    <span className="shrink-0 rounded-sm border border-border-subtle px-1.5 py-0.5 font-mono text-caption text-faint">
      {group ? (GROUP_LABEL[group] ?? group) : ""}
      {level !== undefined && ` Lv.${level}`}
    </span>
  );
}

/** 受限状态标识：禁言 / 封禁（deleted 由 authorName 处理为「已注销用户」） */
export function UserStatusMark({ status }: { status?: string }) {
  if (status === "muted")
    return (
      <span className="shrink-0 rounded-sm border border-border-subtle px-1.5 py-0.5 font-mono text-caption text-faint">
        禁言中
      </span>
    );
  if (status === "banned")
    return (
      <span className="shrink-0 rounded-sm border border-danger/60 px-1.5 py-0.5 font-mono text-caption text-danger">
        已封禁
      </span>
    );
  return null;
}
