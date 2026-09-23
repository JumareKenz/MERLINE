import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import type { AuthenticatedUser } from '../common/interfaces';
import {
  AnalysisReportsService,
  ExportFormat,
} from './analysis-reports.service';
import { AskProjectDto, RequestReportDto } from './dto/analysis-report.dto';

/**
 * AI-written reports. They quote transcripts verbatim, so every route also
 * requires `view.transcripts` — administrators only, like transcripts.
 */
@Controller('analysis-reports')
export class AnalysisReportsController {
  constructor(private readonly reports: AnalysisReportsService) {}

  @Get()
  @Permissions('view.reports', 'view.transcripts')
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query('projectId', new ParseUUIDPipe({ optional: true }))
    projectId?: string,
    @Query('interviewId', new ParseUUIDPipe({ optional: true }))
    interviewId?: string,
  ) {
    return this.reports.list(user.organizationId, { projectId, interviewId });
  }

  @Post()
  @HttpCode(202)
  @Permissions('create.reports', 'view.transcripts', 'use.ai')
  request(
    @Body() dto: RequestReportDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.reports.request(dto, user.id, user.organizationId);
  }

  /** A quick grounded answer about a project (not stored). */
  @Post('ask')
  @Permissions('view.reports', 'view.transcripts', 'use.ai')
  ask(@Body() dto: AskProjectDto, @CurrentUser() user: AuthenticatedUser) {
    return this.reports.ask(
      dto.projectId,
      dto.question,
      user.organizationId,
      dto.language,
    );
  }

  @Get(':id')
  @Permissions('view.reports', 'view.transcripts')
  findById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.reports.findById(id, user.organizationId);
  }

  @Get(':id/export')
  @Permissions('export.reports', 'view.transcripts')
  async export(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('format') format: string,
    @CurrentUser() user: AuthenticatedUser,
    @Res() res: Response,
  ) {
    if (!['docx', 'xlsx', 'pdf'].includes(format)) {
      throw new BadRequestException('format must be docx, xlsx or pdf');
    }
    const file = await this.reports.export(
      id,
      user.organizationId,
      format as ExportFormat,
    );
    res.set({
      'Content-Type': file.mime,
      'Content-Disposition': `attachment; filename="${file.filename}"`,
      'Content-Length': String(file.buffer.length),
      'Cache-Control': 'no-store',
    });
    res.end(file.buffer);
  }

  @Delete(':id')
  @Permissions('delete.reports')
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.reports.remove(id, user.organizationId);
  }
}
