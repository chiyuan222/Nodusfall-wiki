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

@Controller('admin/users')
@UseGuards(JwtAuthGuard)
export class AdminUsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly auditService: AuditService,
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
    const data = await this.usersService.updateAdminUser(userId, dto);
    await this.auditService.log(
      req.user.sub,
      'user.update',
      'user',
      userId,
      `更新用户（${Object.keys(dto).filter((k) => dto[k as keyof typeof dto] !== undefined).join('、') || '无字段'}）`,
    );
    return { data };
  }
}
