import { Module } from '@nestjs/common';
import { IndicatorsController } from './indicators.controller';
import { IndicatorsService } from './indicators.service';
import { IndicatorValuesService } from './indicator-values.service';
import { IndicatorTargetsService } from './indicator-targets.service';

@Module({
  controllers: [IndicatorsController],
  providers: [IndicatorsService, IndicatorValuesService, IndicatorTargetsService],
  exports: [IndicatorsService, IndicatorValuesService, IndicatorTargetsService],
})
export class IndicatorsModule {}
