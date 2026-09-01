import { ConflictException, Injectable } from '@nestjs/common';
import { pageInfo } from '../common/pagination';
import { PrismaService } from '../prisma/prisma.service';

export const EXP_RULES: Record<string, number> = {
  checkin: 10,
  checkinStreak7: 30,
  wiki: 30,
  guide: 30,
  thread: 15,
  reply: 5,
  comment: 5,
  bookmark: 2,
  like: 1,
};

export const DAILY_LIMITS: Record<string, number> = {
  wiki: 2,
  guide: 2,
  thread: 5,
  reply: 10,
  comment: 20,
  bookmark: 20,
  like: 30,
};

export const DAILY_TOTAL_LIMIT = 100;
export const LEVEL_MAX = 10;

export function levelFromExp(exp: number): number {
  let level = 1;
  for (let n = 2; n <= LEVEL_MAX; n++) {
    if (exp >= (100 * n * (n - 1)) / 2) level = n;
    else break;
  }
  return level;
}

export function nextLevelExp(level: number): number | null {
  if (level >= LEVEL_MAX) return null;
  return (100 * (level + 1) * level) / 2;
}

@Injectable()
export class ExpService {
  constructor(private readonly prisma: PrismaService) {}

  async grant(userId: string, reason: string, refId?: string) {
    const amount = EXP_RULES[reason];
    if (amount === undefined) return null;
    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);

    const limit = DAILY_LIMITS[reason];
    if (limit !== undefined) {
      const count = await this.prisma.expLog.count({
        where: { userId, reason, createdAt: { gte: dayStart } },
      });
      if (count >= limit) return null;
    }

    const total = await this.prisma.expLog.aggregate({
      where: { userId, createdAt: { gte: dayStart } },
      _sum: { amount: true },
    });
    if ((total._sum.amount ?? 0) + amount > DAILY_TOTAL_LIMIT) return null;

    return this.applyExp(userId, amount, reason, refId);
  }

  async checkIn(userId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const existing = await this.prisma.checkIn.findUnique({
      where: { userId_date: { userId, date: today } },
    });
    if (existing) throw new ConflictException('already checked in today');

    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const prev = await this.prisma.checkIn.findUnique({
      where: { userId_date: { userId, date: yesterday } },
    });
    const streak = (prev?.streak ?? 0) + 1;
    const amount = (EXP_RULES.checkin ?? 0) + (streak % 7 === 0 ? (EXP_RULES.checkinStreak7 ?? 0) : 0);

    const checkin = await this.prisma.checkIn.create({
      data: { userId, date: today, streak },
    });
    const result = await this.applyExp(userId, amount, 'checkin', checkin.id);
    const total = await this.prisma.checkIn.count({ where: { userId } });
    return {
      today: true,
      streak,
      total,
      gainedExp: amount,
      exp: result.exp,
      level: result.level,
      nextLevelExp: nextLevelExp(result.level),
    };
  }

  async status(userId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayCheck = await this.prisma.checkIn.findUnique({
      where: { userId_date: { userId, date: today } },
    });
    const last = await this.prisma.checkIn.findFirst({
      where: { userId },
      orderBy: { date: 'desc' },
    });
    return {
      today: !!todayCheck,
      streak: todayCheck?.streak ?? (this.isYesterday(last?.date) ? last!.streak : 0),
      total: await this.prisma.checkIn.count({ where: { userId } }),
    };
  }

  async expLog(userId: string, page: number, perPage: number) {
    const where = { userId };
    const [total, items] = await this.prisma.$transaction([
      this.prisma.expLog.count({ where }),
      this.prisma.expLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * perPage,
        take: perPage,
      }),
    ]);
    return {
      data: items.map((e) => ({
        id: e.id,
        amount: e.amount,
        reason: e.reason,
        refId: e.refId,
        createdAt: e.createdAt,
      })),
      pagination: pageInfo(page, perPage, total),
    };
  }

  private async applyExp(userId: string, amount: number, reason: string, refId?: string) {
    await this.prisma.expLog.create({
      data: { userId, amount, reason, refId },
    });
    const cur = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { exp: true },
    });
    const newExp = (cur?.exp ?? 0) + amount;
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { exp: newExp, level: levelFromExp(newExp) },
      select: { exp: true, level: true },
    });
    return { exp: user.exp, level: levelFromExp(user.exp) };
  }

  private isYesterday(date?: Date | null): boolean {
    if (!date) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date.getTime() >= today.getTime() - 24 * 60 * 60 * 1000 && date.getTime() < today.getTime();
  }
}
