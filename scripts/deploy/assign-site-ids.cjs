// 给现有用户按注册顺序分配 7 位网站 ID（1000000 起），并把序列推进到当前最大值
// 用法：node scripts/deploy/assign-site-ids.cjs（项目根目录执行）
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', '..');
const envText = fs.readFileSync(path.join(root, 'apps/api/.env'), 'utf8');
const m = envText.match(/^DATABASE_URL=(.+)$/m);
if (!m) {
  console.error('DATABASE_URL not found in apps/api/.env');
  process.exit(1);
}
let url = m[1].trim();
if (
  url.length >= 2 &&
  ((url.startsWith('"') && url.endsWith('"')) ||
    (url.startsWith("'") && url.endsWith("'")))
) {
  url = url.slice(1, -1);
}
process.env.DATABASE_URL = url;

const { PrismaClient } = require(path.join(
  root,
  'apps/api/node_modules/@prisma/client',
));
const p = new PrismaClient();

(async () => {
  const users = await p.user.findMany({
    orderBy: { createdAt: 'asc' },
    select: { id: true, username: true, siteId: true },
  });
  console.log(`现有用户 ${users.length} 个，开始按注册顺序分配 siteId（1000000 起）...`);
  let next = 1000000;
  for (const u of users) {
    if (u.siteId !== next) {
      await p.user.update({ where: { id: u.id }, data: { siteId: next } });
      console.log(`  ${u.username}: ${u.siteId ?? '(未分配)'} -> ${next}`);
    }
    next++;
  }
  await p.$executeRawUnsafe(
    `SELECT setval(pg_get_serial_sequence('"User"', 'siteId'), GREATEST((SELECT COALESCE(MAX("siteId"), 999999) FROM "User"), 999999))`,
  );
  const max = await p.user.aggregate({ _max: { siteId: true } });
  console.log(`完成。当前最大 siteId=${max._max.siteId}，下一个注册用户将获得 ${max._max.siteId + 1}`);
  await p.$disconnect();
})().catch((e) => {
  console.error('ERR:', e.message);
  process.exit(1);
});
