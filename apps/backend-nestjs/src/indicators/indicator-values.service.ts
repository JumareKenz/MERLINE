import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { BaseService } from '../common/base/base.service';
import { RecordValueDto } from './dto/record-value.dto';

@Injectable()
export class IndicatorValuesService extends BaseService {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async findByIndicator(indicatorId: string) {
    await this.ensureIndicatorExists(indicatorId);

    return this.prisma.indicatorValue.findMany({
      where: { indicatorId },
      orderBy: { date: 'desc' },
    });
  }

  async record(indicatorId: string, dto: RecordValueDto, userId: string) {
    await this.ensureIndicatorExists(indicatorId);

    return this.prisma.indicatorValue.create({
      data: {
        value: dto.value,
        date: new Date(dto.date),
        note: dto.note,
        indicatorId,
        recordedById: userId,
      },
    });
  }

  async getTrend(indicatorId: string) {
    await this.ensureIndicatorExists(indicatorId);

    const values = await this.prisma.indicatorValue.findMany({
      where: { indicatorId },
      orderBy: { date: 'asc' },
    });

    if (values.length === 0) {
      return { indicatorId, values: [], trend: null };
    }

    const n = values.length;
    const sumX = values.reduce((sum, _, i) => sum + i, 0);
    const sumY = values.reduce((sum, v) => sum + v.value, 0);
    const sumXY = values.reduce((sum, v, i) => sum + i * v.value, 0);
    const sumXX = values.reduce((sum, _, i) => sum + i * i, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const avg = sumY / n;
    const direction = slope > 0.01 ? 'up' : slope < -0.01 ? 'down' : 'stable';

    return {
      indicatorId,
      count: n,
      min: Math.min(...values.map((v) => v.value)),
      max: Math.max(...values.map((v) => v.value)),
      avg: Math.round(avg * 100) / 100,
      trend: direction,
      slope: Math.round(slope * 1000) / 1000,
      values,
    };
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
