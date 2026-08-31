# Git 分支与权限

## 1. 分支模型

| 分支 | 用途 | 直接推送 |
| --- | --- | --- |
| `main` | 可发布的生产代码 | 禁止 |
| `develop` | 集成分支 | 禁止（通过 PR 合并） |
| `backend/*` | 后端 Agent 的功能 / 修复分支 | 仅后端 Agent |
| `frontend/*` | 前端 Agent 的功能 / 修复分支 | 仅前端 Agent |
| `contract/*` | 契约与共享类型变更 | 双审后合并 |
| `docs/*` | 文档变更 | 按内容归属 |

分支命名示例：

```text
backend/auth-jwt
backend/wiki-revisions
frontend/design-system
frontend/wiki-detail
contract/v1-wiki-page-fields
```

## 2. 目录所有权矩阵

| 路径 | 后端可写 | 前端可写 | 备注 |
| --- | --- | --- | --- |
| `apps/api/**` | ✅ | ❌ | 后端独占 |
| `apps/web/**`、`public/**` | ❌ | ✅ | 前端独占 |
| `openapi.yaml`、`packages/contract/**` | 提议 | 提议 | 双审 |
| `docs/plan/02-backend-task-plan.md` | ✅ | ❌ | 后端维护 |
| `docs/plan/03-frontend-task-plan.md` | ❌ | ✅ | 前端审查修改 |
| `.github/**`、根配置 | 提议 | 提议 | 所有者统筹 |

## 3. GitHub 分支保护（建议配置）

### `main` 与 `develop`

- Require a pull request before merging。
- Require approvals（至少 1 个，契约变更至少 2 个）。
- Dismiss stale approvals。
- Require status checks（lint / typecheck / test / build / contract check）。
- Do not allow bypassing。

### `backend/*` 与 `frontend/*`

- 使用 `Restrict who can push to matching branches`，只允许对应 Agent 的机器账号推送。
- 可选：对 `backend/*` 限制前端账号，对 `frontend/*` 限制后端账号。

### `contract/*`

- 必须 PR + 双审（后端 Agent + 前端 Agent）。
- 必须通过 OpenAPI lint 校验。

## 4. Agent 账号与令牌

建议为每个 Agent 创建独立 GitHub 机器账号（或 GitHub App），而不是共享你的个人令牌：

| Agent | 建议账号 | 权限范围 |
| --- | --- | --- |
| 后端 | `nd-backend-bot` | 仓库 `contents:write`、`pull_requests:write` |
| 前端 | `nd-frontend-bot` | 仓库 `contents:write`、`pull_requests:write` |

GitHub App 可按仓库授予更细权限，并可在分支保护中作为可推送主体。

## 5. 冲突预防规则

- 一个 PR 只改一个所有权区域。
- 共享文件（契约、CI、根配置）单独开 `contract/*` 或 `docs/*` PR。
- 合并前先同步 `develop`，解决冲突后由相应所有者 review。
- 禁止把生成物（`dist/`、`.next/`、`packages/contract/generated/`）提交进仓库；由 CI 生成或使用发布产物。
