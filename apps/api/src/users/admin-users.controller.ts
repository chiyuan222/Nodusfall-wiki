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
import {
  canDiscipline,
  hasPermission,
  isOwner,
  PERMISSIONS,
  roleRank,
} from '../common/roles';
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
  wiki_editor: 'Wiki 小编',
  guide_editor: '攻略小编',
  video_editor: '视频小编',
  wiki_moderator: 'Wiki 版主',
  guide_moderator: '攻略版主',
  forum_moderator: '论坛版主',
  video_moderator: '视频版主',
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
  manage_all_boards: '总板块管理',
  manage_wiki_board: 'Wiki 板块管理',
  manage_guide_board: '攻略板块管理',
  manage_forum_board: '论坛板块管理',
  manage_video_board: '视频板块管理',
  manage_reports: '举报管理',
  grant_wiki_create: '授予 Wiki 词条创建',
  grant_guide_create: '授予编撰攻略',
  grant_video_share: '授予视频分享',
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
  async list(@Req() req: AdminRequest, @Query() query: AdminListUsersQueryDto) {
    this.assertManageUsers(req);
    const result = await this.usersService.listAdminUsers({
      q: query.q,
      group: query.group,
      role: query.role,
      status: query.status,
      level: query.level,
      page: query.page,
      perPage: query.perPage,
    });
    if (!isOwner(req.user.role)) {
      result.data = result.data.map((u) => ({ ...u, email: '', phone: '' }));
    }
    return result;
  }

  @Get(':userId')
  async get(@Req() req: AdminRequest, @Param('userId') userId: string) {
    this.assertManageUsers(req);
    const data = await this.usersService.getAdminUser(userId);
    if (!isOwner(req.user.role)) {
      data.email = '';
      data.phone = '';
    }
    return { data };
  }

  @Patch(':userId')
  async update(
    @Req() req: AdminRequest,
    @Param('userId') userId: string,
    @Body() dto: AdminUpdateUserDto,
  ) {
    this.assertManageUsers(req);
    const before = await this.usersService.getAdminUser(userId);
    if (dto.level !== undefined) {
      throw new ForbiddenException('等级不可修改（全员锁定）');
    }
    if (dto.group !== undefined && !isOwner(req.user.role)) {
      throw new ForbiddenException('仅站长可修改用户组');
    }
    if (
      (dto.status === 'banned' || dto.status === 'muted') &&
      !isOwner(req.user.role) &&
      !canDiscipline(req.user.role, before.role.toUpperCase())
    ) {
      throw new ForbiddenException('无权处置该账号（只能处置低于自己等级的账号）');
    }
    if (dto.role !== undefined) {
      this.assertRoleChange(req.user.role, before.role, dto.role);
    }
    if (dto.permissions !== undefined && !isOwner(req.user.role)) {
      throw new ForbiddenException('only owner can change permissions');
    }
    if (
      dto.wikiCreateGranted !== undefined &&
      !hasPermission(req.user.role, req.user.permissions, PERMISSIONS.GRANT_WIKI_CREATE)
    ) {
      throw new ForbiddenException('无授予 Wiki 词条创建资格权限');
    }
    if (
      dto.guideCreateGranted !== undefined &&
      !hasPermission(req.user.role, req.user.permissions, PERMISSIONS.GRANT_GUIDE_CREATE)
    ) {
      throw new ForbiddenException('无授予编撰攻略资格权限');
    }
    if (
      dto.videoShareGranted !== undefined &&
      !hasPermission(req.user.role, req.user.permissions, PERMISSIONS.GRANT_VIDEO_SHARE)
    ) {
      throw new ForbiddenException('无授予视频分享资格权限');
    }
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

  private assertRoleChange(
    actorRole: string,
    beforeRoleLower: string,
    newRole: string,
  ): void {
    const targetRole = beforeRoleLower.toUpperCase();
    if (targetRole === 'OWNER') {
      throw new ForbiddenException('不可变更站长角色');
    }
    if (actorRole === 'OWNER') {
      return;
    }
    if (actorRole === 'ADMIN') {
      if (newRole === 'admin') {
        throw new ForbiddenException('仅站长可分配管理员角色');
      }
      if (roleRank(targetRole) >= 3) {
        throw new ForbiddenException('无权变更管理员角色');
      }
      return;
    }
    const allowedByModerator: Record<string, string[]> = {
      WIKI_MODERATOR: ['member', 'wiki_editor'],
      GUIDE_MODERATOR: ['member', 'guide_editor'],
      VIDEO_MODERATOR: ['member', 'video_editor'],
      FORUM_MODERATOR: ['member'],
    };
    const allowed = allowedByModerator[actorRole];
    if (!allowed) {
      throw new ForbiddenException('无权分配角色');
    }
    if (roleRank(targetRole) >= 2) {
      throw new ForbiddenException('无权变更同级或更高级角色的账号');
    }
    if (!allowed.includes(newRole)) {
      throw new ForbiddenException('只能分配对应分区的成员或小编角色');
    }
  }

  private buildChangeLines(
    before: {
      role: string;
      group: string;
      status: string;
      permissions: string[];
      wikiCreateGranted: boolean;
      guideCreateGranted: boolean;
      videoShareGranted: boolean;
      [key: string]: unknown;
    },
    after: {
      role: string;
      group: string;
      status: string;
      permissions: string[];
      wikiCreateGranted: boolean;
      guideCreateGranted: boolean;
      videoShareGranted: boolean;
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
    if (
      dto.guideCreateGranted !== undefined &&
      before.guideCreateGranted !== after.guideCreateGranted
    ) {
      lines.push(
        after.guideCreateGranted
          ? '你已获得编撰攻略资格。'
          : '你的编撰攻略资格已被收回。',
      );
    }
    if (
      dto.videoShareGranted !== undefined &&
      before.videoShareGranted !== after.videoShareGranted
    ) {
      lines.push(
        after.videoShareGranted
          ? '你已获得视频分享资格。'
          : '你的视频分享资格已被收回。',
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
