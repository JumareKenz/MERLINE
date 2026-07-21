import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { OrganizationsService } from './organizations.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';

@Controller('organizations')
@UseGuards(JwtAuthGuard)
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Post()
  create(@Body() dto: CreateOrganizationDto) {
    return this.organizationsService.create(dto);
  }

  @Get()
  findAll() {
    return this.organizationsService.findAll();
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.organizationsService.findById(id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateOrganizationDto) {
    return this.organizationsService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.organizationsService.remove(id);
  }

  @Get(':orgId/members')
  async getMembers(@Param('orgId') orgId: string) {
    return this.organizationsService.getMembers(orgId);
  }

  @Post(':orgId/members')
  async addMember(
    @Param('orgId') orgId: string,
    @Body() body: { email: string; firstName: string; lastName: string; roleId?: string },
    @CurrentUser() user: any,
  ) {
    return this.organizationsService.addMember(orgId, body, user.id);
  }

  @Put(':orgId/members/:userId/role')
  async updateMemberRole(
    @Param('orgId') orgId: string,
    @Param('userId') userId: string,
    @Body() body: { role_id: string },
  ) {
    return this.organizationsService.updateMemberRole(orgId, userId, body.role_id);
  }

  @Delete(':orgId/members/:userId')
  async removeMember(
    @Param('orgId') orgId: string,
    @Param('userId') userId: string,
  ) {
    return this.organizationsService.removeMember(orgId, userId);
  }
}
