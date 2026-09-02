import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TextFilterService {
  constructor(private readonly prisma: PrismaService) {}

  async findHit(text: string): Promise<string | null> {
    const words = await this.prisma.sensitiveWord.findMany({
      select: { word: true },
    });
    const lower = text.toLowerCase();
    for (const w of words) {
      const word = w.word.trim();
      if (word && lower.includes(word.toLowerCase())) {
        return w.word;
      }
    }
    return null;
  }

  async assertSafe(text: string): Promise<void> {
    const hit = await this.findHit(text);
    if (hit) {
      throw new BadRequestException('内容包含违规词汇，已拦截');
    }
  }
}
