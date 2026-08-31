import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ContentService {
  constructor(private readonly prisma: PrismaService) {}

  async get(slug: string): Promise<any> {
    if (slug !== 'home' && slug !== 'world') {
      throw new NotFoundException('content page not found');
    }
    const page = await this.prisma.contentPage.findUnique({ where: { slug } });
    if (!page) {
      throw new NotFoundException('content page not found');
    }
    return page.data;
  }

  async put(slug: string, data: any): Promise<any> {
    if (slug !== 'home' && slug !== 'world') {
      throw new NotFoundException('content page not found');
    }
    const page = await this.prisma.contentPage.upsert({
      where: { slug },
      update: { data },
      create: { slug, data },
    });
    return page.data;
  }
}
