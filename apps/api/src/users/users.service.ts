import { ConflictException, Injectable } from '@nestjs/common';
import { User } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';

export type PublicUser = Omit<User, 'passwordHash'>;

export interface UserSummary {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  role: 'guest' | 'member' | 'editor' | 'moderator' | 'admin';
  createdAt: Date;
}

export interface UserResponse extends UserSummary {
  bio: string | null;
  updatedAt: Date;
}

export function toUserSummary(user: User): UserSummary {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName ?? user.username,
    avatarUrl: user.avatarUrl,
    role: user.role.toLowerCase() as UserSummary['role'],
    createdAt: user.createdAt,
  };
}

export function toUserResponse(user: User): UserResponse {
  return {
    ...toUserSummary(user),
    bio: user.bio,
    updatedAt: user.updatedAt,
  };
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async findByUsername(username: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { username } });
  }

  async update(id: string, data: {
    displayName?: string;
    avatarUrl?: string;
    bio?: string;
  }): Promise<User> {
    return this.prisma.user.update({ where: { id }, data });
  }

  async register(dto: {
    email: string;
    username: string;
    password: string;
  }): Promise<User> {
    const existing = await this.prisma.user.findFirst({
      where: { OR: [{ email: dto.email }, { username: dto.username }] },
    });
    if (existing) {
      throw new ConflictException('email or username already exists');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    return this.prisma.user.create({
      data: {
        email: dto.email,
        username: dto.username,
        displayName: dto.username,
        passwordHash,
      },
    });
  }
}
