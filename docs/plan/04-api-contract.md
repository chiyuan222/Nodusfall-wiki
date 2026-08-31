# API 契约

## 1. 单一事实源

所有接口字段以根目录 [`openapi.yaml`](../../openapi.yaml) 为准。文档中的表格仅为概览，冲突时以 OpenAPI 为准。

## 2. 通用约定

| 项 | 约定 |
| --- | --- |
| Base URL | `/v1` |
| JSON 字段 | camelCase |
| 成功-单对象 | `{ "data": {...} }` |
| 成功-列表 | `{ "data": [...], "pagination": {...} }` |
| 错误 | RFC 7807 `application/problem+json` |
| 时间 | ISO 8601 UTC，字段名以 `At` 结尾（如 `createdAt`） |
| 标识 | 字符串 UUID |
| 分页 | `page` / `perPage`（默认 20，最大 100），返回 `page`、`perPage`、`total`、`totalPages`、`hasMore` |
| 认证 | `Authorization: Bearer <accessToken>` |
| 幂等 | 写操作支持 `Idempotency-Key`（可选） |

## 3. 资源概览

| 资源 | 主要端点 | 说明 |
| --- | --- | --- |
| 用户 | `POST /v1/users`、`GET/PATCH /v1/users/me`、`GET /v1/users/{id}` | 注册与资料 |
| 会话/认证 | `POST /v1/auth/sessions`、`DELETE /v1/auth/sessions/{id}` | 登录（`grantType=password`）与刷新（`grantType=refreshToken`）、登出 |
| Wiki | `/v1/wiki/categories`、`/v1/wiki/pages`、`/v1/wiki/pages/{slug}`、`/v1/wiki/pages/{slug}/revisions` | 内容与版本 |
| 攻略 | `/v1/guides`、`/v1/guides/{slug}`、`/v1/guides/{slug}/ratings` | 攻略与评分 |
| 论坛 | `/v1/forum/boards`、`/v1/forum/threads`、`/v1/forum/posts` | 板块、主题、回帖 |
| 评论 | `/v1/wiki/pages/{slug}/comments`、`/v1/guides/{slug}/comments`、`/v1/comments/{id}` | 内容评论 |
| 搜索 | `GET /v1/search?q=&kind=` | 跨内容搜索 |
| 上传 | `POST /v1/uploads`、`POST /v1/uploads/presign` | 图片 / 附件 |
| 健康 | `GET /v1/health` | 探活 |

## 4. 认证流程

1. `POST /v1/users` 注册。
2. `POST /v1/auth/sessions`，body `{ "grantType": "password", "email": "...", "password": "..." }` 获取 `accessToken`、`refreshToken`、`expiresIn`。
3. 客户端携带 `Authorization: Bearer <accessToken>` 调用受保护接口。
4. accessToken 过期后 `POST /v1/auth/sessions`，body `{ "grantType": "refreshToken", "refreshToken": "..." }` 换取新令牌。
5. 登出 `DELETE /v1/auth/sessions/{sessionId}`。

## 5. 错误目录

统一使用 `type` 为稳定 URI，`code` 供客户端分支处理，`detail` 供人阅读，`errors[]` 承载字段级校验。

| code | HTTP | 场景 |
| --- | --- | --- |
| `VALIDATION_ERROR` | 400 / 422 | 请求参数或字段校验失败 |
| `INVALID_CREDENTIALS` | 401 | 登录失败 |
| `UNAUTHENTICATED` | 401 | 缺少或无效令牌 |
| `FORBIDDEN` | 403 | 权限不足 |
| `NOT_FOUND` | 404 | 资源不存在 |
| `CONFLICT` | 409 | slug / email 等冲突 |
| `RATE_LIMITED` | 429 | 触发限流 |
| `INTERNAL_ERROR` | 500 | 未预期错误 |

## 6. 契约变更流程

1. 发起 `contract/<topic>` 分支。
2. 修改 `openapi.yaml`，同步 `packages/contract` schema 与生成类型。
3. 提交 PR，指定后端 + 前端双审。
4. 判断变更是否破坏兼容：新增可选字段 / 新端点 = 非破坏性；删改字段 / 改类型 / 改状态码 = 破坏性。
5. 破坏性变更需升版本（`/v2`）或提供兼容窗口；MVP 内优先非破坏性变更。

## 7. 生成与校验

```bash
# 校验 OpenAPI
pnpm dlx @redocly/cli lint openapi.yaml

# 启动 mock
pnpm dlx @stoplight/prism-cli mock openapi.yaml

# 生成共享类型（由 packages/contract 配置）
pnpm codegen
```
