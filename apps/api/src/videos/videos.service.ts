import { Injectable, NotFoundException } from '@nestjs/common';
import { pageInfo } from '../common/pagination';
import { PrismaService } from '../prisma/prisma.service';

function inferPlatform(url: string, explicit?: string): string {
  if (explicit) return explicit;
  if (/bilibili\.com|b23\.tv/i.test(url)) return 'bilibili';
  if (/douyin\.com/i.test(url)) return 'douyin';
  if (/youtube\.com|youtu\.be/i.test(url)) return 'youtube';
  return 'other';
}

@Injectable()
export class VideosService {
  constructor(private readonly prisma: PrismaService) {}

  async listPublic(kind?: string, page = 1, perPage = 20) {
    const where: Record<string, unknown> = { published: true };
    if (kind) where.kind = kind;
    const [total, items] = await this.prisma.$transaction([
      this.prisma.videoEntry.count({ where }),
      this.prisma.videoEntry.findMany({
        where,
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
        skip: (page - 1) * perPage,
        take: perPage,
      }),
    ]);
    return {
      data: items.map(videoView),
      pagination: pageInfo(page, perPage, total),
    };
  }

  async listAdmin(kind?: string, page = 1, perPage = 20) {
    const where: Record<string, unknown> = {};
    if (kind) where.kind = kind;
    const [total, items] = await this.prisma.$transaction([
      this.prisma.videoEntry.count({ where }),
      this.prisma.videoEntry.findMany({
        where,
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
        skip: (page - 1) * perPage,
        take: perPage,
      }),
    ]);
    return {
      data: items.map(videoView),
      pagination: pageInfo(page, perPage, total),
    };
  }

  async create(dto: {
    kind: string;
    title: string;
    url: string;
    platform?: string;
    coverImage?: string | null;
    description?: string | null;
    published?: boolean;
    sortOrder?: number;
  }) {
    const video = await this.prisma.videoEntry.create({
      data: {
        kind: dto.kind,
        title: dto.title,
        url: dto.url,
        platform: inferPlatform(dto.url, dto.platform),
        coverImage: dto.coverImage ?? null,
        description: dto.description ?? null,
        published: dto.published ?? true,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
    return videoView(video);
  }

  async update(
    id: string,
    dto: {
      kind?: string;
      title?: string;
      url?: string;
      platform?: string;
      coverImage?: string | null;
      description?: string | null;
      published?: boolean;
      sortOrder?: number;
    },
  ) {
    const existing = await this.prisma.videoEntry.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('video not found');
    const url = dto.url ?? existing.url;
    const video = await this.prisma.videoEntry.update({
      where: { id },
      data: {
        kind: dto.kind ?? existing.kind,
        title: dto.title ?? existing.title,
        url,
        platform: inferPlatform(url, dto.platform ?? existing.platform),
        coverImage: dto.coverImage !== undefined ? dto.coverImage : existing.coverImage,
        description: dto.description !== undefined ? dto.description : existing.description,
        published: dto.published ?? existing.published,
        sortOrder: dto.sortOrder ?? existing.sortOrder,
      },
    });
    return videoView(video);
  }

  async delete(id: string): Promise<void> {
    const result = await this.prisma.videoEntry.delete({ where: { id } }).catch(() => null);
    if (!result) throw new NotFoundException('video not found');
  }
}

function videoView(v: {
  id: string;
  kind: string;
  title: string;
  url: string;
  platform: string;
  coverImage: string | null;
  description: string | null;
  published: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: v.id,
    kind: v.kind,
    title: v.title,
    url: v.url,
    platform: v.platform,
    coverImage: v.coverImage,
    description: v.description,
    published: v.published,
    sortOrder: v.sortOrder,
    createdAt: v.createdAt,
    updatedAt: v.updatedAt,
  };
}
