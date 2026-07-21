import {
  Controller, Get, Post, Put, Delete, Param, Body, Query,
  UseGuards, ParseUUIDPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ReportTemplatesService } from './report-templates.service';
import { CreateReportTemplateDto } from './dto/create-report-template.dto';
import { UpdateReportTemplateDto } from './dto/update-report-template.dto';

@UseGuards(JwtAuthGuard)
@Controller('report-templates')
export class ReportTemplatesController {
  constructor(private readonly reportTemplatesService: ReportTemplatesService) {}

  @Get()
  async findAll(@Query('category') category?: string) {
    return this.reportTemplatesService.findAll({ category });
  }

  @Post()
  async create(
    @Body() dto: CreateReportTemplateDto,
    @CurrentUser() user: any,
  ) {
    return this.reportTemplatesService.create(dto, user.id, user.organizationId);
  }

  @Get(':id')
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.reportTemplatesService.findById(id);
  }

  @Put(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateReportTemplateDto,
  ) {
    return this.reportTemplatesService.update(id, dto);
  }

  @Delete(':id')
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.reportTemplatesService.remove(id);
  }
}
