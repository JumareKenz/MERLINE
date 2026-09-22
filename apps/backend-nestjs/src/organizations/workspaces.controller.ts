import {
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
import { WorkspacesService } from './workspaces.service';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { UpdateWorkspaceDto } from './dto/update-workspace.dto';

@UseGuards(JwtAuthGuard)
@Controller()
export class WorkspacesController {
  constructor(private readonly workspacesService: WorkspacesService) {}

  @Get('organizations/:orgId/workspaces')
  @Permissions('view.workspaces')
  findAll(@Param('orgId') orgId: string) {
    return this.workspacesService.findAll(orgId);
  }

  @Get('workspaces')
  @Permissions('view.workspaces')
  findAllFlat(@CurrentUser() user: any) {
    return this.workspacesService.findAll(user.organizationId);
  }

  @Post('organizations/:orgId/workspaces')
  @Permissions('create.workspaces')
  create(@Param('orgId') orgId: string, @Body() dto: CreateWorkspaceDto) {
    return this.workspacesService.create(orgId, dto);
  }

  @Post('workspaces')
  @Permissions('create.workspaces')
  createFlat(@Body() dto: CreateWorkspaceDto, @CurrentUser() user: any) {
    return this.workspacesService.create(user.organizationId, dto);
  }

  @Get('organizations/:orgId/workspaces/:id')
  @Permissions('view.workspaces')
  findById(@Param('orgId') orgId: string, @Param('id') id: string) {
    return this.workspacesService.findById(orgId, id);
  }

  @Get('workspaces/:id')
  @Permissions('view.workspaces')
  findByIdFlat(@Param('id') id: string, @CurrentUser() user: any) {
    return this.workspacesService.findById(user.organizationId, id);
  }

  @Put('organizations/:orgId/workspaces/:id')
  @Permissions('edit.workspaces')
  update(
    @Param('orgId') orgId: string,
    @Param('id') id: string,
    @Body() dto: UpdateWorkspaceDto,
  ) {
    return this.workspacesService.update(orgId, id, dto);
  }

  @Put('workspaces/:id')
  @Permissions('edit.workspaces')
  updateFlat(
    @Param('id') id: string,
    @Body() dto: UpdateWorkspaceDto,
    @CurrentUser() user: any,
  ) {
    return this.workspacesService.update(user.organizationId, id, dto);
  }

  @Delete('organizations/:orgId/workspaces/:id')
  @Permissions('delete.workspaces')
  remove(@Param('orgId') orgId: string, @Param('id') id: string) {
    return this.workspacesService.remove(orgId, id);
  }

  @Delete('workspaces/:id')
  @Permissions('delete.workspaces')
  removeFlat(@Param('id') id: string, @CurrentUser() user: any) {
    return this.workspacesService.remove(user.organizationId, id);
  }
}
