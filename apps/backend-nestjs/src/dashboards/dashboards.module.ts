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
import { DashboardsController } from './dashboards.controller';
import { DashboardsService } from './dashboards.service';
import { DashboardAlertsService } from './dashboard-alerts.service';
import { DashboardWidgetsService } from './dashboard-widgets.service';
import { DashboardPreferencesService } from './dashboard-preferences.service';

@Module({
  controllers: [DashboardsController],
  providers: [
    DashboardsService,
    DashboardAlertsService,
    DashboardWidgetsService,
    DashboardPreferencesService,
  ],
  exports: [
    DashboardsService,
    DashboardAlertsService,
    DashboardWidgetsService,
    DashboardPreferencesService,
  ],
})
export class DashboardsModule {}
