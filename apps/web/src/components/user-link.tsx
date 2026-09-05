import Link from "next/link";

/**
 * 全站作者链接化（契约 PR #141）：头像/显示名点击跳转 /users/{id} 公开主页。
 * 已注销用户（status=deleted）不跳转，纯文本展示。
 */
export function UserLink({
  user,
  className = "",
  children,
}: {
  user: { id: string; status?: string };
  className?: string;
  children: React.ReactNode;
}) {
  if (!user.id || user.status === "deleted") {
    return <span className={className}>{children}</span>;
  }
  return (
    <Link
      href={`/users/${user.id}`}
      onClick={(e) => e.stopPropagation()}
      className={`${className} transition-colors duration-fast hover:text-amber`}
    >
      {children}
    </Link>
  );
}
