# 前端审查与美术导向提案

> 作者：Kimi k3（前端负责人 / 美术导向负责人）
> 状态：待后端与仓库所有者评审
> 依据：[`openapi.yaml`](../../openapi.yaml) v1.0.0、[`docs/plan/03-frontend-task-plan.md`](../plan/03-frontend-task-plan.md)、[`docs/plan/04-api-contract.md`](../plan/04-api-contract.md)、[`docs/plan/01-roles-and-boundaries.md`](../plan/01-roles-and-boundaries.md)、[`KIMI_HANDOFF.md`](../../KIMI_HANDOFF.md)
> 目标：高级质感（premium feel）——克制、精确、有呼吸感，拒绝模板化的"游戏官网风"

---

## 1. 信息架构与路由地图

### 1.1 顶层结构

站点由 4 个内容域 + 1 个账户域组成，全局导航只保留 4 个主入口（首页、Wiki、攻略、论坛），用户中心收进右上角头像菜单。移动端使用底部 Tab Bar（首页 / Wiki / 攻略 / 论坛 / 我的）。

### 1.2 路由地图（Next.js App Router）

| 路由 | 页面 | 渲染策略 | 主要数据来源（契约端点） |
| --- | --- | --- | --- |
| `/` | 首页 | ISR（60s） | `GET /wiki/pages` `GET /guides` `GET /forum/boards/*`（见 §6.4） |
| `/wiki` | Wiki 首页（分类导览） | ISR | `GET /wiki/categories` + `GET /wiki/pages` |
| `/wiki/categories/[slug]` | 分类下条目列表 | ISR | `GET /wiki/pages?category=` |
| `/wiki/[slug]` | Wiki 详情（正文 + 目录 + 评论） | ISR + CSR 评论 | `GET /wiki/pages/{slug}`、`GET /wiki/pages/{slug}/comments` |
| `/wiki/[slug]/history` | 版本历史 | SSR | `GET /wiki/pages/{slug}/revisions` |
| `/wiki/[slug]/history/[revisionId]` | 指定版本只读视图 | SSR | `GET /wiki/pages/{slug}/revisions/{revisionId}` |
| `/guides` | 攻略列表（筛选 / 排序） | SSR（随 query 变化） | `GET /guides` |
| `/guides/[slug]` | 攻略详情（评分 + 评论） | ISR + CSR | `GET /guides/{slug}`、`GET /guides/{slug}/ratings`、`GET /guides/{slug}/comments` |
| `/forum` | 板块列表 | ISR | `GET /forum/boards` |
| `/forum/[boardSlug]` | 主题列表 | SSR | `GET /forum/boards/{boardSlug}/threads` |
| `/forum/thread/[threadId]` | 主题详情（楼层） | SSR | `GET /forum/threads/{threadId}`、`GET /forum/threads/{threadId}/posts` |
| `/search` | 全局搜索 | SSR | `GET /search?q=&kind=` |
| `/login` `/register` | 登录 / 注册 | CSR | `POST /auth/sessions`、`POST /users` |
| `/me` | 用户中心总览 | CSR（需登录） | `GET /users/me` |
| `/me/guides` `/me/threads` `/me/settings` | 我的内容 / 设置 | CSR | 见 §6.5 契约疑问 |
| `/editor/wiki/new` `/editor/wiki/[slug]` | Wiki 编辑器 | CSR | `POST/PATCH /wiki/pages*` |
| `/editor/guide/new` `/editor/guide/[slug]` | 攻略编辑器 | CSR | `POST/PATCH /guides*` |
| `/forum/[boardSlug]/new` | 发帖 | CSR | `POST /forum/boards/{boardSlug}/threads` |
| `*` | 404 / 错误页 | 静态 | — |

### 1.3 组织原则

- **Wiki 与攻略分离**：Wiki 是"事实层"（条目、版本、共同维护），攻略是"观点层"（作者署名、评分、时效性），在视觉上用不同的卡片处理与详情页版式区分。
- **论坛按板块聚合**，不做跨板块信息流首页（契约当前也不支持，见 §6.4）。
- **每个详情页三段式**：内容主体 → 元信息侧栏（桌面）/折叠区（移动端）→ 评论区。
- 登录态不强求：所有浏览页面匿名可用，仅写操作（编辑、发帖、评分、点赞、收藏）触发登录引导。

