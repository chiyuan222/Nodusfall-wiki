import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const prisma = new PrismaClient();

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, 'utf8'));
}

async function main(): Promise<void> {
  const root = join(process.cwd(), '..', '..');
  const home = readJson(join(root, 'apps', 'web', 'public', 'content', 'home-page.json'));
  const world = readJson(join(root, 'apps', 'web', 'public', 'content', 'world-page.json'));

  await prisma.contentPage.upsert({
    where: { slug: 'home' },
    update: { data: home },
    create: { slug: 'home', data: home },
  });
  await prisma.contentPage.upsert({
    where: { slug: 'world' },
    update: { data: world },
    create: { slug: 'world', data: world },
  });

  const ownerHash = await bcrypt.hash('Lxy529586517', 12);
  await prisma.user.upsert({
    where: { username: 'chiyuan222' },
    update: { role: UserRole.OWNER, passwordHash: ownerHash },
    create: {
      email: 'chiyuan222@nodusfall.local',
      username: 'chiyuan222',
      displayName: '站长',
      passwordHash: ownerHash,
      role: UserRole.OWNER,
      siteId: 1000000,
    },
  });
  await prisma.$executeRawUnsafe(
    `SELECT setval(pg_get_serial_sequence('"User"', 'siteId'), GREATEST((SELECT COALESCE(MAX("siteId"), 999999) FROM "User"), 999999))`,
  );

  await prisma.wikiCategory.upsert({
    where: { slug: 'lore' },
    update: {},
    create: { slug: 'lore', name: '世界观', sortOrder: 1 },
  });
  await prisma.wikiCategory.upsert({
    where: { slug: 'system' },
    update: {},
    create: { slug: 'system', name: '系统机制', sortOrder: 2 },
  });

  await prisma.forumBoard.upsert({
    where: { slug: 'general' },
    update: {},
    create: { slug: 'general', name: '综合讨论', sortOrder: 1 },
  });
  await prisma.forumBoard.upsert({
    where: { slug: 'help' },
    update: {},
    create: { slug: 'help', name: '求助与答疑', sortOrder: 2 },
  });

  console.log('Seed 完成：home/world 内容、站长账号、Wiki 分类、论坛板块');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
