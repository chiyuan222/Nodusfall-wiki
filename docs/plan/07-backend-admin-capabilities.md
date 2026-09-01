# 阶段计划：后台管理能力（Kimi → DS 交接）

> 存档时间：2026-09-01　阶段负责人：DS（后端）+ Kimi（前端）
> 流程：contract/* PR → Kimi 确认 → 后端实现 → 前端管理页 → 联调

## 目标

补齐网站后台管理能力，让站长可在管理界面持久化配置内容：板块/分类、精华/置顶、
内容状态、首页/总览页 CMS 扩展。

## 需求清单（按 Kimi 交接原文整理，含现状核对结论）

### 1. 板块与分类管理

- 论坛板块 CRUD：`POST/PATCH/DELETE /admin/forum/boards(/{slug})` —— ✅ 已存在（PR #30），
  管理员 403、非空删除 409
- Wiki 分类 CRUD：`POST/PATCH/DELETE /admin/wiki/categories(/{slug})` —— ✅ 已存在
- 攻略分类：攻略无独立分类体系（使用 tags），本期不新增

### 2. 内容管理

- 精华/置顶标记：
  - Guide：`featured` / `featuredAt`（UpdateGuideRequest）✅ 已声明
  - ForumThread：`pinned` / `locked` / `featured` / `featuredAt`（UpdateForumThreadRequest）✅ 已声明
  - WikiPage：`featured` / `featuredAt` 后端已实现、契约漏声明 → 本期补契约
- 内容状态 draft/published/archived：Wiki/Guide Update 请求已支持 ✅
- 内容写权限：现状 PATCH 未校验作者/管理员（任何登录用户可改任意内容）→
  本期实现「作者或 ADMIN」校验，越权 403

### 3. 页面 CMS 扩展（在现有 home/world CMS 基础上）

后端持久化已存在：`GET /content/pages/{slug}` + `PUT /admin/content/pages/{slug}`
（管理员）；后端原样存储 JSON，结构由契约 schema 约束（前端 codegen）。

- 首页轮替框 5 槽（图/视频）：现有 HomeHero.media 为单媒体 → 本期契约新增 `slides` 数组
- 首页「最新动态/精华推荐」双栏：前端已接 `/home/digest` 自动聚合（PR #40）；
  本期契约新增 `HomeDigestColumn.mode`（auto/manual），manual 时使用手填 items
- 总览页分栏：hero/overview/worldview/gameplay/official/reposts/news 已结构化，
  每栏媒体支持图/视频（MediaSlot）✅
- 官方渠道区：WorldOfficial.links 已有 label/url/desc → 本期契约新增 `iconKey`
  （支持 official/bilibili/douyin 等）
- 官方信息转载栏：WorldReposts ✅ 已存在

## 契约变更清单（contract/* PR）

1. `UpdateWikiPageRequest` 增加 `featured` / `featuredAt`
2. `HomeHero` 增加 `slides`（轮替数组，5 槽：{ media, title?, linkKind?, linkTarget? }），保留 media 兼容
3. `HomeDigestColumn` 增加 `mode: enum [auto, manual]`
4. `WorldOfficialLink` 增加 `iconKey`
5. 内容写操作（wiki/guides/forum PATCH）权限注明「作者或 ADMIN，越权 403」

## 约束

- 不动用户中心/认证/评论契约（#45 已冻结）
- RFC 7807 错误、Idempotency-Key、429 Retry-After 保持现有惯例
- 列表接口保留可选登录态回填惯例
- 全部走 PR 到 develop，契约冻结后前端 codegen 再接线
