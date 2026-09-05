// RBAC v2 幂等数据迁移（分两段，remote-update.sh 调用）：
//   node migrate-rbac-v2.cjs roles  —— 在 prisma db push 前：先 ALTER TYPE 追加新角色值，再迁移旧行
//   node migrate-rbac-v2.cjs grants —— 在 prisma db push 后：旧 wikiCreateGranted 补 guideCreateGranted
// 角色迁移：EDITOR→WIKI_EDITOR、MODERATOR→WIKI_MODERATOR、GUEST→MEMBER
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..', '..');
const { PrismaClient } = require(path.join(
  root,
  'apps/api/node_modules/@prisma/client',
));
const envRaw = fs.readFileSync(path.join(root, 'apps/api/.env'), 'utf8');
const m = envRaw.match(/^DATABASE_URL=(.+)$/m);
if (m) {
  let url = m[1].trim();
  if (
    url.length >= 2 &&
    ((url.startsWith('"') && url.endsWith('"')) ||
      (url.startsWith("'") && url.endsWith("'")))
  ) {
    url = url.slice(1, -1);
  }
  process.env.DATABASE_URL = url;
}

const prisma = new PrismaClient();
const mode = process.argv[2] ?? 'roles';

async function runStep(label, sql) {
  const r = await prisma.$executeRawUnsafe(sql);
  console.log(`RBAC 迁移 ${label}: ${r} 行`);
}

async function main() {
  if (mode === 'roles') {
    const newRoles = [
      'WIKI_EDITOR',
      'GUIDE_EDITOR',
      'VIDEO_EDITOR',
      'WIKI_MODERATOR',
      'GUIDE_MODERATOR',
      'FORUM_MODERATOR',
      'VIDEO_MODERATOR',
    ];
    for (const role of newRoles) {
      await prisma.$executeRawUnsafe(
        `ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS '${role}'`,
      );
    }
    await runStep(
      'EDITOR -> WIKI_EDITOR',
      `UPDATE "User" SET role='WIKI_EDITOR' WHERE role::text='EDITOR'`,
    );
    await runStep(
      'MODERATOR -> WIKI_MODERATOR',
      `UPDATE "User" SET role='WIKI_MODERATOR' WHERE role::text='MODERATOR'`,
    );
    await runStep(
      'GUEST -> MEMBER',
      `UPDATE "User" SET role='MEMBER' WHERE role::text='GUEST'`,
    );
  } else if (mode === 'grants') {
    await runStep(
      '旧授予双开 guideCreateGranted',
      `UPDATE "User" SET "guideCreateGranted"=true WHERE "wikiCreateGranted"=true`,
    );
  } else {
    console.error('unknown mode', mode);
    process.exit(1);
  }
  console.log(`RBAC v2 数据迁移完成（${mode}）`);
}

main()
  .catch((e) => {
    console.error('RBAC 迁移失败', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
