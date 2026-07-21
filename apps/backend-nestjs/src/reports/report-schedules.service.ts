import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { BaseService } from '../common/base/base.service';
import { CreateReportScheduleDto } from './dto/create-report-schedule.dto';
import { toJsonValue } from '../common/utils/prisma-json';

@Injectable()
export class ReportSchedulesService extends BaseService {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async findAll(reportId: string) {
    await this.ensureReportExists(reportId);

    return this.prisma.reportSchedule.findMany({
      where: { reportId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(reportId: string, dto: CreateReportScheduleDto, userId: string) {
    await this.ensureReportExists(reportId);

    return this.prisma.reportSchedule.create({
      data: {
        cron: dto.cron,
        config: toJsonValue(dto.config ?? {}),
        isActive: dto.isActive ?? true,
        reportId,
        createdById: userId,
      },
    });
  }

  async update(id: string, dto: Partial<CreateReportScheduleDto>) {
    const schedule = await this.prisma.reportSchedule.findUnique({
      where: { id },
    });

    if (!schedule) {
      throw new NotFoundException('Report schedule not found');
    }

    const data: any = {};
    if (dto.cron !== undefined) data.cron = dto.cron;
    if (dto.config !== undefined) data.config = dto.config;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;

    return this.prisma.reportSchedule.update({
      where: { id },
      data,
    });
  }

  async remove(id: string) {
    const schedule = await this.prisma.reportSchedule.findUnique({
      where: { id },
    });

    if (!schedule) {
      throw new NotFoundException('Report schedule not found');
    }

    return this.prisma.reportSchedule.delete({
      where: { id },
    });
  }

  private async ensureReportExists(reportId: string) {
    const report = await this.prisma.report.findFirst({
      where: { id: reportId, deletedAt: null },
    });

    if (!report) {
      throw new NotFoundException('Report not found');
    }
  }
}
