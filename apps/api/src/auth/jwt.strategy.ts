import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../prisma/prisma.service';

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  type: 'access';
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_ACCESS_SECRET', 'dev-access-secret'),
    });
  }

  async validate(payload: JwtPayload) {
    if (payload.type !== 'access') {
      throw new UnauthorizedException('invalid token type');
    }
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        role: true,
        permissions: true,
        status: true,
        group: true,
        level: true,
        wikiCreateGranted: true,
      },
    });
    if (!user || user.status === 'BANNED' || user.status === 'DELETED') {
      throw new UnauthorizedException('account disabled');
    }
    return {
      sub: user.id,
      email: payload.email,
      role: user.role,
      type: payload.type,
      permissions: user.permissions,
      status: user.status,
      group: user.group,
      level: user.level,
      wikiCreateGranted: user.wikiCreateGranted,
    };
  }
}
