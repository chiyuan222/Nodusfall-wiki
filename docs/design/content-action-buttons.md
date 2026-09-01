# 内容操作按钮规范（删除 / 封禁）——前端实现说明

> 目标：作者可删除自己的内容；管理员可在内容原位执行「删除」与「封禁作者」。
> 保持画面整洁、风格统一。随契约 PR #53 生效，Kimi 按此实现。

---

## 1. 显示规则（按当前用户身份）

| 当前用户 | 内容是自己的 | 内容是他人的 |
| --- | --- | --- |
| 普通用户（含认证/付费组） | 「删除」 | 不显示操作按钮 |
| 管理员（admin/owner，且已开启 manage_deletion） | 「删除」 | 「删除」+「封禁作者」 |
| 管理员（admin/owner，未开启 manage_deletion） | 「删除」 | 仅「封禁作者」 |
| 未登录 | 不显示 | 不显示 |

> 判定依据：`GET /users/me` 返回的 `role` / `permissions` + 内容 `author.id`。
> 与现有楼层删除按钮同一模式：`me && (me.id === author.id || 具备删帖权限)`。

## 2. 覆盖页面与按钮位置

### Wiki 词条详情页 `/wiki/[slug]`

- 作者本人：标题/元信息区显示「删除词条」（次级按钮）。
- 管理员：同一位置显示「删除词条」「封禁作者」两个按钮（并排）。
- 点击删除：二次确认 → `DELETE /wiki/pages/{slug}` → 成功后跳转 `/wiki`。

### 攻略详情页 `/guides/[slug]`

- 同上：作者「删除攻略」；管理员「删除攻略」「封禁作者」。
- 删除 → `DELETE /guides/{slug}` → 跳转 `/guides`。

### 论坛主题详情页 `/forum/threads/[threadId]`

- 扩展现有 `AdminThreadControls`（现仅置顶/锁定）：
  - 作者本人：「删除主题」。
  - 管理员：「删除主题」「封禁作者」。
- 删除 → `DELETE /forum/threads/{threadId}` → 跳转所属板块。

### 评论区（已有，保持）

- 楼层删除按钮已存在（作者或管理员），保持不变。

## 3. 封禁交互（管理员）

- 「封禁作者」按钮 → 弹出确认（显示作者昵称与警示文案）→
  `PATCH /admin/users/{authorId}`，body `{ status: "banned", banReason?, banUntil? }`。
- 成功后提示并刷新当前页（内容保留，作者显示受限/已封禁标识由 `status` 决定）。
- 未开启 `manage_users` 或 `manage_deletion` 开关时，按钮不渲染或点击提示无权限（后端 403 兜底）。

## 4. 视觉规范（沿用现有设计 token）

- 按钮样式：`rounded-md border border-border-subtle px-3 py-1.5 text-small text-secondary hover:border-danger hover:text-danger`（危险操作）。
- 两按钮并排时间距 `gap-2`，置于内容元信息行右侧，`ml-auto` 靠右。
- 封禁按钮文案「封禁作者」，删除按钮文案「删除词条 / 删除攻略 / 删除主题」。
- 二次确认使用现有对话框风格（红色警示 + 取消/确认）。
- 移动端按钮不换行、保持紧凑（`flex-wrap`）。

## 5. 验收清单

- [ ] 作者本人可见「删除」，删除自己的词条/攻略/主题成功
- [ ] 管理员（开 manage_deletion）可见「删除 + 封禁作者」，两者均可用
- [ ] 管理员（未开 manage_deletion）只见「封禁作者」，删除他人内容 403 提示
- [ ] 非作者非管理员不显示操作按钮
- [ ] 未登录不显示
- [ ] 封禁后该用户发布内容作者位显示受限标识
- [ ] 通过 typecheck / lint / build
