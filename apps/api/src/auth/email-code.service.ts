import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { appendFileSync, mkdirSync } from 'node:fs';
import { randomInt } from 'node:crypto';
import { join } from 'node:path';
import * as bcrypt from 'bcryptjs';
import * as nodemailer from 'nodemailer';
import { PrismaService } from '../prisma/prisma.service';

const CODE_TTL_MS = 10 * 60 * 1000;
const RESEND_INTERVAL_MS = 60 * 1000;
const DAILY_LIMIT = 5;

@Injectable()
export class EmailCodeService {
  private readonly logger = new Logger(EmailCodeService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async sendCode(email: string): Promise<void> {
    const normalized = email.trim().toLowerCase();

    const latest = await this.prisma.emailCode.findFirst({
      where: { email: normalized, createdAt: { gt: new Date(Date.now() - RESEND_INTERVAL_MS) } },
      orderBy: { createdAt: 'desc' },
    });
    if (latest) {
      const wait = Math.ceil(
        (latest.createdAt.getTime() + RESEND_INTERVAL_MS - Date.now()) / 1000,
      );
      throw new HttpException(
        { detail: '发送过于频繁，请稍后再试', retryAfter: Math.max(wait, 1) },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);
    const todayCount = await this.prisma.emailCode.count({
      where: { email: normalized, createdAt: { gte: dayStart } },
    });
    if (todayCount >= DAILY_LIMIT) {
      throw new HttpException(
        { detail: '今日验证码发送次数已达上限', retryAfter: 3600 },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const code = String(randomInt(0, 1000000)).padStart(6, '0');
    await this.prisma.emailCode.create({
      data: {
        email: normalized,
        codeHash: await bcrypt.hash(code, 10),
        expiresAt: new Date(Date.now() + CODE_TTL_MS),
      },
    });

    await this.deliver(normalized, code);
  }

  async verify(email: string, code: string): Promise<boolean> {
    const normalized = email.trim().toLowerCase();
    const record = await this.prisma.emailCode.findFirst({
      where: {
        email: normalized,
        consumedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });
    if (!record) return false;
    const ok = await bcrypt.compare(code, record.codeHash);
    if (!ok) return false;
    await this.prisma.emailCode.update({
      where: { id: record.id },
      data: { consumedAt: new Date() },
    });
    return true;
  }

  private async deliver(email: string, code: string): Promise<void> {
    const host = this.config.get<string>('SMTP_HOST');
    const from = this.config.get<string>('SMTP_FROM', 'noreply@nodusfall.local');

    if (!host) {
      // 开发模式：验证码写入 .dev/email-codes.log 并输出控制台，便于本地联调
      const line = `[${new Date().toISOString()}] ${email} code=${code}\n`;
      try {
        const dir = join(process.cwd(), '.dev');
        mkdirSync(dir, { recursive: true });
        appendFileSync(join(dir, 'email-codes.log'), line);
      } catch {
        // 日志写入失败不阻塞发送流程
      }
      this.logger.log(line.trim());
      return;
    }

    const transporter = nodemailer.createTransport({
      host,
      port: Number(this.config.get('SMTP_PORT', '465')),
      secure: this.config.get('SMTP_SECURE', 'true') === 'true',
      ...(this.config.get<string>('SMTP_USER')
        ? {
            auth: {
              user: this.config.get<string>('SMTP_USER')!,
              pass: this.config.get<string>('SMTP_PASS'),
            },
          }
        : {}),
    });
    await transporter.sendMail({
      from,
      to: email,
      subject: '【源神小窝】邮箱注册验证码',
      text: `你的注册验证码是：${code}，10 分钟内有效。若非本人操作请忽略本邮件。`,
    });
  }
}
