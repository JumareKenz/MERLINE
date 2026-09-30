import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import type { AuthenticatedUser } from '../common/interfaces';
import { EnumeratorsService } from './enumerators.service';
import {
  CreateEnumeratorDto,
  EnumeratorProjectsDto,
  IssueAccessCodeDto,
  ListEnumeratorsQuery,
  RevokeAccessCodeDto,
  SetEnumeratorActiveDto,
  UpdateEnumeratorDto,
} from './dto/enumerator.dto';

/**
 * Administrator-only management of enumerators (field accounts). Codes are
 * returned exactly once, by the create and regenerate calls; no endpoint
 * reads one back.
 */
@Controller('enumerators')
export class EnumeratorsController {
  constructor(private readonly enumerators: EnumeratorsService) {}

  @Get()
  @Permissions('view.enumerators')
  list(@CurrentUser() user: AuthenticatedUser, @Query() query: ListEnumeratorsQuery) {
    return this.enumerators.list(user.organizationId, query);
  }

  @Post()
  @Permissions('create.enumerators', 'manage.access-codes')
  create(@Body() dto: CreateEnumeratorDto, @CurrentUser() user: AuthenticatedUser) {
    return this.enumerators.create(dto, user.organizationId, user.id);
  }

  @Get(':id')
  @Permissions('view.enumerators')
  get(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.enumerators.get(id, user.organizationId);
  }

  @Get(':id/submissions')
  @Permissions('view.enumerators', 'view.recordings')
  submissions(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query('type') type?: string,
    @Query('projectId', new ParseUUIDPipe({ optional: true })) projectId?: string,
  ) {
    return this.enumerators.submissions(id, user.organizationId, { type, projectId });
  }

  @Patch(':id')
  @Permissions('edit.enumerators')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateEnumeratorDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.enumerators.update(id, dto, user.organizationId, user.id);
  }

  @Put(':id/active')
  @Permissions('edit.enumerators')
  setActive(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SetEnumeratorActiveDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.enumerators.setActive(id, dto.isActive, user.organizationId, user.id);
  }

  @Put(':id/projects')
  @Permissions('assign.enumerators')
  setProjects(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: EnumeratorProjectsDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.enumerators.setProjects(id, dto.projectIds, user.organizationId, user.id);
  }

  @Put(':id/projects/:projectId')
  @Permissions('assign.enumerators')
  assign(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.enumerators.assignProject(id, projectId, user.organizationId, user.id);
  }

  @Delete(':id/projects/:projectId')
  @Permissions('assign.enumerators')
  unassign(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.enumerators.removeProject(id, projectId, user.organizationId, user.id);
  }

  /** Issue or regenerate: the previous code stops working immediately. */
  @Post(':id/access-code')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Permissions('manage.access-codes')
  issue(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: IssueAccessCodeDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.enumerators.issueCode(id, user.organizationId, user.id, dto.validDays);
  }

  @Delete(':id/access-code')
  @HttpCode(200)
  @Permissions('manage.access-codes')
  revoke(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RevokeAccessCodeDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.enumerators.revokeCode(id, user.organizationId, user.id, dto.reason);
  }
}
