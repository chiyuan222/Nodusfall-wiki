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

  const adminHash = await bcrypt.hash('Admin12345!', 12);
  await prisma.user.upsert({
    where: { email: 'admin@nodusfall.local' },
    update: { role: UserRole.ADMIN },
    create: {
      email: 'admin@nodusfall.local',
      username: 'admin',
      displayName: '管理员',
      passwordHash: adminHash,
      role: UserRole.ADMIN,
    },
  });

  const memberHash = await bcrypt.hash('Member12345!', 12);
  await prisma.user.upsert({
    where: { email: 'member@nodusfall.local' },
    update: {},
    create: {
      email: 'member@nodusfall.local',
      username: 'member',
      displayName: '测试玩家',
      passwordHash: memberHash,
      role: UserRole.MEMBER,
    },
  });

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

  console.log('Seed 完成：home/world 内容、管理员与测试账号、Wiki 分类、论坛板块');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
