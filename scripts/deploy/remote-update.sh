#!/usr/bin/env bash
# 服务器端更新：替换代码 -> 构建 -> 重启 -> 验证
set -euo pipefail

REPO=/opt/nodusfall/repo
ZIP=/tmp/dev.zip
STAGE=/opt/nodusfall/repo-new
PUBLIC_API="http://154.8.196.156/v1"

echo "==> 备份服务器 .env"
cp "$REPO/apps/api/.env" /tmp/api-env-backup

echo "==> 保留上传目录（uploads 持久化到 /opt/nodusfall/uploads）"
sudo mkdir -p /opt/nodusfall/uploads
if [ -d "$REPO/apps/api/uploads" ] && [ ! -L "$REPO/apps/api/uploads" ] && [ -n "$(ls -A "$REPO/apps/api/uploads" 2>/dev/null)" ]; then
  sudo cp -a "$REPO/apps/api/uploads/." /opt/nodusfall/uploads/
fi

echo "==> 解压新代码"
sudo rm -rf "$STAGE" /opt/nodusfall/chiyuan222-Nodusfall-wiki-*
cd /tmp && sudo unzip -q "$ZIP" -d /opt/nodusfall/
sudo mv /opt/nodusfall/chiyuan222-Nodusfall-wiki-* "$STAGE"

echo "==> 恢复 .env 并替换运行目录"
cp /tmp/api-env-backup "$STAGE/apps/api/.env"
sudo mkdir -p "$STAGE/apps/api"
sudo ln -s /opt/nodusfall/uploads "$STAGE/apps/api/uploads"
sudo rm -rf "$REPO"
sudo mv "$STAGE" "$REPO"
sudo chown -R ubuntu:ubuntu "$REPO"

echo "==> 构建 API"
cd "$REPO/apps/api"
npm install --no-audit --no-fund
echo "==> RBAC v2 数据迁移（旧角色/资格，需在 db push 前）"
cp /tmp/migrate-rbac-v2.cjs "$REPO/scripts/deploy/migrate-rbac-v2.cjs"
node "$REPO/scripts/deploy/migrate-rbac-v2.cjs" roles
echo "==> 同步数据库结构（prisma db push）"
npx prisma db push --accept-data-loss
echo "==> RBAC v2 资格迁移（db push 后，列已存在）"
node "$REPO/scripts/deploy/migrate-rbac-v2.cjs" grants
echo "==> 攻略默认分类 seed（db push 后）"
node "$REPO/scripts/deploy/migrate-rbac-v2.cjs" guide-defaults
echo "==> 分配现有用户网站 ID（siteId 1000000 起）"
cp /tmp/assign-site-ids.cjs "$REPO/scripts/deploy/assign-site-ids.cjs"
node "$REPO/scripts/deploy/assign-site-ids.cjs"
echo "==> 写入敏感词基础词库"
cp /tmp/seed-sensitive-words.cjs "$REPO/scripts/deploy/seed-sensitive-words.cjs"
node "$REPO/scripts/deploy/seed-sensitive-words.cjs"
npm run build

echo "==> 构建 Web"
cd "$REPO/apps/web"
export NEXT_PUBLIC_API_BASE_URL="$PUBLIC_API"
npm install --no-audit --no-fund
npm run build

echo "==> 重启服务"
pm2 restart nodusfall-api --update-env
pm2 restart nodusfall-web --update-env
pm2 save

echo "==> 验证"
sleep 4
curl -s -o /dev/null -w "home: %{http_code}\n" http://127.0.0.1/
curl -s http://127.0.0.1/v1/health | head -c 120; echo
echo "UPDATE_DONE"
