# ADR-005：双 Agent Git 分支与目录所有权

## Status
Accepted

## Context
两个 Agent 并行在同一个仓库工作，若没有目录所有权与分支权限隔离，容易出现冲突、覆盖和互相改动。

## Decision

- 采用 `main` / `develop` 长期分支，功能分支前缀 `backend/*`、`frontend/*`、`contract/*`、`docs/*`。
- 通过 CODEOWNERS 与分支保护实现目录所有权。
- 后端独占 `apps/api`，前端独占 `apps/web` 与 `public`。
- `openapi.yaml` 与 `packages/contract` 作为共享契约，双审。
- 为两个 Agent 分配独立机器账号 / GitHub App。

## Consequences

### Positive
- 冲突可预测、可隔离。
- 共享契约有明确的双审门禁。
- 每个 Agent 的职责与提交边界清晰。

### Negative
- 需要额外的 GitHub 账号与权限管理。
- 跨目录的大改动必须拆成多个 PR，增加协调成本。

## Alternatives Considered
- **两个独立仓库 + submodule**：隔离最彻底，但契约同步和联调复杂，被否决。
- **共享单账号**：设置简单，但无法区分两个 Agent 的操作与审计，风险高，被否决。

## References
- [Git 分支与权限](../plan/05-git-branch-strategy.md)
- [角色与边界](../plan/01-roles-and-boundaries.md)