---

## 2. 美术方向

### 2.1 三个视觉关键词候选

| 候选 | 气质 | 视觉手法 | 风险 |
| --- | --- | --- | --- |
| A. **冷峻星轨** | 深空、轨道线、精密仪器感 | 近黑蓝底色、细线星轨装饰、等宽数字、冷灰阶 | 容易做成泛科技模板，缺辨识度 |
| B. **结绳源点** | 绳结 / 节点母题、手工与神秘并存 | 节点-连线图形语言、织物质感噪点、暖暗色 + 琥珀高光 | 绳结图形做不好会显廉价 |
| C. **静默神谕** | 圣所、低语、石碑铭文 | 大留白、衬线标题、石刻质感、单一烛光暖色 | 阅读密度低，列表页会拖沓 |

### 2.2 选定主方向：**B. 结绳源点（Nodus Origin）**

理由：

1. **与游戏名天然绑定**：Nodus = 结 / 节点。"源初之结"给了我们一个别人拿不走的母题——节点与连线。它可以同时是装饰图形（背景中若隐若现的绳结网络）、信息图形（面包屑、目录、版本历史时间线都用"节点-连线"表达），也是交互隐喻（点赞 = 打上一个结）。
2. **避免同质化**：A 方向做出来的深空科技风与大量游戏 Wiki / 攻略站雷同；B 方向的"暗色织物 + 琥珀"在同类站点中稀缺，且天然支持"高级质感"目标——织物质感 + 精确排版本身就是奢侈品视觉的常见手法。
3. **兼容冷峻**：主色仍是深色冷底，琥珀金只做 5% 面积的点缀（强调、当前态、评分星），C 方向的大号衬线标题也被吸收进字体策略（见 §3.2），相当于取三家之长。
4. **可系统化**：节点-连线可以参数化生成（SVG），作为 favicon、加载动画、空状态插画的统一来源，不需要依赖外部图库。

辅助关键词（来自 C）：标题排版保留"神谕感"——衬线、大字号、慢动效。

### 2.3 Moodboard / 参考

- 排版与暗色质感参考：Stripe Press（`https://press.stripe.com`）的深色书籍页；Linear 官网的暗色克制配色。
- 母题图形参考：Celtic knot / 航海绳结图谱的线稿（公有领域纹样，可矢量重绘）。
- 中文排版基准：《读库》书籍排版的中文灰度控制。
- 动效节奏参考：Arc 浏览器的缓动曲线（短促、有弹性但不过弹）。

---

## 3. 设计 Token 草案

> 交付形态：CSS Custom Properties + Tailwind theme 双向同步，存放于 `apps/web/styles/tokens.css`。以下为冻结前草案，数值可能在组件落地时微调 ±10%。

### 3.1 色彩（深色为默认主题）

| Token | 值 | 用途 |
| --- | --- | --- |
| `--bg-canvas` | `#0E0D0B` | 页面最底层（近黑，带暖褐底调） |
| `--bg-surface` | `#161511` | 卡片 / 导航背景 |
| `--bg-raised` | `#1F1D18` | 悬浮层、输入框、悬停态 |
| `--border-subtle` | `#2B2820` | 分隔线、卡片描边 |
| `--text-primary` | `#EDE8DF` | 正文（米白，非纯白，降对比护眼） |
| `--text-secondary` | `#A39E92` | 次要信息 |
| `--text-faint` | `#6B675C` | 占位、时间戳 |
| `--accent-amber` | `#D9A441` | 主强调：链接悬停、评分星、当前导航 |
| `--accent-amber-soft` | `#8A6B2F` | 强调色的暗态变体（大面积标签底色） |
| `--semantic-success` | `#5F8F6A` | Toast 成功 |
| `--semantic-danger` | `#B4553F` | 删除、错误 |
| `--semantic-info` | `#5B7B9A` | 提示、Wiki 草稿标记 |

