# Nodusfall Wiki（源初之结·玩家共建站）

《源初之结》（Nodusfall）的非官方玩家 Wiki + 攻略 + 论坛站点。

> 免责声明：本项目为玩家自发组织的粉丝项目，与米哈游及其关联方无任何从属、代言或授权关系。游戏名称、角色、素材等权利归其各自权利人所有。本站内容仅基于公开资料与玩家经验整理，请勿上传内测保密信息。

## 项目目标

1. 可检索、可协作编辑的游戏 Wiki（角色 / 装备 / 地图 / 机制 / 版本）。
2. 玩家攻略（配队、养成、副本、活动）与评分体系。
3. 轻量社区论坛（板块、主题、回帖、点赞、收藏、举报与审核）。
4. 前端、后端通过一份可执行的 API 契约解耦开发。

## 技术栈

| 层 | 选型 | 说明 |
| --- | --- | --- |
| 前端 | Next.js 14+（App Router）+ TypeScript + Tailwind CSS | SSR/ISR 利于 SEO；Kimi k3 负责实现与美术导向 |
| 后端 | NestJS 10+ + TypeScript | Deepseek-V4-Pro 负责实现 |
| 契约 | OpenAPI 3.1 + 共享 Zod schema + 生成 TypeScript 类型 | 前后端共同遵守 |
| 数据库 | PostgreSQL | 结构化内容、事务 |
| 缓存/会话 | Redis | 会话、限流、热点缓存 |
| 对象存储 | S3 兼容存储 | 图片、附件 |
| 仓库 | pnpm workspace + Turborepo | monorepo |

## 文档索引

- [给 Kimi agent 的前端交接包](KIMI_HANDOFF.md)
- [对接 Kimi 的任务指令（可直接复制）](KIMI_PROMPT.md)
- [总体方案](docs/plan/00-overview.md)
- [角色与边界](docs/plan/01-roles-and-boundaries.md)
- [后端任务计划](docs/plan/02-backend-task-plan.md)
- [前端任务计划（含美术导向，待 Kimi 审查）](docs/plan/03-frontend-task-plan.md)
- [API 契约](docs/plan/04-api-contract.md)
- [Git 分支与权限](docs/plan/05-git-branch-strategy.md)
- [协作工作流](docs/plan/06-collaboration-workflow.md)
- [架构决策记录（ADR）](docs/adr/README.md)

## 契约

接口单一事实源：[openapi.yaml](openapi.yaml)。

任何前后端字段变更都必须先修改 `openapi.yaml`，并在 `contract/*` 分支提交 PR，由两个 Agent 共同 review 后方可合并。

## 目录所有权

| 目录 | 所有者 |
| --- | --- |
| `apps/api/**` | 后端 Agent |
| `apps/web/**`、设计系统与美术资产 | 前端 Agent |
| `openapi.yaml`、`packages/contract/**` | 后端 Agent + 前端 Agent（双审） |
| `docs/**`、`.github/**`、根配置 | 仓库所有者统筹，两个 Agent 均可提 PR |

详见 [角色与边界](docs/plan/01-roles-and-boundaries.md)。

## 本地开发

```bash
pnpm install
pnpm dev
```

（应用子包会在对应 Agent 首次任务中补齐具体启动脚本。）
