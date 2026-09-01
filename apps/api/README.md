# Nodusfall API

后端服务：NestJS + Prisma + PostgreSQL。接口前缀 `/v1`，默认端口 `4000`。

## 本地启动

### 1. 启动依赖

仓库根目录提供 `docker-compose.yml`：

```bash
docker compose up -d postgres redis
```

### 2. 配置环境变量

复制根目录 `.env.example` 到 `apps/api/.env`，至少设置：

```dotenv
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/nodusfall?schema=public
JWT_ACCESS_SECRET=dev-access-secret
JWT_REFRESH_SECRET=dev-refresh-secret
PORT=4000
```

### 3. 安装依赖并初始化数据库

```bash
# 仓库根目录（推荐使用 pnpm workspace）
pnpm install

# 或单独安装后端
npm install --prefix apps/api

# 生成 Prisma Client
npm --prefix apps/api run prisma:generate

# 同步 schema 并生成迁移（开发期可先用 db push）
npx prisma db push --schema apps/api/prisma/schema.prisma

# 写入种子数据
npm --prefix apps/api run prisma:seed
```

### 4. 启动

```bash
npm --prefix apps/api run dev
```

服务地址：`http://127.0.0.1:4000/v1`

健康检查：`GET /v1/health`

## 测试账号（seed 生成）

| 角色 | 用户名 / 邮箱 | 密码 |
| --- | --- | --- |
| 站长 | `chiyuan222` / `chiyuan222@nodusfall.local` | `Lxy529586517` |

登录：

```bash
curl -X POST http://127.0.0.1:4000/v1/auth/sessions \
  -H 'Content-Type: application/json' \
  -d '{"grantType":"password","email":"chiyuan222@nodusfall.local","password":"Lxy529586517"}'
```

## 目录

- `src/`：模块化后端代码
- `prisma/schema.prisma`：数据模型
- `prisma/seed.ts`：初始内容与测试账号
