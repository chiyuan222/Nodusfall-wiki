# ADR-002：后端采用模块化单体

## Status
Accepted

## Context
MVP 需要认证、Wiki、攻略、论坛、评论、搜索、上传等多个领域，但团队规模小（两个 Agent），初期流量不确定。

## Decision
后端使用 NestJS 构建**模块化单体**，按领域划分模块（Auth、Users、Wiki、Guides、Forum、Comments、Search、Uploads），共享同一数据库与进程。

## Consequences

### Positive
- 部署简单、调试方便、事务边界清晰。
- 模块边界为未来拆分微服务预留空间。
- 开发与运维成本低。

### Negative
- 未来某模块流量暴涨时，无法独立扩容。
- 共享数据库可能造成领域耦合，需要靠代码规范约束。

## Alternatives Considered
- **微服务**：MVP 阶段过度设计，运维复杂，被否决。
- **Serverless**：冷启动与本地开发体验不佳，且论坛写入交互较多，被否决。

## References
- [总体方案](../plan/00-overview.md)
