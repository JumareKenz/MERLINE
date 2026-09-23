import { Controller, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import type { AuthenticatedUser } from '../common/interfaces';
import { TrashTypePipe } from './trash-type.pipe';
import { TrashService, type TrashType } from './trash.service';

/**
 * Administrators only: every route needs the delete permissions, which no
 * other system role holds.
 */
@Controller('trash')
export class TrashController {
  constructor(private readonly trash: TrashService) {}

  @Get()
  @Permissions('delete.projects', 'delete.interviews')
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.trash.list(user.organizationId);
  }

  @Post(':type/:id/restore')
  @Permissions('delete.projects', 'delete.interviews')
  restore(
    @Param('type', TrashTypePipe) type: TrashType,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.trash.restore(type, id, user.organizationId);
  }
}
