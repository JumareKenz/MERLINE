import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
} from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import type { AuthenticatedUser } from '../common/interfaces';
import { CreateFieldInterviewDto } from './dto/field-interview.dto';
import {
  CreateFieldWorkerDto,
  SetFieldWorkerProjectsDto,
} from './dto/field-team.dto';
import { FieldService } from './field.service';
import { FieldTeamService } from './field-team.service';

@Controller('field')
export class FieldController {
  constructor(private readonly fieldService: FieldService) {}

  /** Projects the caller can start interviews in. */
  @Get('projects')
  @Permissions('view.projects')
  myProjects(@CurrentUser() user: AuthenticatedUser) {
    return this.fieldService.myProjects(user.id, user.organizationId);
  }

  /** Participant + consent + interview, created together from the field. */
  @Post('interviews')
  @Permissions('create.participants', 'create.consents', 'create.interviews')
  createInterview(
    @Body() dto: CreateFieldInterviewDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.fieldService.createFieldInterview(
      dto,
      user.id,
      user.organizationId,
    );
  }
}

@Controller('field-team')
export class FieldTeamController {
  constructor(private readonly fieldTeamService: FieldTeamService) {}

  @Get()
  @Permissions('view.users')
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.fieldTeamService.list(user.organizationId);
  }

  @Post()
  @Permissions('create.users')
  create(
    @Body() dto: CreateFieldWorkerDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.fieldTeamService.create(dto, user.organizationId);
  }

  @Put(':userId/projects')
  @Permissions('edit.users')
  setProjects(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: SetFieldWorkerProjectsDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.fieldTeamService.setProjects(
      userId,
      dto.projectIds,
      user.organizationId,
    );
  }
}
