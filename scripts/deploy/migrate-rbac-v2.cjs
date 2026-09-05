// RBAC v2 一次性数据迁移：在 prisma db push 前执行（旧枚举行存在会阻塞 push）
// 角色：EDITOR→WIKI_EDITOR、MODERATOR→WIKI_MODERATOR、GUEST→MEMBER
// 资格：旧 wikiCreateGranted=true 同时补 guideCreateGranted=true（旧规则双开 Wiki+攻略）
const { PrismaClient } = require('@prisma/client');
const fs = require('node:fs');

const envRaw = fs.readFileSync('.env', 'utf8');
const m = envRaw.match(/^DATABASE_URL=(.+)$/m);
if (m) process.env.DATABASE_URL = m[1].trim();

const prisma = new PrismaClient();

async function main() {
  const steps = [
    [`UPDATE "User" SET role='WIKI_EDITOR' WHERE role='EDITOR'`, 'EDITOR -> WIKI_EDITOR'],
    [`UPDATE "User" SET role='WIKI_MODERATOR' WHERE role='MODERATOR'`, 'MODERATOR -> WIKI_MODERATOR'],
    [`UPDATE "User" SET role='MEMBER' WHERE role='GUEST'`, 'GUEST -> MEMBER'],
    [`UPDATE "User" SET "guideCreateGranted"=true WHERE "wikiCreateGranted"=true`, '旧授予双开 guideCreateGranted'],
  ];
  for (const [sql, label] of steps) {
    const r = await prisma.$executeRawUnsafe(sql);
    console.log(`RBAC 迁移 ${label}: ${r} 行`);
  }
  console.log('RBAC v2 数据迁移完成');
}

main()
  .catch((e) => {
    console.error('RBAC 迁移失败', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
