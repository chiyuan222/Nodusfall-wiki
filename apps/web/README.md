# @nodusfall/web

《源初之结》（Nodusfall）非官方 Wiki 前端。Next.js 14 App Router + TypeScript + Tailwind CSS。

## 开发

```bash
# 在 monorepo 根目录
pnpm install

# 生成契约类型（openapi.yaml → src/lib/schema.d.ts）
pnpm --filter @nodusfall/web codegen

# 启动开发服务器
pnpm --filter @nodusfall/web dev

# 校验
pnpm --filter @nodusfall/web typecheck
pnpm --filter @nodusfall/web lint
pnpm --filter @nodusfall/web build
```

## 约定

- 设计 token 唯一事实源：`src/styles/tokens.css`（Tailwind theme 只引用 CSS 变量，不写死数值）。
- 类型唯一事实源：`src/lib/schema.d.ts`，由根目录 `openapi.yaml` 生成，不手写字段。
- API 客户端：`src/lib/api-client.ts`（`data` 包络、RFC 7807 错误、刷新令牌、幂等键）。
- 美术方向与组件规范：见 `docs/design/frontend-review.md`。
