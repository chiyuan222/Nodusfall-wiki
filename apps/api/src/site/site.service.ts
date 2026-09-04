import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const SECTIONS_KEY = 'sections';
const FLOATING_KEY = 'floating-windows';
const APPEARANCE_KEY = 'appearance';

const DEFAULT_SECTIONS = {
  home: true,
  world: true,
  wiki: true,
  guides: true,
  forum: true,
  videos: true,
};

const DEFAULT_FLOATING = {
  left: { enabled: false, imageUrl: null, linkUrl: null },
  right: { enabled: false, imageUrl: null, linkUrl: null },
};

@Injectable()
export class SiteService {
  constructor(private readonly prisma: PrismaService) {}

  async getSections() {
    const cfg = await this.prisma.siteConfig.findUnique({
      where: { key: SECTIONS_KEY },
    });
    return { ...DEFAULT_SECTIONS, ...((cfg?.data as object) ?? {}) };
  }

  async updateSections(dto: Record<string, boolean>) {
    const current = await this.getSections();
    const next = { ...current, ...dto };
    await this.prisma.siteConfig.upsert({
      where: { key: SECTIONS_KEY },
      create: { key: SECTIONS_KEY, data: next },
      update: { data: next },
    });
    return next;
  }

  async getFloatingWindows() {
    const cfg = await this.prisma.siteConfig.findUnique({
      where: { key: FLOATING_KEY },
    });
    const data = (cfg?.data as object) ?? {};
    return {
      left: { ...DEFAULT_FLOATING.left, ...((data as any).left ?? {}) },
      right: { ...DEFAULT_FLOATING.right, ...((data as any).right ?? {}) },
    };
  }

  async updateFloatingWindows(dto: {
    left?: object;
    right?: object;
  }) {
    const current = await this.getFloatingWindows();
    const next = {
      left: dto.left ? { ...current.left, ...dto.left } : current.left,
      right: dto.right ? { ...current.right, ...dto.right } : current.right,
    };
    await this.prisma.siteConfig.upsert({
      where: { key: FLOATING_KEY },
      create: { key: FLOATING_KEY, data: next },
      update: { data: next },
    });
    return next;
  }

  async getAppearance() {
    const cfg = await this.prisma.siteConfig.findUnique({
      where: { key: APPEARANCE_KEY },
    });
    const data = (cfg?.data as { heading?: Record<string, unknown> }) ?? {};
    const heading = data.heading ?? {};
    return {
      heading: {
        color: heading.color ?? null,
        fontFamily: heading.fontFamily ?? null,
        fontWeight: heading.fontWeight ?? null,
      },
    };
  }

  async updateAppearance(dto: {
    heading?: {
      color?: string | null;
      fontFamily?: string | null;
      fontWeight?: number | null;
    };
  }) {
    const current = await this.getAppearance();
    const next = {
      heading: dto.heading
        ? {
            color: dto.heading.color !== undefined ? dto.heading.color : current.heading.color,
            fontFamily:
              dto.heading.fontFamily !== undefined
                ? dto.heading.fontFamily
                : current.heading.fontFamily,
            fontWeight:
              dto.heading.fontWeight !== undefined
                ? dto.heading.fontWeight
                : current.heading.fontWeight,
          }
        : current.heading,
    };
    await this.prisma.siteConfig.upsert({
      where: { key: APPEARANCE_KEY },
      create: { key: APPEARANCE_KEY, data: next },
      update: { data: next },
    });
    return next;
  }
}
