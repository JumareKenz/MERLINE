import { Module } from '@nestjs/common';
import { EnumeratorsController } from './enumerators.controller';
import { EnumeratorsService } from './enumerators.service';

@Module({
  controllers: [EnumeratorsController],
  providers: [EnumeratorsService],
  exports: [EnumeratorsService],
})
export class EnumeratorsModule {}
