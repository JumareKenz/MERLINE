import { Module } from '@nestjs/common';
import { ReportsController } from './reports.controller';
import { ReportTemplatesController } from './report-templates.controller';
import { ReportSchedulesController } from './report-schedules.controller';
import { ReportsService } from './reports.service';
import { ReportTemplatesService } from './report-templates.service';
import { ReportSchedulesService } from './report-schedules.service';

@Module({
  controllers: [ReportsController, ReportTemplatesController, ReportSchedulesController],
  providers: [ReportsService, ReportTemplatesService, ReportSchedulesService],
  exports: [ReportsService, ReportTemplatesService, ReportSchedulesService],
})
export class ReportsModule {}