浅色主题：仅保证 token 结构可扩展（`--bg-canvas: #F5F1E8` 织物米白方向），M1 只做深色，浅色列入 P2。

### 3.2 字体与字号层级

- **中文正文**：系统字栈（`-apple-system, "PingFang SC", "Microsoft YaHei"` 等），保证零加载成本。
- **中文标题**：衬线——`"Source Han Serif SC", "Noto Serif SC", serif`，子集化自托管 woff2（只载标题常用字，< 80KB）。
- **西文 / 数字**：正文 `Inter`；数值与代码 `JetBrains Mono`（等宽数字用于评分、楼层号、版本号）。
- **代码块**：`JetBrains Mono`。

| 层级 | 字号 / 行高 | 字重 | 用途 |
| --- | --- | --- | --- |
| Display | 34px / 1.25 | Serif 600 | 详情页标题 |
| H1 | 28px / 1.3 | Serif 600 | 列表页标题 |
| H2 | 22px / 1.35 | Serif 500 | 正文小节 |
| H3 | 18px / 1.4 | Sans 600 | 卡片标题 |
| Body | 16px / 1.75 | 400 | 正文（中文 1.75 行高保证长文可读） |
| Small | 14px / 1.6 | 400 | 辅助信息、评论 |
| Caption | 12px / 1.5 | 400 | 标签、时间戳、脚注 |
| Mono | 14px | 400 | 代码、数值 |

### 3.3 间距 / 圆角 / 阴影

- 间距：4px 基线网格，刻度 `4 / 8 / 12 / 16 / 24 / 32 / 48 / 64`。
- 内容最大宽度：阅读区 `720px`，列表区 `1080px`，页面槽 `1280px`。
- 圆角：`--radius-sm: 4px`（标签、徽章）、`--radius-md: 8px`（按钮、输入、卡片）、`--radius-lg: 12px`（模态、编辑器）。不使用大圆角"胶囊卡片"。
- 阴影：深色主题弱化投影，以 `1px border-subtle` + 极淡阴影（`0 1px 2px rgba(0,0,0,.4)`）为主；悬浮层用 `0 8px 24px rgba(0,0,0,.5)`。

### 3.4 动效

| Token | 值 | 场景 |
| --- | --- | --- |
| `--dur-instant` | 100ms | 悬停变色 |
| `--dur-fast` | 180ms | 按钮、标签切换 |
| `--dur-base` | 280ms | 卡片入场、折叠展开 |
| `--dur-slow` | 450ms | 页面转场、模态 |
| `--ease-out` | `cubic-bezier(.22,.9,.28,1)` | 默认 |
| `--ease-spring` | `cubic-bezier(.34,1.3,.4,1)` | 点赞"打结"等微交互 |

全局遵守 `prefers-reduced-motion`：关闭位移动画，仅保留透明度过渡。滚动触发的位移入场一律不用（保证内容无 JS 也可见）。

### 3.5 断点（移动端优先）

| 名称 | 值 | 布局变化 |
| --- | --- | --- |
| `sm` | 0–639px | 单列，底部 Tab Bar，侧栏内容折叠进正文流 |
| `md` | 640px | 双列列表卡片开始出现 |
| `lg` | 1024px | 详情页出现右侧元信息栏，顶部导航替代 Tab Bar |
| `xl` | 1280px | 达到最大槽宽，仅留白增加 |

---

## 4. 组件清单

按三层组织，先行为后皮肤。所有组件覆盖键盘操作与 ARIA 语义。

### 4.1 基础（Atoms）

Button（primary/ghost/danger，loading 态）、IconButton、Input、Textarea、Select、Checkbox、Tag（分类 / 内容标签，可点击筛选）、Badge（状态：draft/published/archived）、Avatar（fallback 首字母）、RatingStars（1–5 星，可输入 / 只读两态）、Spinner。

### 4.2 组合（Molecules）

