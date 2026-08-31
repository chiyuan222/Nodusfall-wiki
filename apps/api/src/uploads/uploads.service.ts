import { Injectable } from '@nestjs/common';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';

export interface UploadedFilePayload {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
}

function safeName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_');
}

@Injectable()
export class UploadsService {
  constructor(private readonly prisma: PrismaService) {}

  async upload(userId: string, file: UploadedFilePayload) {
    const key = `${randomUUID()}_${safeName(file.originalname)}`;
    await mkdir(join(process.cwd(), 'uploads'), { recursive: true });
    await writeFile(join(process.cwd(), 'uploads', key), file.buffer);

    const upload = await this.prisma.upload.create({
      data: {
        url: `/uploads/${key}`,
        key,
        mimeType: file.mimetype,
        size: file.size,
        userId,
      },
    });
    return {
      id: upload.id,
      url: upload.url,
      key: upload.key,
      mimeType: upload.mimeType,
      size: upload.size,
      createdAt: upload.createdAt,
    };
  }

  async presign(userId: string, dto: { filename: string; contentType: string; size?: number }) {
    const key = `${randomUUID()}_${safeName(dto.filename)}`;
    return {
      uploadUrl: `/v1/uploads?key=${encodeURIComponent(key)}`,
      key,
      url: `/uploads/${key}`,
      expiresIn: 900,
    };
  }
}
