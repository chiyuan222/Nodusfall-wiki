# 给 Kimi agent 的任务指令（可直接复制粘贴）

你是《源初之结》（Nodusfall）非官方玩家 Wiki + 攻略 + 论坛的**前端负责人，同时也是整体美术导向负责人**。后端由另一个 agent（Codex / Deepseek-V4-Pro）负责。请按下面的顺序开始工作，不要跳到写页面。

## 背景

- 仓库：https://github.com/chiyuan222/Nodusfall-wiki
- 你的功能分支前缀：`frontend/*`
- 你的 PR 目标分支：`develop`
- 接口契约唯一事实源：仓库根目录 `openapi.yaml`
- 后端不写页面样式；你不改后端和数据库。

## 第 1 步：先阅读（不写代码）

请完整阅读：

1. `docs/plan/03-frontend-task-plan.md`
2. `openapi.yaml`
3. `docs/plan/04-api-contract.md`
4. `docs/plan/01-roles-and-boundaries.md`
5. `KIMI_HANDOFF.md`

## 第 2 步：输出《前端审查与美术导向提案》

从“前端体验 + 美术导向”两个角度审查，输出一份 Markdown 提案，放到 `docs/design/frontend-review.md`，内容必须包含：

1. **信息架构与路由地图**：首页 / Wiki / 攻略 / 论坛 / 用户中心如何组织，是否有更合理的信息层级。
2. **美术方向**：给出 3 个视觉关键词候选（例如“冷峻星轨 / 结绳源点 / 静默神谕”），并选定 1 个主方向，说明理由。
3. **设计 token 草案**：色彩、字体、字号层级、间距、圆角、阴影、动效时长、断点。
4. **组件清单**：需要哪些基础组件（按钮、输入、卡片、标签、面包屑、分页、编辑器、评论、Toast、骨架屏等）。
5. **前端任务计划的修改建议**：逐条列出你对 `03-frontend-task-plan.md` 的增删改及理由。
6. **契约字段疑问**：只提出问题或建议，不直接改字段。例如列表接口是否应在响应里返回 `likedByMe` / `bookmarked` 等当前用户状态，以避免额外请求。

## 第 3 步：提交 PR

- 分支：`frontend/review-plan`
- 标题：`frontend: 前端审查与美术导向提案`
- 把 `docs/design/frontend-review.md` 和（如你直接修改了任务计划）`docs/plan/03-frontend-task-plan.md` 一起提交。
- PR 描述里说明你对契约的疑问，@后端 Agent。
- 视觉风格方向可附参考图或 Moodboard 链接。

## 第 4 步：待后端确认契约后再开发

在契约未冻结前，先完成设计系统和页面骨架，不依赖最终字段。契约冻结后，按 `openapi.yaml` 生成的类型和 mock 进行开发。

## 你需要注意的边界

- 不修改 `apps/api/**`、`openapi.yaml`、数据库 schema。
- 不硬编码与契约不一致的字段名。
- 不直接向 `main` / `develop` 推送，全部走 PR。
- 视觉改动必须附截图或 Storybook 链接。
- 遇到字段不够用，先提 Issue，不要自己改后端。

## 交付标准

- 页面与契约字段一致，无 mock 字段残留。
- 通过 lint / typecheck / test / build。
- 移动端优先、无障碍可访问、首屏 LCP < 2.5s。
- PR 由正确 owner review 并合并到 `develop`。
