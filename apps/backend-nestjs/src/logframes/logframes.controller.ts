import {
  Controller, Get, Post, Put, Delete, Param, Body,
  UseGuards, ParseUUIDPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { LogframesService } from './logframes.service';
import { UpsertLogframeDto, CreateLogframeRowDto, UpdateLogframeRowDto, LogframeRowIndicatorDto } from './dto/logframe.dto';

@UseGuards(JwtAuthGuard)
@Controller('projects/:projectId/logframe')
export class LogframesController {
  constructor(private readonly logframesService: LogframesService) {}

  @Get()
  async getLogframe(@Param('projectId', ParseUUIDPipe) projectId: string) {
    return this.logframesService.getByProject(projectId);
  }

  @Put()
  async upsertLogframe(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() dto: UpsertLogframeDto,
    @CurrentUser() user: any,
  ) {
    return this.logframesService.upsert(projectId, dto, user.id, user.organizationId);
  }

  @Post('rows')
  async addRow(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() dto: CreateLogframeRowDto,
    @CurrentUser() user: any,
  ) {
    return this.logframesService.addRow(projectId, dto, user.organizationId);
  }

  @Put('rows/:rowId')
  async updateRow(
    @Param('rowId', ParseUUIDPipe) rowId: string,
    @Body() dto: UpdateLogframeRowDto,
  ) {
    return this.logframesService.updateRow(rowId, dto);
  }

  @Delete('rows/:rowId')
  async deleteRow(@Param('rowId', ParseUUIDPipe) rowId: string) {
    await this.logframesService.deleteRow(rowId);
    return { message: 'Row deleted' };
  }

  @Post('rows/:rowId/indicators')
  async linkIndicator(
    @Param('rowId', ParseUUIDPipe) rowId: string,
    @Body() dto: LogframeRowIndicatorDto,
  ) {
    return this.logframesService.linkIndicator(rowId, dto);
  }

  @Delete('rows/:rowId/indicators/:indicatorId')
  async unlinkIndicator(
    @Param('rowId', ParseUUIDPipe) rowId: string,
    @Param('indicatorId', ParseUUIDPipe) indicatorId: string,
  ) {
    await this.logframesService.unlinkIndicator(rowId, indicatorId);
    return { message: 'Indicator unlinked' };
  }
}
