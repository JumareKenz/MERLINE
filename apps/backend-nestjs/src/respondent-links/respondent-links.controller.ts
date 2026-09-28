import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import type { AuthenticatedUser } from '../common/interfaces';
import {
  CreateRespondentLinkDto,
  UpdateRespondentLinkDto,
} from './dto/respondent-link.dto';
import { RespondentLinksService } from './respondent-links.service';

/** Self-interview links, managed by research staff. */
@Controller('respondent-links')
export class RespondentLinksController {
  constructor(private readonly links: RespondentLinksService) {}

  @Get()
  @Permissions('view.links')
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query('projectId') projectId?: string,
  ) {
    return this.links.list(user.organizationId, { projectId });
  }

  @Post()
  @Permissions('create.links')
  create(
    @Body() dto: CreateRespondentLinkDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.links.create(dto, user.id, user.organizationId);
  }

  @Get(':id')
  @Permissions('view.links')
  findById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.links.findById(id, user.organizationId);
  }

  /** People who responded through the link. */
  @Get(':id/responses')
  @Permissions('view.links', 'view.interviews')
  responses(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.links.responses(id, user.organizationId);
  }

  @Put(':id')
  @Permissions('edit.links')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRespondentLinkDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.links.update(id, dto, user.organizationId);
  }

  @Post(':id/close')
  @Permissions('edit.links')
  close(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.links.close(id, user.organizationId);
  }

  @Post(':id/reopen')
  @Permissions('edit.links')
  reopen(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.links.reopen(id, user.organizationId);
  }

  /** New URL secret; the old URL stops working. */
  @Post(':id/regenerate')
  @Permissions('edit.links')
  regenerate(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.links.regenerateToken(id, user.organizationId);
  }

  @Delete(':id')
  @Permissions('delete.links')
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.links.remove(id, user.organizationId);
  }
}
