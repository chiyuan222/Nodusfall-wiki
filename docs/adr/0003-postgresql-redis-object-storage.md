# ADR-003：PostgreSQL + Redis + S3 兼容存储

## Status
Accepted

## Context
站点以关系型内容为主（用户、Wiki、攻略、论坛、评论），需要事务与复杂查询；同时需要会话缓存、限流计数，以及图片 / 附件存储。

## Decision

- **PostgreSQL** 作为主数据库，使用 JSONB 承载灵活元数据，后续可用内置全文检索或外接搜索引擎。
- **Redis** 用于刷新令牌、会话、限流计数、热点缓存。
- **S3 兼容对象存储** 用于用户上传的图片与附件；数据库只存对象 key 与元数据。

## Consequences

### Positive
- 关系一致性与扩展性平衡。
- 文件与数据库分离，备份与扩展简单。
- 生态成熟，托管服务选择多。

### Negative
- 需要同时运维三类基础设施。
- 对象存储的 CDN / 缩放策略需要前端配合。

## Alternatives Considered
- **MongoDB**：灵活 schema 有吸引力，但论坛与版本历史的强关系查询不适合，被否决。
- **SQLite**：仅适合原型，无法支撑多人并发写入，被否决。

## References
- [总体方案](../plan/00-overview.md)
