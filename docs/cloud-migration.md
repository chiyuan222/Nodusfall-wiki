# 数据库部署与云托管迁移后手

本文是“本地开发用 Docker PostgreSQL，后续切到腾讯云托管数据库”的切换方案。

## 当前本地方案

根目录 `docker-compose.yml` 已定义 PostgreSQL 16 和 Redis 7：

```bash
docker compose up -d postgres redis
```

本地连接串（`.env`）：

```dotenv
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/nodusfall?schema=public
```

首次初始化：

```bash
npx prisma db push --schema apps/api/prisma/schema.prisma
npm --prefix apps/api run prisma:seed
```

## 后续切到腾讯云 PostgreSQL

推荐使用腾讯云托管数据库 **TencentDB for PostgreSQL**，而不是在云服务器里手装，省去备份和高可用维护。

### 切换步骤

1. 在腾讯云控制台创建 PostgreSQL 实例，版本建议 `16`。
2. 创建数据库 `nodusfall` 和数据库账号，拿到：
   - 内网/公网主机地址 `HOST`
   - 端口（通常 `5432`）
   - 用户名 `USER`
   - 密码 `PASSWORD`
3. 把生产环境变量设为：

```dotenv
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/nodusfall?schema=public
```

4. 执行迁移与种子（生产环境用 `migrate deploy` 更安全）：

```bash
npx prisma migrate deploy --schema apps/api/prisma/schema.prisma
npm --prefix apps/api run prisma:seed
```

5. 重启后端，使新的 `DATABASE_URL` 生效。

## 数据迁移（本地 → 云）

本地导出：

```bash
docker compose exec -T postgres pg_dump -U postgres -d nodusfall -Fc -f /tmp/nodusfall.dump
docker compose cp postgres:/tmp/nodusfall.dump ./nodusfall.dump
```

云上导入：

```bash
pg_restore --no-owner --verbose -d "postgresql://USER:PASSWORD@HOST:5432/nodusfall" ./nodusfall.dump
```

## 回退（云 → 本地）

把 `DATABASE_URL` 改回本地连接串，再启动 Docker PostgreSQL 即可。代码和契约都不需要改。

## 建议

- 生产环境必须替换 `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` 为强随机值。
- 云数据库开启自动备份和访问白名单，避免公网裸奔。
- 迁移时先在测试库验证，再切生产流量。
