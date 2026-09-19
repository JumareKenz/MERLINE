/**
 * LEGACY — FROZEN (Phase 0, qualitative reset)
 *
 * This module is MERL functionality and is NO LONGER REGISTERED in
 * `app.module.ts`. Its providers cannot be injected by qualitative code.
 *
 * Frozen: bug fixes only, and only if they block the qualitative path.
 * Do not re-register it. Do not import it from active modules —
 * `common/architecture/legacy-boundary.spec.ts` fails the build if you do.
 *
 * Kept on disk, with its tables intact, until the data-preservation decision
 * is confirmed. See LEGACY.md.
 */
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
