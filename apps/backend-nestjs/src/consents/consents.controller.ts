import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import type { AuthenticatedUser } from '../common/interfaces';
import { ConsentsService } from './consents.service';
import { CreateConsentDto } from './dto/create-consent.dto';

@Controller('consents')
export class ConsentsController {
  constructor(private readonly consentsService: ConsentsService) {}

  @Get()
  @Permissions('view.consents')
  async findForParticipant(
    @Query('participantId', ParseUUIDPipe) participantId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.consentsService.findForParticipant(
      participantId,
      user.organizationId,
      user.id,
    );
  }

  @Post()
  @Permissions('create.consents')
  async create(
    @Body() dto: CreateConsentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.consentsService.create(dto, user.id, user.organizationId);
  }

  @Get(':id')
  @Permissions('view.consents')
  async findById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.consentsService.findById(id, user.organizationId, user.id);
  }

  @Post(':id/withdraw')
  @Permissions('withdraw.consents')
  async withdraw(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.consentsService.withdraw(id, user.id, user.organizationId);
  }
}
