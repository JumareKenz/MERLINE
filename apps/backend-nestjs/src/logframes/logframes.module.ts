import { Module } from '@nestjs/common';
import { LogframesController } from './logframes.controller';
import { LogframesService } from './logframes.service';
import { PrismaModule } from '../database/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [LogframesController],
  providers: [LogframesService],
  exports: [LogframesService],
})
export class LogframesModule {}
