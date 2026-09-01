# 给 Kimi 的前端指令：用户中心与真实账号体系（可直接复制）

> 契约 PR：#45（contract/user-center，待你确认后合并）
> 方案文档：docs/design/user-center-design.md（已随 PR #45 入库）
> 开工前必读：openapi.yaml（契约唯一事实源）、docs/design/user-center-design.md、现有
> apps/web/src/lib/schema.d.ts（codegen 产物）与 api-client.ts / session.ts

---

## 背景

站长已确认新需求：①外部注册支持真实邮箱（验证码）或手机号（格式校验）；②登录成功后全站
登录键替换为用户中心入口；③用户中心提供我的主页、我的内容（帖子/收藏/评论）、浏览记录、
账号设置（软注销）。契约变更已由后端以 PR #45 提交，确认后可合并。

## 第一步：确认契约（PR #45）

1. 打开 PR #45，逐条核对以下新增/变更，确认后在 PR 评论回复「契约可冻结」：
   - `POST /auth/email-codes`：请求 `{ email }`，响应 204；429 带 Retry-After
   - `POST /users`：注册负载二选一
     - 邮箱注册：`{ username, password, email, emailCode }`
     - 手机号注册：`{ username, password, phone }`（中国大陆 11 位，暂仅格式校验）
   - `POST /auth/sessions`：登录负载二选一 `{ grantType:"password", email }` 或
     `{ grantType:"password", phone }`
   - `GET /users/me/comments`：我的评论列表，`{ data, pagination }`，项含
     `targetType / targetSlug / targetTitle / content / likeCount / createdAt`
   - `GET|POST|DELETE /users/me/history`：浏览记录查询/上报/清空；
     POST body `{ kind: "wikiPage"|"guide"|"forumThread", slug }`（forumThread 时 slug 传 threadId）
   - `DELETE /users/me`：软注销，body `{ password }`，204
   - `UserSummary` 新增必填 `status: active|deleted`；`User` 新增 `emailMasked / phoneMasked`
2. 确认后回复，合并由仓库所有者执行；你随后重跑 codegen 更新 schema.d.ts。

## 第二步：前端实现（frontend/* 分支，目标 develop）

### 1. 注册页 `/register`（新增）

- 邮箱注册 / 手机号注册双 Tab。
- 邮箱注册：邮箱 + 「获取验证码」按钮（点击后 60s 倒计时、禁用；调 `POST /auth/email-codes`，
  429 时展示 Retry-After 秒数）+ 6 位验证码 + 用户名 + 密码（≥8）+ 勾选《用户协议》《隐私政策》。
- 手机号注册：11 位手机号 + 用户名 + 密码 + 协议勾选；页面提示「手机号暂未开通短信验证，
  短信验证接入后启用」。
- 提交调 `POST /users`，成功后自动登录（复用 `POST /auth/sessions`）并跳转 `/me`。
- 注册页提供《用户协议》《隐私政策》链接（`/legal/terms`、`/legal/privacy`，可先做静态占位页）。

### 2. 登录页改造 `/login`

- 输入框自动识别：含 `@` 视为邮箱，11 位数字视为手机号，对应请求字段 `email` / `phone`。
- 错误提示沿用现有（401 →「邮箱/手机号或密码不正确。」；429 → 带秒数）。
- 页脚加「没有账号？去注册」→ `/register`。
- 登录成功后跳转 `/me`（替代当前 `/`）。

### 3. Header 登录态（核心改动，替代现有静态「登录」按钮）

新增客户端组件（如 `components/me/auth-menu.tsx`）：

- 未登录：显示「登录」「注册」两个按钮。
- 已登录：显示头像圆点 + 昵称，点击展开下拉：用户中心（/me）、我的内容 / 浏览记录 /
  账号设置（锚点或子路由）、退出登录；admin 额外显示「后台」入口。
- 实现要点：`getAccessToken()` 判断是否登录；首次进入调 `GET /users/me` 取昵称/头像/角色；
  401 时自动降级为未登录态；退出调 `DELETE /auth/sessions/{sessionId}` 后清空本地会话并刷新。
- 移动端底部 TabBar 已有「我的」入口，保持；登录后显示头像圆点。

### 4. 用户中心 `/me` 四 Tab（重构现有页面）

- 我的主页（默认）：资料卡（头像/昵称/@用户名/角色徽标/简介/注册时间）+ 编辑资料
  （复用 PATCH /users/me）+ 绑定状态卡（显示 `emailMasked`、`phoneMasked`，脱敏）+ 退出登录。
- 我的内容：Tab 我发布的主题 / 我的收藏（复用现有接口）+ 新增「我的评论」
  （`GET /users/me/comments`，列表项显示目标类型/标题/内容摘要/时间，点击跳转对应详情）。
- 浏览记录：`GET /users/me/history` 分页倒序列表（封面 + 类型标签 + 标题 + 时间），
  右上「清空记录」按钮（二次确认后 `DELETE /users/me/history`）。
- 账号设置：注销账号流程——红色警示文案 + 输入当前密码 + 二次确认（输入「注销」或勾选），
  提交 `DELETE /users/me`；成功后清空本地会话跳转首页。

### 5. 浏览记录上报（详情页）

- Wiki 详情页 `/wiki/[slug]`、攻略详情页 `/guides/[slug]`、论坛主题页
  `/forum/threads/[threadId]`：登录用户挂载时上报一次
  `POST /users/me/history`（`{ kind, slug }`，forumThread 传 threadId），失败静默忽略。

### 6. 已注销用户展示

- codegen 后 `UserSummary.status === "deleted"` 时，所有作者展示处（帖子/攻略/评论/论坛）
  显示「已注销用户」（可复用现有头像占位样式，昵称替换为占位文案）。

## 约定

- 真实 API 优先、失败回退空态/占位；不硬编码契约外字段。
- 错误解析沿用 `lib/errors.ts`（RFC 7807）；429 展示 Retry-After。
- 分页沿用 `{ data, pagination }` 形状与现有列表组件。
- 视觉沿用 `tokens.css`「结绳源点」体系；危险操作使用 `semantic-danger`。
- 通过 typecheck / lint / build 后提 frontend/* PR 到 develop，描述里勾出完成项并 @ 后端。

## 验收清单（前端侧）

- [ ] 注册：邮箱验证码 60s 倒计时 + 429 提示；手机号 11 位格式校验；协议勾选必选
- [ ] 登录：邮箱/手机号自动识别；成功跳转 /me
- [ ] Header：未登录显示登录/注册；登录后显示用户中心下拉；退出可用
- [ ] /me 四 Tab：资料编辑、我的帖子/收藏/评论、浏览记录+清空、注销流程
- [ ] 浏览记录：登录用户访问三类详情页各上报一次，记录出现在 /me 浏览记录
- [ ] 已注销用户显示「已注销用户」占位
