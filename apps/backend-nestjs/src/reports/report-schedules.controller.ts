import {
  Controller, Get, Post, Put, Delete, Param, Body,
  UseGuards, ParseUUIDPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ReportSchedulesService } from './report-schedules.service';
import { CreateReportScheduleDto } from './dto/create-report-schedule.dto';

@UseGuards(JwtAuthGuard)
@Controller('reports/:reportId/schedules')
export class ReportSchedulesController {
  constructor(private readonly reportSchedulesService: ReportSchedulesService) {}

  @Get()
  async findAll(@Param('reportId', ParseUUIDPipe) reportId: string) {
    return this.reportSchedulesService.findAll(reportId);
  }

  @Post()
  async create(
    @Param('reportId', ParseUUIDPipe) reportId: string,
    @Body() dto: CreateReportScheduleDto,
    @CurrentUser() user: any,
  ) {
    return this.reportSchedulesService.create(reportId, dto, user.id);
  }

  @Put(':id')
  async update(
    @Param('reportId', ParseUUIDPipe) reportId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateReportScheduleDto,
  ) {
    return this.reportSchedulesService.update(id, dto);
  }

  @Delete(':id')
  async remove(
    @Param('reportId', ParseUUIDPipe) reportId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.reportSchedulesService.remove(id);
  }
}
