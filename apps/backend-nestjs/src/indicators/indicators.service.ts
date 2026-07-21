import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { BaseService } from '../common/base/base.service';
import { CreateIndicatorDto } from './dto/create-indicator.dto';
import { UpdateIndicatorDto } from './dto/update-indicator.dto';
import { toJsonValue } from '../common/utils/prisma-json';

@Injectable()
export class IndicatorsService extends BaseService {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async findAll(query: { studyId?: string; page?: number; limit?: number }) {
    const where: any = { deletedAt: null };

    if (query.studyId) {
      where.studyId = query.studyId;
    }

    const page = Math.max(1, query.page || 1);
    const take = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * take;

    const [data, total] = await Promise.all([
      this.prisma.indicator.findMany({
        where,
        include: {
          _count: {
            select: {
              values: true,
              targets: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.indicator.count({ where }),
    ]);

    return { data, meta: { total, page, limit: take, totalPages: Math.ceil(total / take) } };
  }

  async findById(id: string) {
    const indicator = await this.prisma.indicator.findFirst({
      where: { id, deletedAt: null },
      include: {
        values: {
          orderBy: { date: 'desc' },
          take: 10,
        },
        targets: {
          orderBy: { deadline: 'asc' },
        },
        study: {
          select: {
            id: true,
            title: true,
            code: true,
          },
        },
      },
    });

    if (!indicator) {
      throw new NotFoundException('Indicator not found');
    }

    return indicator;
  }

  async create(dto: CreateIndicatorDto, userId: string, organizationId: string) {
    await this.ensureStudyExists(dto.studyId);

    return this.prisma.indicator.create({
      data: {
        name: dto.name,
        description: dto.description,
        type: dto.type,
        unit: dto.unit,
        calculation: dto.calculation,
        baseline: dto.baseline,
        target: dto.target,
        dataSource: dto.dataSource,
        frequency: dto.frequency,
        disaggregation: toJsonValue(dto.disaggregation ?? []),
        thresholdWarning: dto.thresholdWarning,
        thresholdCritical: dto.thresholdCritical,
        studyId: dto.studyId,
        organizationId,
        createdById: userId,
      },
      include: {
        study: {
          select: {
            id: true,
            title: true,
            code: true,
          },
        },
      },
    });
  }

  async update(id: string, dto: UpdateIndicatorDto) {
    await this.findById(id);
    const { name, description, type, unit, calculation, baseline, target, dataSource, frequency, disaggregation, thresholdWarning, thresholdCritical } = dto;
    return this.prisma.indicator.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(type !== undefined && { type }),
        ...(unit !== undefined && { unit }),
        ...(calculation !== undefined && { calculation }),
        ...(baseline !== undefined && { baseline }),
        ...(target !== undefined && { target }),
        ...(dataSource !== undefined && { dataSource }),
        ...(frequency !== undefined && { frequency }),
        ...(disaggregation !== undefined && { disaggregation: toJsonValue(disaggregation) }),
        ...(thresholdWarning !== undefined && { thresholdWarning }),
        ...(thresholdCritical !== undefined && { thresholdCritical }),
      },
    });
  }

  async remove(id: string) {
    await this.findById(id);
    return this.prisma.indicator.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async approve(id: string, userId: string) {
    const indicator = await this.findById(id);

    if (indicator.isApproved) {
      throw new ConflictException('Indicator is already approved');
    }

    return this.prisma.indicator.update({
      where: { id },
      data: {
        isApproved: true,
        approvedById: userId,
        approvedAt: new Date(),
      },
    });
  }

  async supersede(id: string, userId: string) {
    const indicator = await this.findById(id);

    if (indicator.supersededById) {
      throw new ConflictException('Indicator has already been superseded');
    }

    return this.prisma.indicator.update({
      where: { id },
      data: {
        supersededById: userId,
      },
    });
  }

  async findByStudy(studyId: string) {
    await this.ensureStudyExists(studyId);

    return this.prisma.indicator.findMany({
      where: { studyId, deletedAt: null },
      include: {
        _count: {
          select: {
            values: true,
            targets: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async linkToStudy(indicatorId: string, studyId: string) {
    await this.ensureStudyExists(studyId);

    const indicator = await this.prisma.indicator.findFirst({
      where: { id: indicatorId, deletedAt: null },
    });

    if (!indicator) {
      throw new NotFoundException('Indicator not found');
    }

    return this.prisma.indicator.update({
      where: { id: indicatorId },
      data: { studyId },
    });
  }

  private async ensureStudyExists(studyId: string) {
    const study = await this.prisma.study.findFirst({
      where: { id: studyId, deletedAt: null },
    });

    if (!study) {
      throw new NotFoundException('Study not found');
    }
  }
}