- **SiteHeader / BottomTabBar**：响应式双形态导航。
- **Breadcrumb**：Wiki 分类路径，节点-连线视觉（美术母题落点）。
- **Pagination**：`page/totalPages/hasMore` 对应契约 `Pagination`。
- **SearchBar**：带 `kind` 过滤（all/wiki/guide/forum），防抖 300ms。
- **ContentCard**：Wiki 卡片 / 攻略卡片 / 主题卡片三变体（excerpt、tags、author、updatedAt、攻略含 rating）。
- **EmptyState**：节点插画 + 引导操作（如"创建第一个条目"）。
- **Toast**：成功 / 错误 / 限流（读 `Retry-After` 提示"请 X 秒后重试"）。
- **Skeleton**：列表卡片与详情页正文两套骨架，尺寸与真实布局 1:1，避免 CLS。
- **Modal / Drawer**：登录引导、确认删除。
- **Dropdown**：头像菜单、排序切换。

### 4.3 业务（Organisms）

- **MarkdownRenderer**：GFM + 代码高亮 + 图片懒加载；目录（TOC）从 heading 自动生成，桌面端右侧粘性定位。
- **MarkdownEditor**：编辑 / 预览双栏（移动端 Tab 切换）、图片拖拽上传（走 `POST /uploads`）、本地草稿自动保存（localStorage，换设备前不丢稿）。
- **CommentSection**：列表 + 编辑器 + 点赞（对应 `likedByMe`）+ 分页。
- **RevisionTimeline**：版本历史，节点-连线时间线（母题落点 2）。
- **RatingPanel**：平均分 + 分布条形（对应 `RatingSummary.distribution`）+ 我的评分输入。
- **ThreadPostList**：楼层视图，楼层号用等宽数字。
- **AuthGate**：写操作前的登录提示拦截。

### 4.4 文档

Storybook（或同等组件文档页）覆盖 4.1–4.3 全部组件的三态（默认 / 悬停 / 禁用）与深浅对比截图，作为视觉回归基线。

---

## 5. 对《前端任务计划》的增删改建议

以下修改已同步落到 [`docs/plan/03-frontend-task-plan.md`](../plan/03-frontend-task-plan.md)，逐条理由如下：

1. **阶段 0 增补"设计 token 双写（CSS 变量 + Tailwind）与主题切换机制"**：避免 token 漂移出两份真相。
2. **阶段 0 增补"母题图形资产（节点-连线 SVG、favicon、空状态插画）"**：美术方向的落地载体，原计划没有覆盖。
3. **阶段 1 增补"认证会话管理（accessToken 15 分钟过期 + refreshToken 无感刷新 + 401 拦截重试）"**：契约 `AuthSession.expiresIn` 示例为 900s，这是前端必须专门处理的横切问题，原计划缺失。
4. **阶段 1 增补"RFC 7807 错误统一处理层"**：按 `code` 分支（限流读 `Retry-After`、校验错误映射到表单字段 `errors[]`），是所有请求的基础设施。
5. **阶段 2 修改"首页"**：明确首页数据为 3 个并发请求（推荐条目 / 热门攻略 / 论坛板块），并标注受契约限制暂不实现"跨板块最新动态"（见 §6.4）。
6. **阶段 3 增补"评分面板（分布条形图 + 我的评分）"**：对应 `RatingSummary`，原计划只有"评分展示"四个字。
7. **阶段 5 修改**：收藏列表、通知标注为 **Blocked（依赖契约新增端点）**，见 §6.5；草稿改为 localStorage 本地草稿（契约没有草稿列表端点，`status=draft` 是发布状态而非我的草稿箱）。
8. **阶段 6 增补"性能预算硬指标"**：LCP < 2.5s、首屏 JS ≤ 170KB（gzip）、字体子集 < 80KB、列表骨架 CLS ≈ 0。
9. **新增阶段 0.5"API 客户端与类型"**：`pnpm codegen` 生成类型 → 封装 fetch 客户端（含错误层、刷新令牌、幂等键）→ Prism mock 联调，作为所有页面阶段的前置。
10. **删除**：原计划无删除项，仅对"编辑器"补充"图片上传失败重试与 presign 流程"说明。

---

## 6. 契约字段疑问（只提问题，不改字段）

以下按优先级排列，建议在 `contract/*` 分支讨论；均为**新增可选字段 / 新端点**级别的非破坏性变更。

