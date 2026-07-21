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
