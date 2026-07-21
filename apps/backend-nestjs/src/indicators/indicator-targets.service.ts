import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { BaseService } from '../common/base/base.service';
import { SetTargetDto } from './dto/set-target.dto';

@Injectable()
export class IndicatorTargetsService extends BaseService {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async findByIndicator(indicatorId: string) {
    await this.ensureIndicatorExists(indicatorId);

    return this.prisma.indicatorTarget.findMany({
      where: { indicatorId },
      orderBy: { deadline: 'asc' },
    });
  }

  async set(indicatorId: string, dto: SetTargetDto, userId: string) {
    await this.ensureIndicatorExists(indicatorId);

    return this.prisma.indicatorTarget.create({
      data: {
        value: dto.value,
        deadline: new Date(dto.deadline),
        note: dto.note,
        indicatorId,
        createdById: userId,
      },
    });
  }

  private async ensureIndicatorExists(indicatorId: string) {
    const indicator = await this.prisma.indicator.findFirst({
      where: { id: indicatorId, deletedAt: null },
    });

    if (!indicator) {
      throw new NotFoundException('Indicator not found');
    }
  }
}
