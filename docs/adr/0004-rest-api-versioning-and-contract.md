# ADR-004：REST 契约、URI 版本与错误/分页约定

## Status
Accepted

## Context
前后端需要稳定、可校验的接口契约，并提前约定版本、字段、错误与分页，避免联调阶段反复返工。

## Decision

- 使用 REST，OpenAPI 3.1 作为单一事实源。
- URI 版本：`/v1` 前缀，破坏性变更升主版本。
- JSON 字段统一 camelCase。
- 成功响应统一 envelope；错误遵循 RFC 7807。
- 集合端点统一 `page` / `perPage` 分页（默认 20，最大 100）。
- 认证使用 JWT Bearer。

## Consequences

### Positive
- 可通过 OpenAPI 自动生成文档、类型、mock 与契约测试。
- 前端无需猜测字段，减少联调错误。

### Negative
- envelope 与 RFC 7807 会带来少量样板代码。
- 分页采用 offset 在大数据量下性能会下降，需在数据量上升后评估游标分页。

## Alternatives Considered
- **GraphQL**：灵活但引入运行时复杂度，MVP 阶段收益低。
- **无版本**：早期简单，但破坏性变更会直接打断并行开发，被否决。

## References
- [API 契约](../plan/04-api-contract.md)
- [openapi.yaml](../../openapi.yaml)
