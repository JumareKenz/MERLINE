import {
  Controller, Get, Post, Put, Delete, Param, Body, Query,
  UseGuards, ParseUUIDPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { DashboardsService } from './dashboards.service';
import { DashboardAlertsService } from './dashboard-alerts.service';
import { DashboardWidgetsService } from './dashboard-widgets.service';
import { DashboardPreferencesService } from './dashboard-preferences.service';
import { CreateAlertDto } from './dto/create-alert.dto';
import { CreateWidgetDto } from './dto/create-widget.dto';

@UseGuards(JwtAuthGuard)
@Controller('dashboards')
export class DashboardsController {
  constructor(
    private readonly dashboardsService: DashboardsService,
    private readonly dashboardAlertsService: DashboardAlertsService,
    private readonly dashboardWidgetsService: DashboardWidgetsService,
    private readonly dashboardPreferencesService: DashboardPreferencesService,
  ) {}

  @Get('executive')
  async getExecutiveDashboard(@CurrentUser() user: any) {
    return this.dashboardsService.getExecutiveDashboard(user.organizationId);
  }

  @Get('study/:studyId')
  async getStudyDashboard(@Param('studyId', ParseUUIDPipe) studyId: string) {
    return this.dashboardsService.getStudyDashboard(studyId);
  }

  @Get('indicators')
  async getIndicatorDashboard(@CurrentUser() user: any) {
    return this.dashboardsService.getIndicatorDashboard(user.organizationId);
  }

  @Get('alerts')
  async findAllAlerts(
    @Query('severity') severity?: string,
    @Query('type') type?: string,
    @Query('isResolved') isResolved?: string,
  ) {
    return this.dashboardAlertsService.findAll({ severity, type, isResolved });
  }

  @Post('alerts')
  async createAlert(
    @Body() dto: CreateAlertDto,
    @CurrentUser() user: any,
  ) {
    return this.dashboardAlertsService.create(dto, user.id, user.organizationId);
  }

  @Put('alerts/:id')
  async updateAlert(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateAlertDto,
  ) {
    return this.dashboardAlertsService.update(id, dto);
  }

  @Delete('alerts/:id')
  async removeAlert(@Param('id', ParseUUIDPipe) id: string) {
    return this.dashboardAlertsService.remove(id);
  }

  @Post('alerts/evaluate-study')
  async evaluateByStudy(
    @Body() body: { studyId: string },
    @CurrentUser() user: any,
  ) {
    return this.dashboardAlertsService.evaluateByStudy(body.studyId, user.id, user.organizationId);
  }

  @Post('alerts/:id/evaluate')
  async evaluateAlert(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ) {
    return this.dashboardAlertsService.evaluate(id, user.id);
  }

  @Get('alerts/:id/resolve')
  async resolveAlert(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ) {
    return this.dashboardAlertsService.resolve(id, user.id);
  }

  @Get('widgets')
  async findAllWidgets() {
    return this.dashboardWidgetsService.findAll();
  }

  @Post('widgets')
  async createWidget(
    @Body() dto: CreateWidgetDto,
    @CurrentUser() user: any,
  ) {
    return this.dashboardWidgetsService.create(dto, user.id, user.organizationId);
  }

  @Put('widgets/:id')
  async updateWidget(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateWidgetDto,
  ) {
    return this.dashboardWidgetsService.update(id, dto);
  }

  @Delete('widgets/:id')
  async removeWidget(@Param('id', ParseUUIDPipe) id: string) {
    return this.dashboardWidgetsService.remove(id);
  }

  @Get('layout')
  async getLayout(@CurrentUser() user: any) {
    return this.dashboardPreferencesService.getLayout(user.id);
  }

  @Put('layout/save')
  async saveLayout(
    @Body() body: { layout: unknown },
    @CurrentUser() user: any,
  ) {
    return this.dashboardPreferencesService.saveLayout(user.id, user.organizationId, body.layout);
  }
}
