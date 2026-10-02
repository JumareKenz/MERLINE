import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import type { AuthenticatedUser } from '../common/interfaces';
import { CreateFieldInterviewDto } from './dto/field-interview.dto';
import { FieldService } from './field.service';

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

  /** Discard a draft this user started (no recording on the server yet). */
  @Delete('interviews/:id')
  @Permissions('create.interviews')
  discardDraft(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.fieldService.discardDraft(id, user.id, user.organizationId);
  }
}
