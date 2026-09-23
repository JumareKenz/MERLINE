import {
  NotFoundException,
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import type { AuthenticatedUser } from '../common/interfaces';
import { OrganizationsService } from './organizations.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';

@Controller('organizations')
@UseGuards(JwtAuthGuard)
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  /**
   * PHASE 2 — tenancy and authorization closed on this controller.
   *
   * `TenantGuard` only inspects `:orgId`/`:organizationId`, so the `:id`
   * routes below were never tenant-checked, and no route carried
   * @Permissions. Any signed-in user — including a field interviewer on an
   * access code — could list every organization, read, edit or delete any
   * of them by id, and change any member's role in their own organization
   * (including granting themselves Administrator). Now:
   *   - every `:id` route resolves only the caller's own organization;
   *   - GET /organizations returns only the caller's organization (same
   *     array shape as before, so existing consumers keep working);
   *   - each mutating route and each member route requires a permission.
   */
  @Post()
  @Permissions('edit.organizations')
  create(@Body() dto: CreateOrganizationDto) {
    return this.organizationsService.create(dto);
  }

  @Get()
  async findAll(@CurrentUser() user: AuthenticatedUser) {
    return [await this.organizationsService.findById(user.organizationId)];
  }

  @Get(':id')
  findById(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.organizationsService.findById(this.own(id, user));
  }

  @Put(':id')
  @Permissions('edit.organizations')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateOrganizationDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.organizationsService.update(this.own(id, user), dto);
  }

  @Delete(':id')
  @Permissions('edit.organizations')
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.organizationsService.remove(this.own(id, user));
  }

  @Get(':orgId/members')
  @Permissions('view.users')
  async getMembers(@Param('orgId') orgId: string) {
    return this.organizationsService.getMembers(orgId);
  }

  @Post(':orgId/members')
  @Permissions('create.users')
  async addMember(
    @Param('orgId') orgId: string,
    @Body()
    body: {
      email: string;
      firstName: string;
      lastName: string;
      roleId?: string;
    },
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.organizationsService.addMember(orgId, body, user.id);
  }

  @Put(':orgId/members/:userId/role')
  @Permissions('edit.users')
  async updateMemberRole(
    @Param('orgId') orgId: string,
    @Param('userId') userId: string,
    @Body() body: { role_id: string },
  ) {
    return this.organizationsService.updateMemberRole(
      orgId,
      userId,
      body.role_id,
    );
  }

  @Delete(':orgId/members/:userId')
  @Permissions('delete.users')
  async removeMember(
    @Param('orgId') orgId: string,
    @Param('userId') userId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.organizationsService.removeMember(orgId, userId, user.id);
  }

  /** Same response for "not yours" and "does not exist". */
  private own(id: string, user: AuthenticatedUser): string {
    if (id !== user.organizationId) {
      throw new NotFoundException('Organization not found');
    }
    return id;
  }
}
