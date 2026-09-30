import { Body, Controller, Get, Param, ParseUUIDPipe, Put } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import type { AuthenticatedUser } from '../common/interfaces';
import { InterviewTypesService } from './interview-types.service';
import { SetProjectInterviewTypesDto } from './interview-types.dto';

@Controller('projects/:projectId/interview-types')
export class InterviewTypesController {
  constructor(private readonly service: InterviewTypesService) {}

  @Get()
  @Permissions('view.projects')
  list(@Param('projectId', ParseUUIDPipe) projectId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.list(projectId, user.organizationId);
  }

  @Get('usage')
  @Permissions('view.projects', 'view.interviews')
  usage(@Param('projectId', ParseUUIDPipe) projectId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.usage(projectId, user.organizationId);
  }

  @Put()
  @Permissions('edit.projects')
  replace(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() dto: SetProjectInterviewTypesDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.replace(projectId, dto, user.organizationId);
  }
}
