import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Permissions } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../common/interfaces';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateUserRolesDto } from './dto/update-user-roles.dto';

/**
 * PHASE 2 — this controller had no `@Permissions()` on any route, and
 * findById/update/delete/updateRoles took no organizationId at all: any
 * authenticated user, from any organization, could view, edit, delete, or
 * reassign the roles of a user in a *different* tenant by UUID. Found while
 * building the field-worker access-code feature on top of this controller;
 * fixed here rather than built on top of.
 */
@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Permissions('view.users')
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('isActive') isActive?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
  ) {
    return this.usersService.findAll({
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      search,
      isActive,
      organizationId: user.organizationId,
      sortBy,
      sortOrder,
    });
  }

  @Get(':id')
  @Permissions('view.users')
  async findById(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.usersService.findById(id, user.organizationId);
  }

  @Post()
  @Permissions('create.users')
  async create(
    @Body() dto: CreateUserDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.usersService.create(dto, user.organizationId);
  }

  @Put(':id')
  @Permissions('edit.users')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.usersService.update(id, dto, user.organizationId);
  }

  @Delete(':id')
  @Permissions('delete.users')
  async delete(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.usersService.delete(id, user.organizationId);
  }

  @Put(':id/roles')
  @Permissions('edit.users')
  async updateRoles(
    @Param('id') id: string,
    @Body() dto: UpdateUserRolesDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.usersService.updateRoles(id, dto, user.organizationId);
  }

  @Post(':id/field-access-code')
  @Permissions('edit.users')
  async generateFieldAccessCode(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.usersService.generateFieldAccessCode(id, user.organizationId);
  }

  @Delete(':id/field-access-code')
  @Permissions('edit.users')
  async revokeFieldAccessCode(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.usersService.revokeFieldAccessCode(id, user.organizationId);
  }
}
