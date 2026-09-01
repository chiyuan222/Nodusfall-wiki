# 给 Kimi 的综合指令：后台管理能力 / 用户权限 / 内容互动 阶段

> 适用：PR #50 / #51 / #52 / #53 确认后，前端统一落地（frontend/* PR → develop）
> 视觉：全部沿用 tokens.css「结绳源点」体系，危险操作 semantic-danger，移动端紧凑

---

## 一、先确认契约（4 个 PR，逐条核对后回复「契约可冻结」）

1. **PR #50 后台内容管理**：HomeHero.slides（轮替 5 槽：media 图/视频 + title + linkKind + linkTarget，
   required 含 slides，保留 media 兼容）；HomeDigestColumn.mode（auto/manual，默认 auto）；
   WorldOfficialLink.iconKey（official/bilibili/douyin）
2. **PR #51 用户账号与权限体系**：UserSummary 新增必填 group（normal/verified/premium）与 level（1-10）；
   role 枚举加 owner；status 加 muted/banned；User 新增 permissions / wikiCreateGranted / banReason /
   banUntil / mutedUntil；新端点 GET /admin/stats/overview、GET /admin/users、GET/PATCH /admin/users/{userId}
   （role 与 permissions 仅 owner 可改）；permissions 开关含 manage_users / manage_content / manage_forum /
   manage_cms / **manage_deletion** / grant_wiki_create
3. **PR #52 内容互动**：WikiPageSummary / GuideSummary / ForumThreadSummary 新增必填
   viewCount / likeCount / likedByMe / bookmarkedByMe（论坛补 likedByMe/viewCount）；
   PUT/DELETE /wiki/pages/{slug}/like、/guides/{slug}/like、/forum/threads/{threadId}/like、
   /wiki/pages/{slug}/bookmark、/guides/{slug}/bookmark（幂等 204）
4. **PR #53 内容操作按钮规范**（含更正）：docs/design/content-action-buttons.md——
   作者本人「删除」；管理员对他人内容按开关独立显示：manage_deletion →「删除」、
   manage_users →「封禁作者」、都开 → 两者、都没开 → 不显示

## 二、确认合并后重跑 codegen，然后按模块实现

### 模块 1：内容管理（PR #50）

- 首页 hero 改轮替：`HomeHero.slides` 最多 5 槽（图/视频 MediaSlot + 标题 + 跳转），
  现有 home-page.json 的 `media` 迁移到 slides[0]（或保留 media 兜底渲染）
- 首页双栏：`HomeDigestColumn.mode`——auto 走 GET /home/digest 聚合（现状保持），
  manual 时使用手填 items；/admin/home 编辑器提供模式切换
- 官方渠道：`WorldOfficialLink.iconKey` 支持官网/B站/抖音图标；/admin/world 编辑器加图标选择
- /admin/home、/admin/world 保存仍走 PUT /admin/content/pages/{slug}

### 模块 2：用户账号与权限（PR #51）

- 新增 **/admin/users** 页面：列表（搜索用户名/邮箱/手机号；筛 group/role/status/level；分页）、
  详情、操作：封禁/解禁/禁言（status + banReason + 截止时间）、改用户组、改等级、
  权限开关（6 个开关勾选）、角色变更（仅 owner 显示）；全部二次确认，403 给可操作提示
- 新增 **/admin/stats** 页面：总览卡片（总用户/今日新增、今日/昨日 PV·UV·DAU、本月 MAU、在线人数）
  + 近 7 天趋势图 + 内容热度 Top10
- 全站用户展示：作者位/用户中心显示 group 徽标与 level；status=muted/banned 显示「受限」标识
- 写权限展示控制：normal 组隐藏评论/发帖入口（提示「认证后可发言」）；
  Wiki 新建入口按当前用户 `wikiCreateGranted` 或 manage_content 显示

### 模块 3：内容互动（PR #52）

- Wiki/攻略/论坛主题详情页：显示浏览量；点赞按钮（likedByMe 状态 + 数量，乐观更新）；
  Wiki/攻略收藏按钮（bookmarkedByMe，论坛已有）
- 列表卡片：展示浏览量/点赞/收藏数量（Summary 新字段直读）
- 未登录点击点赞/收藏：跳登录或提示登录

### 模块 4：内容操作按钮（PR #53）

- Wiki 词条 / 攻略 / 论坛主题详情页内容区：
  - 作者本人：「删除」（删除自己的词条/攻略/主题，二次确认，成功后跳列表）
  - 管理员：manage_deletion 开 →「删除」；manage_users 开 →「封禁作者」（确认弹窗 →
    PATCH /admin/users/{authorId}，body { status:"banned", banReason?, banUntil? }）
  - 两个开关都没开的管理员 / 非作者普通用户 / 未登录：不显示任何操作按钮
- 论坛 AdminThreadControls 扩展：加入「删除主题」「封禁作者」；置顶/锁定保留
- 评论区楼层删除保持现状（作者或管理员）

## 三、约定

- 真实 API 优先、失败回退空态/占位；不硬编码契约外字段
- 错误解析沿用 lib/errors.ts（RFC 7807）；403/401 给出可操作提示；429 展示 Retry-After
- 分页沿用 { data, pagination }；列表接口保留可选登录态回填
- 通过 typecheck / lint / build；提 frontend/* PR 到 develop，描述勾选完成项并 @ 后端

## 四、验收清单（汇总）

- [ ] 契约 #50/#51/#52/#53 逐条确认并回复
- [ ] codegen 重跑后类型通过
- [ ] 首页轮替 5 槽（图/视频）可配置并生效；双栏 auto/manual 可切换
- [ ] 官方渠道图标（官网/B站/抖音）可选
- [ ] /admin/users：列表/搜索/筛选/详情/封禁解禁/禁言/组/等级/权限开关/角色（owner）
- [ ] /admin/stats：总览 + 近 7 天趋势 + 内容热度 Top10
- [ ] 作者位/用户中心显示 group 与 level；受限标识
- [ ] 详情页浏览量/点赞/收藏按钮与数量；列表卡片数量展示
- [ ] 作者「删除」自己的词条/攻略/主题；管理员按开关「删除」「封禁作者」
- [ ] normal 组评论/发帖入口按权限隐藏或提示
