# GitHub 账号与分支权限配置

这是“给两个 Agent 设定不同 Git 分支权”的操作清单。请按顺序执行。

## 1. 创建两个独立账号（或 GitHub App）

推荐为每个 Agent 创建独立的机器账号：

| Agent | 建议账号 | 用途 |
| --- | --- | --- |
| 后端 Codex（Deepseek） | `nd-backend-bot` | 写 `apps/api`、提议契约 |
| 前端 Kimi | `nd-frontend-bot` | 写 `apps/web`、`public` |

也可以使用 **GitHub App** 代替机器账号。无论哪种，两个主体都需要对仓库具有 `Contents: Read and write` 与 `Pull requests: Read and write` 权限。

把两个账号加入仓库 Settings > Collaborators（或安装 App），并记住账号名。

## 2. 生成访问令牌

为每个 Agent 生成**细粒度 Personal Access Token**：

- Repository access：仅 `chiyuan222/Nodusfall-wiki`
- Permissions：`Contents: Read and write`、`Pull requests: Read and write`

后端 Agent 使用后端的令牌，前端 Agent 使用前端的令牌。

## 3. 替换 CODEOWNERS 并配置分支保护

拿到两个账号名后，在本地仓库执行：

```bash
gh auth login
node scripts/setup-github.mjs --backend nd-backend-bot --frontend nd-frontend-bot
```

脚本会：

1. 把 `.github/CODEOWNERS` 里的占位账号替换成真实账号。
2. 用 GitHub GraphQL API 创建分支保护规则：
   - `main`、`develop`：必须 PR、至少 1 个审批、需 Code Owner 审批、管理员也不能绕过。
   - `backend/*`：仅后端账号可直接推送。
   - `frontend/*`：仅前端账号可直接推送。
   - `contract/*`：必须 PR、双审批、两个 Agent 都可推送。

## 4. 手动复核

打开 https://github.com/chiyuan222/Nodusfall-wiki/settings/branches 逐条确认规则生效。

## 5. 提交配置变更

脚本修改了 `.github/CODEOWNERS`。用两个账号中的任意一个（或你自己）提交 PR 合并到 `develop` 和 `main`。
