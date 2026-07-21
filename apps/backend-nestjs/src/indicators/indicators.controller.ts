import {
  Controller, Get, Post, Put, Delete, Param, Body, Query,
  UseGuards, ParseUUIDPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { IndicatorsService } from './indicators.service';
import { IndicatorValuesService } from './indicator-values.service';
import { IndicatorTargetsService } from './indicator-targets.service';
import { CreateIndicatorDto } from './dto/create-indicator.dto';
import { UpdateIndicatorDto } from './dto/update-indicator.dto';
import { RecordValueDto } from './dto/record-value.dto';
import { SetTargetDto } from './dto/set-target.dto';

@UseGuards(JwtAuthGuard)
@Controller()
export class IndicatorsController {
  constructor(
    private readonly indicatorsService: IndicatorsService,
    private readonly indicatorValuesService: IndicatorValuesService,
    private readonly indicatorTargetsService: IndicatorTargetsService,
  ) {}

  @Get('indicators')
  async findAll(
    @Query('studyId') studyId?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.indicatorsService.findAll({ studyId, page: page ? Number(page) : undefined, limit: limit ? Number(limit) : undefined });
  }

  @Post('indicators')
  async create(
    @Body() dto: CreateIndicatorDto,
    @CurrentUser() user: any,
  ) {
    return this.indicatorsService.create(dto, user.id, user.organizationId);
  }

  @Get('indicators/:id')
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.indicatorsService.findById(id);
  }

  @Put('indicators/:id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateIndicatorDto,
  ) {
    return this.indicatorsService.update(id, dto);
  }

  @Delete('indicators/:id')
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.indicatorsService.remove(id);
  }

  @Get('indicators/:id/values')
  async getValues(@Param('id', ParseUUIDPipe) id: string) {
    return this.indicatorValuesService.findByIndicator(id);
  }

  @Post('indicators/:id/values')
  async recordValue(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RecordValueDto,
    @CurrentUser() user: any,
  ) {
    return this.indicatorValuesService.record(id, dto, user.id);
  }

  @Get('indicators/:id/targets')
  async getTargets(@Param('id', ParseUUIDPipe) id: string) {
    return this.indicatorTargetsService.findByIndicator(id);
  }

  @Post('indicators/:id/targets')
  async setTarget(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SetTargetDto,
    @CurrentUser() user: any,
  ) {
    return this.indicatorTargetsService.set(id, dto, user.id);
  }

  @Get('indicators/:id/trend')
  async getTrend(@Param('id', ParseUUIDPipe) id: string) {
    return this.indicatorValuesService.getTrend(id);
  }

  @Post('indicators/:id/approve')
  async approve(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ) {
    return this.indicatorsService.approve(id, user.id);
  }

  @Post('indicators/:id/supersede')
  async supersede(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ) {
    return this.indicatorsService.supersede(id, user.id);
  }

  @Get('studies/:studyId/indicators')
  async findByStudy(@Param('studyId', ParseUUIDPipe) studyId: string) {
    return this.indicatorsService.findByStudy(studyId);
  }

  @Post('studies/:studyId/indicators/link')
  async linkToStudy(
    @Param('studyId', ParseUUIDPipe) studyId: string,
    @Body() body: { indicatorId: string },
  ) {
    return this.indicatorsService.linkToStudy(body.indicatorId, studyId);
  }
}
