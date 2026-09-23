import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import type { AuthenticatedUser } from '../common/interfaces';
import { FindingsService } from './findings.service';
import { CreateFindingDto } from './dto/create-finding.dto';
import { AddQuotationDto } from './dto/add-quotation.dto';
import { DraftFindingDto } from './dto/draft-finding.dto';

@Controller('findings')
export class FindingsController {
  constructor(private readonly findingsService: FindingsService) {}

  @Post('ai-draft')
  @Permissions('use.ai', 'create.findings')
  async draftFromTranscript(
    @Body() dto: DraftFindingDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.findingsService.draftFromTranscript(
      dto.transcriptId,
      user.id,
      user.organizationId,
    );
  }

  @Get()
  @Permissions('view.findings')
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query('projectId') projectId?: string,
  ) {
    return this.findingsService.findAll(user.organizationId, projectId);
  }

  @Post()
  @Permissions('create.findings')
  async create(
    @Body() dto: CreateFindingDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.findingsService.create(dto, user.id, user.organizationId);
  }

  @Get(':id')
  @Permissions('view.findings')
  async findById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.findingsService.findById(id, user.organizationId);
  }

  @Post(':id/quotations')
  @Permissions('edit.findings')
  async addQuotation(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddQuotationDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.findingsService.addQuotation(
      id,
      dto,
      user.id,
      user.organizationId,
    );
  }

  @Post(':id/approve')
  @Permissions('approve.findings')
  async approve(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.findingsService.approve(id, user.id, user.organizationId);
  }

  @Post(':id/reject')
  @Permissions('approve.findings')
  async reject(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.findingsService.reject(id, user.id, user.organizationId);
  }

  @Post(':id/publish')
  @Permissions('publish.findings')
  async publish(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.findingsService.publish(id, user.organizationId);
  }

  @Delete(':id')
  @Permissions('delete.findings')
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.findingsService.remove(id, user.organizationId);
  }

  @Post(':id/archive')
  @Permissions('edit.findings')
  async archive(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.findingsService.archive(id, user.organizationId);
  }
}
