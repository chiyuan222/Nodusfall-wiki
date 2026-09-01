/**
 * 作者显示名（契约 PR #45：UserSummary.status = active/deleted）。
 * 已注销账号的内容保留但匿名化，统一显示「已注销用户」。
 */
export function authorName(
  author?: { displayName: string; status?: string } | null,
): string {
  if (!author) return "未知用户";
  return author.status === "deleted" ? "已注销用户" : author.displayName;
}
