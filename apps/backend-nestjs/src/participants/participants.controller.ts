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
import { ParticipantsService } from './participants.service';
import { CreateParticipantDto } from './dto/create-participant.dto';
import { UpdateParticipantDto } from './dto/update-participant.dto';

@Controller('participants')
export class ParticipantsController {
  constructor(private readonly participantsService: ParticipantsService) {}

  @Get()
  @Permissions('view.participants')
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query('projectId') projectId?: string,
  ) {
    return this.participantsService.findAll(
      user.organizationId,
      projectId,
      user.id,
    );
  }

  @Post()
  @Permissions('create.participants')
  async create(
    @Body() dto: CreateParticipantDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.participantsService.create(dto, user.id, user.organizationId);
  }

  @Get(':id')
  @Permissions('view.participants')
  async findById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.participantsService.findById(id, user.organizationId, user.id);
  }

  @Put(':id')
  @Permissions('edit.participants')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateParticipantDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.participantsService.update(
      id,
      dto,
      user.organizationId,
      user.id,
    );
  }

  @Delete(':id')
  @Permissions('delete.participants')
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.participantsService.remove(id, user.organizationId, user.id);
  }
}
