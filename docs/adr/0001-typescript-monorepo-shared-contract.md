# ADR-001：TypeScript monorepo + 共享契约包

## Status
Accepted

## Context
项目由前端、后端两个 Agent 并行开发，前后端接口字段一旦不一致会产生大量联调成本。需要一种方式让契约在编译期 / 运行期就能被发现。

## Decision
采用 pnpm workspace + Turborepo 的 TypeScript monorepo：

- `apps/web`：Next.js 前端。
- `apps/api`：NestJS 后端。
- `packages/contract`：由 `openapi.yaml` 生成的共享类型与 Zod schema。
- 根目录 `openapi.yaml` 作为契约单一事实源。

## Consequences

### Positive
- 前后端同一语言，可共享类型。
- 契约变更有明确改动面，可在 CI 做 diff 校验。
- 单体仓库便于原子化修改与联调。

### Negative
- monorepo 需要额外的工具链与 CI 缓存管理。
- 前端、后端必须协调 Node 与 TypeScript 版本。

## Alternatives Considered
- **前后端两个独立仓库**：隔离更好，但契约同步和联调成本更高，被否决。
- **GraphQL**：字段按需更灵活，但 MVP 团队对 REST 工具链更熟悉，且 Wiki/论坛读多写少，暂不需要 GraphQL 复杂度。

## References
- [openapi.yaml](../../openapi.yaml)
