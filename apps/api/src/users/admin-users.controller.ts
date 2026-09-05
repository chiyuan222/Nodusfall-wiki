import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuditService } from '../audit/audit.service';
import { isOwner, hasPermission, PERMISSIONS } from '../common/roles';
import { MessagesService } from '../messages/messages.service';
import { AdminUpdateUserDto } from './dto/admin-update-user.dto';
import { AdminListUsersQueryDto } from './dto/admin-list-users-query.dto';
import { UsersService } from './users.service';

interface AdminRequest extends Request {
  user: {
    sub: string;
    role: string;
    permissions: string[];
  };
}

const ROLE_LABEL: Record<string, string> = {
  member: '成员',
  editor: '编辑',
  moderator: '版主',
  admin: '管理员',
  owner: '站长',
};

const GROUP_LABEL: Record<string, string> = {
  normal: '普通用户',
  verified: '认证用户',
  premium: '付费用户',
};

const PERMISSION_LABEL: Record<string, string> = {
  manage_users: '用户管理',
  manage_content: '内容管理',
  manage_forum: '论坛管理',
  manage_cms: '站点内容管理',
  manage_deletion: '删除管理',
  grant_wiki_create: '词条创建授权',
};

@Controller('admin/users')
@UseGuards(JwtAuthGuard)
export class AdminUsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly auditService: AuditService,
    private readonly messagesService: MessagesService,
  ) {}

  private assertManageUsers(req: AdminRequest): void {
    if (!hasPermission(req.user.role, req.user.permissions, PERMISSIONS.MANAGE_USERS)) {
      throw new ForbiddenException('admin only');
    }
  }

  @Get()
  list(@Req() req: AdminRequest, @Query() query: AdminListUsersQueryDto) {
    this.assertManageUsers(req);
    return this.usersService.listAdminUsers({
      q: query.q,
      group: query.group,
      role: query.role,
      status: query.status,
      level: query.level,
      page: query.page,
      perPage: query.perPage,
    });
  }

  @Get(':userId')
  async get(@Req() req: AdminRequest, @Param('userId') userId: string) {
    this.assertManageUsers(req);
    return { data: await this.usersService.getAdminUser(userId) };
  }

  @Patch(':userId')
  async update(
    @Req() req: AdminRequest,
    @Param('userId') userId: string,
    @Body() dto: AdminUpdateUserDto,
  ) {
    if (
      (dto.role !== undefined || dto.permissions !== undefined) &&
      !isOwner(req.user.role)
    ) {
      throw new ForbiddenException('only owner can change role or permissions');
    }
    this.assertManageUsers(req);
    const before = await this.usersService.getAdminUser(userId);
    const data = await this.usersService.updateAdminUser(userId, dto);
    await this.auditService.log(
      req.user.sub,
      'user.update',
      'user',
      userId,
      `更新用户（${Object.keys(dto).filter((k) => dto[k as keyof typeof dto] !== undefined).join('、') || '无字段'}）`,
    );
    const lines = this.buildChangeLines(before, data, dto);
    if (lines.length > 0) {
      try {
        await this.messagesService.notifyUserChange(
          req.user.sub,
          userId,
          `【账号状态通知】\n${lines.join('\n')}`,
        );
      } catch (e) {
        // 通知失败不影响权限变更主流程
        console.error('notify user change failed', e);
      }
    }
    return { data };
  }

  private buildChangeLines(
    before: {
      role: string;
      group: string;
      status: string;
      permissions: string[];
      wikiCreateGranted: boolean;
      [key: string]: unknown;
    },
    after: {
      role: string;
      group: string;
      status: string;
      permissions: string[];
      wikiCreateGranted: boolean;
      [key: string]: unknown;
    },
    dto: AdminUpdateUserDto,
  ): string[] {
    const lines: string[] = [];

    if (dto.role && before.role !== after.role) {
      lines.push(
        `你的账号角色已变更为「${ROLE_LABEL[after.role] ?? after.role}」（原「${
          ROLE_LABEL[before.role] ?? before.role
        }」）`,
      );
    }
    if (dto.group && before.group !== after.group) {
      lines.push(
        `你的账号用户组已变更为「${GROUP_LABEL[after.group] ?? after.group}」（原「${
          GROUP_LABEL[before.group] ?? before.group
        }」）`,
      );
    }
    if (dto.status) {
      if (after.status === 'banned') {
        const reason = dto.banReason ? `，原因：${dto.banReason}` : '';
        const until = dto.banUntil
          ? `，解封时间：${new Date(dto.banUntil).toISOString().slice(0, 10)}`
          : '';
        lines.push(`你的账号已被封禁${reason}${until}，如有疑问请联系站长。`);
      } else if (after.status === 'muted') {
        const until = dto.mutedUntil
          ? `，至 ${new Date(dto.mutedUntil).toISOString().slice(0, 10)}`
          : '';
        lines.push(`你的账号已被禁言${until}，期间无法发言。`);
      } else if (after.status === 'active' && before.status === 'banned') {
        lines.push('你的账号已解封，可正常登录使用。');
      } else if (after.status === 'active' && before.status === 'muted') {
        lines.push('你的账号禁言已解除，可正常发言。');
      }
    }
    if (
      dto.wikiCreateGranted !== undefined &&
      before.wikiCreateGranted !== after.wikiCreateGranted
    ) {
      lines.push(
        after.wikiCreateGranted
          ? '你已获得 Wiki 词条创建权限。'
          : '你的 Wiki 词条创建权限已被收回。',
      );
    }
    if (dto.permissions !== undefined) {
      const added = (after.permissions ?? []).filter(
        (p) => !(before.permissions ?? []).includes(p),
      );
      const removed = (before.permissions ?? []).filter(
        (p) => !(after.permissions ?? []).includes(p),
      );
      const parts: string[] = [];
      if (added.length > 0) {
        parts.push(`新增 ${added.map((p) => PERMISSION_LABEL[p] ?? p).join('、')}`);
      }
      if (removed.length > 0) {
        parts.push(`移除 ${removed.map((p) => PERMISSION_LABEL[p] ?? p).join('、')}`);
      }
      if (parts.length > 0) {
        lines.push(`你的管理权限已更新：${parts.join('；')}。`);
      }
    }
    return lines;
  }
}
