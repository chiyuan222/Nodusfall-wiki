import {
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service';

const FLUSH_INTERVAL_MS = 60_000;
const ONLINE_WINDOW_MS = 15 * 60_000;

interface DayBucket {
  pv: number;
  ips: Set<string>;
  users: Set<string>;
}

function dayKey(date: Date): string {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).toISOString();
}

@Injectable()
export class StatsService implements OnModuleInit, OnModuleDestroy {
  private readonly pending = new Map<string, DayBucket>();
  private readonly online = new Map<string, number>();
  private timer?: NodeJS.Timeout;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  onModuleInit(): void {
    this.timer = setInterval(() => void this.flush(), FLUSH_INTERVAL_MS);
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  record(req: Request): void {
    const now = new Date();
    const key = dayKey(now);
    let bucket = this.pending.get(key);
    if (!bucket) {
      bucket = { pv: 0, ips: new Set(), users: new Set() };
      this.pending.set(key, bucket);
    }
    bucket.pv += 1;
    bucket.ips.add(req.ip ?? 'unknown');

    const auth = req.headers.authorization;
    if (auth?.startsWith('Bearer ')) {
      try {
        const payload = this.jwt.verify<{ sub: string }>(auth.slice(7), {
          secret: this.config.get<string>('JWT_ACCESS_SECRET', 'dev-access-secret'),
        });
        if (payload?.sub) {
          bucket.users.add(payload.sub);
          this.online.set(payload.sub, Date.now());
        }
      } catch {
        // 无效 token 不计入活跃
      }
    }
  }

  private async flush(): Promise<void> {
    for (const [key, bucket] of this.pending) {
      const date = new Date(key);
      await this.prisma.dailyStat.upsert({
        where: { date },
        create: { date, pv: bucket.pv, uv: bucket.ips.size, dau: bucket.users.size },
        update: {
          pv: { increment: bucket.pv },
          uv: bucket.ips.size,
          dau: bucket.users.size,
        },
      });
      if (bucket.users.size > 0) {
        await this.prisma.dailyActiveUser.createMany({
          data: [...bucket.users].map((userId) => ({ userId, date })),
          skipDuplicates: true,
        });
      }
    }
    this.pending.clear();

    if (this.online.size > 0) {
      const userIds = [...this.online.keys()];
      const maxAt = new Date(Math.max(...this.online.values()));
      await this.prisma.session.updateMany({
        where: { userId: { in: userIds }, revokedAt: null },
        data: { lastActiveAt: maxAt },
      });
      this.online.clear();
    }
  }

  async overview() {
    await this.flush();
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const onlineSince = new Date(Date.now() - ONLINE_WINDOW_MS);

    const [totalUsers, todayNew, todayStat, yesterdayStat, weeklyStats, mau, onlineSessions, topWiki, topGuides, topThreads] =
      await Promise.all([
        this.prisma.user.count(),
        this.prisma.user.count({ where: { createdAt: { gte: today } } }),
        this.prisma.dailyStat.findUnique({ where: { date: today } }),
        this.prisma.dailyStat.findUnique({ where: { date: yesterday } }),
        this.prisma.dailyStat.findMany({
          where: { date: { gte: new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000) } },
          orderBy: { date: 'asc' },
        }),
        this.prisma.dailyActiveUser.findMany({
          where: { date: { gte: monthStart } },
          select: { userId: true },
          distinct: ['userId'],
        }),
        this.prisma.session.findMany({
          where: { revokedAt: null, lastActiveAt: { gte: onlineSince } },
          select: { userId: true },
          distinct: ['userId'],
        }),
        this.prisma.wikiPage.findMany({
          orderBy: { viewCount: 'desc' },
          take: 5,
          select: { slug: true, title: true, viewCount: true },
        }),
        this.prisma.guide.findMany({
          orderBy: { viewCount: 'desc' },
          take: 5,
          select: { slug: true, title: true, viewCount: true },
        }),
        this.prisma.forumThread.findMany({
          orderBy: { viewCount: 'desc' },
          take: 5,
          select: { id: true, title: true, viewCount: true },
        }),
      ]);

    const weeklyMap = new Map(weeklyStats.map((s) => [s.date.toISOString(), s]));
    const weekly = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
      const key = dayKey(d);
      const s = weeklyMap.get(key);
      weekly.push({
        date: d.toISOString().slice(0, 10),
        pv: s?.pv ?? 0,
        uv: s?.uv ?? 0,
        dau: s?.dau ?? 0,
      });
    }

    const topContents = [
      ...topWiki.map((w) => ({ kind: 'wikiPage', slug: w.slug, title: w.title, views: w.viewCount })),
      ...topGuides.map((g) => ({ kind: 'guide', slug: g.slug, title: g.title, views: g.viewCount })),
      ...topThreads.map((t) => ({ kind: 'forumThread', slug: t.id, title: t.title, views: t.viewCount })),
    ]
      .sort((a, b) => b.views - a.views)
      .slice(0, 10);

    return {
      data: {
        users: { total: totalUsers, todayNew },
        today: {
          date: today.toISOString().slice(0, 10),
          pv: todayStat?.pv ?? 0,
          uv: todayStat?.uv ?? 0,
          dau: todayStat?.dau ?? 0,
        },
        yesterday: {
          date: yesterday.toISOString().slice(0, 10),
          pv: yesterdayStat?.pv ?? 0,
          uv: yesterdayStat?.uv ?? 0,
          dau: yesterdayStat?.dau ?? 0,
        },
        weekly,
        monthly: { mau: mau.length },
        online: onlineSessions.length,
        topContents,
      },
    };
  }
}
