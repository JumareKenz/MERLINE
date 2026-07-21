import {
  Controller, Get, Post, Put, Delete, Param, Body, Query,
  UseGuards, ParseUUIDPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ReportsService } from './reports.service';
import { CreateReportDto } from './dto/create-report.dto';
import { UpdateReportDto } from './dto/update-report.dto';

@UseGuards(JwtAuthGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get()
  async findAll(
    @Query('studyId') studyId?: string,
    @Query('type') type?: string,
    @Query('status') status?: string,
  ) {
    return this.reportsService.findAll({ studyId, type, status });
  }

  @Post()
  async create(
    @Body() dto: CreateReportDto,
    @CurrentUser() user: any,
  ) {
    return this.reportsService.create(dto, user.id, user.organizationId);
  }

  @Get(':id')
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.reportsService.findById(id);
  }

  @Put(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateReportDto,
  ) {
    return this.reportsService.update(id, dto);
  }

  @Delete(':id')
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.reportsService.remove(id);
  }

  @Post(':id/generate')
  async generate(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ) {
    return this.reportsService.generate(id, user.id);
  }

  @Get(':id/export/:format')
  async exportReport(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('format') format: string,
  ) {
    return this.reportsService.exportReport(id, format);
  }

  @Post(':id/clone')
  async clone(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ) {
    return this.reportsService.clone(id, user.id, user.organizationId);
  }
}
