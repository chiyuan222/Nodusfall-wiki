import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { appendFileSync, mkdirSync } from 'node:fs';
import { randomInt } from 'node:crypto';
import { join } from 'node:path';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';

const CODE_TTL_MS = 10 * 60 * 1000;
const RESEND_INTERVAL_MS = 60 * 1000;
const DAILY_LIMIT = 5;

@Injectable()
export class SmsCodeService {
  private readonly logger = new Logger(SmsCodeService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async sendCode(phone: string): Promise<void> {
    const latest = await this.prisma.smsCode.findFirst({
      where: { phone, createdAt: { gt: new Date(Date.now() - RESEND_INTERVAL_MS) } },
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
    const todayCount = await this.prisma.smsCode.count({
      where: { phone, createdAt: { gte: dayStart } },
    });
    if (todayCount >= DAILY_LIMIT) {
      throw new HttpException(
        { detail: '今日验证码发送次数已达上限', retryAfter: 3600 },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const code = String(randomInt(0, 1000000)).padStart(6, '0');
    await this.prisma.smsCode.create({
      data: {
        phone,
        codeHash: await bcrypt.hash(code, 10),
        expiresAt: new Date(Date.now() + CODE_TTL_MS),
      },
    });

    await this.deliver(phone, code);
  }

  async verify(phone: string, code: string): Promise<boolean> {
    const record = await this.prisma.smsCode.findFirst({
      where: {
        phone,
        consumedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });
    if (!record) return false;
    const ok = await bcrypt.compare(code, record.codeHash);
    if (!ok) return false;
    await this.prisma.smsCode.update({
      where: { id: record.id },
      data: { consumedAt: new Date() },
    });
    return true;
  }

  private async deliver(phone: string, code: string): Promise<void> {
    const secretId = this.config.get<string>('SMS_SECRET_ID');
    const secretKey = this.config.get<string>('SMS_SECRET_KEY');
    const signName = this.config.get<string>('SMS_SIGN_NAME');
    const templateId = this.config.get<string>('SMS_TEMPLATE_ID');
    const sdkAppId = this.config.get<string>('SMS_SDK_APP_ID');

    if (!secretId || !secretKey || !signName || !templateId || !sdkAppId) {
      // 开发模式：验证码写入 .dev/sms-codes.log 并输出控制台，便于本地联调
      const line = `[${new Date().toISOString()}] ${phone} code=${code}\n`;
      try {
        const dir = join(process.cwd(), '.dev');
        mkdirSync(dir, { recursive: true });
        appendFileSync(join(dir, 'sms-codes.log'), line);
      } catch {
        // 日志写入失败不阻塞发送流程
      }
      this.logger.log(line.trim());
      return;
    }

    // 腾讯云短信发送（需安装 tencentcloud-sdk-nodejs-sms 并配置短信签名/模板）
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { sms } = require('tencentcloud-sdk-nodejs-sms');
      const client = new sms.v20210111.Client({
        credential: {
          secretId,
          secretKey,
        },
        region: this.config.get<string>('SMS_REGION', 'ap-guangzhou'),
        profile: {
          httpProfile: { endpoint: 'sms.tencentcloudapi.com' },
        },
      });
      await client.SendSms({
        PhoneNumberSet: [`+86${phone}`],
        SmsSdkAppId: this.config.get<string>('SMS_SDK_APP_ID'),
        SignName: this.config.get<string>('SMS_SIGN_NAME'),
        TemplateId: this.config.get<string>('SMS_TEMPLATE_ID'),
        TemplateParamSet: [code, '10'],
      });
      this.logger.log(`短信验证码已发送至 ${phone}`);
    } catch (e) {
      this.logger.error('短信发送失败', e instanceof Error ? e.message : e);
      throw new HttpException(
        { detail: '短信发送失败，请稍后再试' },
        HttpStatus.BAD_GATEWAY,
      );
    }
  }
}
