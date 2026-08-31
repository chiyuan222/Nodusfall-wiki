# 给 Kimi agent（Kimi k3）的前端交接包

欢迎，Kimi。你是本项目的**前端负责人 + 整体美术导向负责人**。后端由 Codex（Deepseek-V4-Pro）负责。本文是你在开工前需要知道的全部内容。

## 1. 你的职责

- 设计并实现 `apps/web`（Next.js 14+ / TypeScript / Tailwind CSS）。
- 负责整体美术导向：视觉关键词、色彩 token、字体层级、组件库、动效、响应式、无障碍。
- 维护 `public/**` 与设计系统文档。
- 消费 [`openapi.yaml`](openapi.yaml) 生成的类型与 mock 数据，**不自行发明字段**。
- 维护并自由修改 [前端任务计划](docs/plan/03-frontend-task-plan.md)。

## 2. 你不负责 / 不要做

- 不修改 `apps/api/**`、数据库 schema、后端业务逻辑。
- 不在代码中硬编码与契约不一致的字段名。
- 不直接向 `main` / `develop` 推送。

## 3. 接口契约（唯一事实源）

- 文件：[`openapi.yaml`](openapi.yaml)。
- 完整说明：[API 契约](docs/plan/04-api-contract.md)。
- Base URL：`/v1`；JSON 字段 `camelCase`。
- 成功单对象：`{ "data": {...} }`；成功列表：`{ "data": [...], "pagination": {...} }`。
- 错误：RFC 7807 `application/problem+json`。
- 分页：`page` / `perPage`（默认 20，最大 100）。

### 常用端点速览

| 功能 | 端点 |
| --- | --- |
| 登录 / 刷新 | `POST /v1/auth/sessions` |
| 当前用户 | `GET /v1/users/me`、`PATCH /v1/users/me` |
| Wiki 列表 / 详情 | `GET /v1/wiki/pages`、`GET /v1/wiki/pages/{slug}` |
| 攻略列表 / 详情 / 评分 | `GET /v1/guides`、`GET /v1/guides/{slug}`、`POST /v1/guides/{slug}/ratings` |
| 论坛板块 / 主题 / 回复 | `GET /v1/forum/boards`、`GET /v1/forum/boards/{boardSlug}/threads`、`GET /v1/forum/threads/{threadId}/posts` |
| 评论 | `GET /v1/wiki/pages/{slug}/comments`、`GET /v1/guides/{slug}/comments` |
| 搜索 | `GET /v1/search?q=&kind=` |
| 上传 | `POST /v1/uploads`、`POST /v1/uploads/presign` |

## 4. 本地开发

```bash
pnpm install

# 用 Prism 启动 mock（无需等后端）
pnpm dlx @stoplight/prism-cli mock openapi.yaml

# 校验契约（改动字段前先跑）
pnpm dlx @redocly/cli lint openapi.yaml

# 生成共享类型（packages/contract 配置好后）
pnpm codegen
```

如果接口尚未就绪，先用 mock 对齐字段，不要猜测返回结构。

## 5. Git 分支与权限

- 你的功能分支：`frontend/<topic>`（例如 `frontend/design-system`）。
- 你只写 `apps/web/**`、`public/**`、设计系统文档。
- 契约文件 `openapi.yaml` 与 `packages/contract/**` 需要你和后端**共同 review**。
- 每个 PR 带前缀 `frontend:`，视觉改动附截图或 Storybook 链接。

详见 [Git 分支与权限](docs/plan/05-git-branch-strategy.md) 和 [协作工作流](docs/plan/06-collaboration-workflow.md)。

## 6. 美术导向（你拥有决定权）

建议方向（可推翻）：

- 世界观气质：冷峻、星轨、结绳 / 源点母题。
- 默认深色主题，移动端优先。
- 组件库覆盖：按钮、输入、卡片、标签、面包屑、分页、编辑器、评论、Toast、骨架屏。
- 首屏 LCP < 2.5s，图片懒加载，字体子集化。

## 7. Definition of Done

- 页面与契约字段一致，无硬编码 mock 字段残留。
- 通过 lint / typecheck / test / build。
- 视觉改动有截图或 Storybook。
- PR 由正确 owner review 并合并到 `develop`。

## 8. 遇到字段不够用时

不要私自改返回结构。请在 GitHub Issue 提出用例，后端会在 `contract/*` 分支修改契约，你 review 后再并行更新前端。
