import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { BaseService } from '../common/base/base.service';
import { UpsertLogframeDto, CreateLogframeRowDto, UpdateLogframeRowDto, LogframeRowIndicatorDto } from './dto/logframe.dto';

@Injectable()
export class LogframesService extends BaseService {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async getByProject(projectId: string) {
    const logframe = await this.prisma.logframe.findUnique({
      where: { projectId },
      include: {
        outcomes: {
          include: {
            children: {
              include: {
                children: {
                  include: {
                    children: true,
                    indicators: { include: { indicator: true } },
                  },
                },
                indicators: { include: { indicator: true } },
              },
            },
            indicators: { include: { indicator: true } },
          },
          where: { parentId: null },
          orderBy: { orderIndex: 'asc' },
        },
      },
    });

    return logframe;
  }

  async upsert(projectId: string, dto: UpsertLogframeDto, userId: string, organizationId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, deletedAt: null },
    });
    if (!project) throw new NotFoundException('Project not found');

    return this.executeTransaction(async (tx) => {
      const logframe = await tx.logframe.upsert({
        where: { projectId },
        create: {
          goal: dto.goal,
          goalNarrative: dto.goalNarrative,
          projectId,
          organizationId,
          createdById: userId,
        },
        update: {
          goal: dto.goal,
          goalNarrative: dto.goalNarrative,
        },
      });

      return logframe;
    });
  }

  async updateGoal(projectId: string, goal: string, goalNarrative?: string) {
    const logframe = await this.prisma.logframe.findUnique({ where: { projectId } });
    if (!logframe) throw new NotFoundException('Logframe not found');

    return this.prisma.logframe.update({
      where: { projectId },
      data: { goal, goalNarrative },
    });
  }

  async addRow(projectId: string, dto: CreateLogframeRowDto, organizationId: string) {
    const logframe = await this.prisma.logframe.findUnique({ where: { projectId } });
    if (!logframe) throw new NotFoundException('Logframe not found. Create a logframe first.');

    const maxOrder = await this.prisma.logframeRow.aggregate({
      where: { logframeId: logframe.id, parentId: dto.parentId ?? null },
      _max: { orderIndex: true },
    });

    const row = await this.prisma.logframeRow.create({
      data: {
        level: dto.level,
        title: dto.title,
        description: dto.description,
        meansOfVerification: dto.meansOfVerification,
        assumptions: dto.assumptions,
        orderIndex: dto.orderIndex ?? (maxOrder._max.orderIndex ?? -1) + 1,
        logframeId: logframe.id,
        parentId: dto.parentId,
        organizationId,
      },
      include: {
        indicators: { include: { indicator: true } },
        children: true,
      },
    });

    if (dto.indicators?.length) {
      await this.linkIndicators(row.id, dto.indicators);
    }

    return this.prisma.logframeRow.findUnique({
      where: { id: row.id },
      include: { indicators: { include: { indicator: true } }, children: true },
    });
  }

  async updateRow(rowId: string, dto: UpdateLogframeRowDto) {
    await this.findRow(rowId);

    return this.prisma.logframeRow.update({
      where: { id: rowId },
      data: {
        title: dto.title,
        description: dto.description,
        meansOfVerification: dto.meansOfVerification,
        assumptions: dto.assumptions,
        orderIndex: dto.orderIndex,
      },
      include: {
        indicators: { include: { indicator: true } },
        children: true,
      },
    });
  }

  async deleteRow(rowId: string) {
    await this.findRow(rowId);
    await this.prisma.logframeRow.delete({ where: { id: rowId } });
  }

  async linkIndicator(rowId: string, dto: LogframeRowIndicatorDto) {
    await this.findRow(rowId);

    return this.prisma.logframeRowIndicator.upsert({
      where: { rowId_indicatorId: { rowId, indicatorId: dto.indicatorId } },
      create: {
        rowId,
        indicatorId: dto.indicatorId,
        baseline: dto.baseline,
        target: dto.target,
        actual: dto.actual,
      },
      update: {
        baseline: dto.baseline,
        target: dto.target,
        actual: dto.actual,
      },
    });
  }

  async unlinkIndicator(rowId: string, indicatorId: string) {
    await this.prisma.logframeRowIndicator.delete({
      where: { rowId_indicatorId: { rowId, indicatorId } },
    });
  }

  private async findRow(rowId: string) {
    const row = await this.prisma.logframeRow.findUnique({ where: { id: rowId } });
    if (!row) throw new NotFoundException('Logframe row not found');
    return row;
  }

  private async linkIndicators(rowId: string, indicators: LogframeRowIndicatorDto[]) {
    await Promise.all(
      indicators.map((ind) =>
        this.prisma.logframeRowIndicator.upsert({
          where: { rowId_indicatorId: { rowId, indicatorId: ind.indicatorId } },
          create: { rowId, indicatorId: ind.indicatorId, baseline: ind.baseline, target: ind.target, actual: ind.actual },
          update: { baseline: ind.baseline, target: ind.target, actual: ind.actual },
        }),
      ),
    );
  }
}