### 6.1【高】列表项缺当前用户状态

`ForumPost` 与 `Comment` 有 `likedByMe`，但：

- `ForumThreadSummary` 缺 `bookmarkedByMe`——主题列表要显示"已收藏"态就得逐个额外请求，N+1 不可接受。
- `Guide` / `GuideSummary` 缺我的评分（如 `myScore: 1-5 | null`）——详情页评分面板无法回显"我评了几分"，除非再维护一个查询端点。
- 建议：所有涉及用户交互状态的 Summary/Detail schema 统一加 `likedByMe` / `bookmarkedByMe` / `myScore`（匿名时固定 `false`/`null`）。

### 6.2【高】用户中心缺"我的 X"端点

阶段 5 需要：我的攻略、我的帖子（主题 + 回复）、我的收藏。当前契约只有 `GET /users/me`（资料），没有：

- `GET /users/me/guides`、`GET /users/me/threads`（或列表接口支持 `author=me` 参数）
- `GET /users/me/bookmarks`
- 临时方案可以是前端按 `author.id` 过滤，但列表接口不支持按作者过滤，等于不可用。**请后端确认是否补端点，或允许 `?author={userId}` 查询参数。**

### 6.3【中】Wiki 编辑权限规则未定义

`PATCH /wiki/pages/{slug}` 返回 403 的场景没有说明：Wiki 是"人人可编辑"还是"editor 角色以上"？这决定前端何时渲染"编辑"按钮。建议在 `WikiPage` 增加 `canEdit: boolean`（由后端按当前用户计算），前端不做角色推断，避免两端规则漂移。同理可推广到 `canDelete` / `canEdit` 于攻略、主题、评论。

### 6.4【中】首页与"最新动态"缺聚合能力

- 论坛没有跨板块"最新主题"端点（只有按板块的 `GET /forum/boards/{boardSlug}/threads`）。首页"最新论坛动态"只能：①逐板块请求（N+1）；②用 `GET /search?kind=forum` 替代（但搜索语义 ≠ 最新动态）。**建议新增 `GET /forum/threads?sort=lastPostAt` 全局列表，或确认搜索可承担此场景。**
- `ForumBoard` 建议增加 `lastPostAt` 或 `latestThread` 摘要，板块列表页可直接显示活跃度。

### 6.5【中】热度与浏览数据缺失

- "热门攻略"排序枚举只有 `rating / updatedAt / createdAt`，没有浏览量。`ForumThreadSummary` 的 `likeCount` 存在但 Wiki/Guide 列表没有 `viewCount` / `likeCount`。**问：MVP 是否接受"热门 = 评分 × 评分人数"的前端排序展示？还是希望后端补 `viewCount`？**

### 6.6【低】内容与媒体字段

- `WikiPageSummary` / `GuideSummary` 无 `coverUrl`，列表卡片只有文字；若后端暂无头图计划，前端用标签色 + 母题纹样生成卡片封面即可，**仅确认契约层面不预留**。
- `Upload` 响应无图片宽高 / 缩略图字段，Markdown 渲染无法预设 `width/height`，会有 CLS。**建议可选返回 `width` / `height`。**
- `SearchResult.url` 由后端拼接前端路由，前后端路由约定耦合；**建议改为返回 `slug` / `id`，前端自行拼路由**（或至少文档固定 url 模板）。

### 6.7【低】分页与评论

- 评论无二级回复（楼中楼），MVP 接受，仅确认。
- `GET /wiki/pages` 的 `status` 过滤对匿名用户应如何表现（匿名是否只能看到 `published`）？建议契约注明默认行为。

---

## 7. 下一步

1. 本提案评审通过后，进入阶段 0.5：搭 `apps/web` 骨架 + 设计 token + API 客户端（不依赖契约冻结，字段全部来自生成类型）。
2. 契约问题（§6.1–6.5）在 `contract/*` 分支与后端对齐后冻结 v1。
3. 视觉验收：阶段 0 结束时交付 Storybook 链接 + 首页 / Wiki 详情两页高保真截图（桌面 + 移动）。
