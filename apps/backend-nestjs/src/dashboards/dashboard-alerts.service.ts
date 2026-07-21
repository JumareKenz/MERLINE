import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { BaseService } from '../common/base/base.service';
import { CreateAlertDto } from './dto/create-alert.dto';
import { toJsonValue } from '../common/utils/prisma-json';

@Injectable()
export class DashboardAlertsService extends BaseService {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async findAll(query: { severity?: string; type?: string; isResolved?: string }) {
    const where: any = {};

    if (query.severity) {
      where.severity = query.severity;
    }
    if (query.type) {
      where.type = query.type;
    }
    if (query.isResolved !== undefined) {
      where.isResolved = query.isResolved === 'true';
    }

    return this.prisma.dashboardAlert.findMany({
      where,
      include: {
        logs: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string) {
    const alert = await this.prisma.dashboardAlert.findUnique({
      where: { id },
      include: {
        logs: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!alert) {
      throw new NotFoundException('Alert not found');
    }

    return alert;
  }

  async create(dto: CreateAlertDto, userId: string, organizationId: string) {
    return this.prisma.dashboardAlert.create({
      data: {
        title: dto.title,
        message: dto.message,
        severity: dto.severity ?? 'info',
        type: dto.type,
        meta: toJsonValue(dto.meta ?? {}),
        organizationId,
        createdById: userId,
      },
      include: {
        logs: true,
      },
    });
  }

  async update(id: string, dto: Partial<CreateAlertDto>) {
    await this.findById(id);

    const data: any = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.message !== undefined) data.message = dto.message;
    if (dto.severity !== undefined) data.severity = dto.severity;
    if (dto.type !== undefined) data.type = dto.type;
    if (dto.meta !== undefined) data.meta = dto.meta;

    return this.prisma.dashboardAlert.update({
      where: { id },
      data,
    });
  }

  async remove(id: string) {
    await this.findById(id);
    return this.prisma.dashboardAlert.delete({
      where: { id },
    });
  }

  async evaluate(id: string, userId: string) {
    const alert = await this.findById(id);

    const log = await this.prisma.dashboardAlertLog.create({
      data: {
        action: 'evaluate',
        meta: { evaluatedBy: userId, severity: alert.severity, type: alert.type },
        alertId: id,
        userId,
      },
    });

    return {
      alert,
      evaluation: log,
      conditions: {
        isResolved: alert.isResolved,
        severity: alert.severity,
        age: Math.floor((Date.now() - new Date(alert.createdAt).getTime()) / (1000 * 60 * 60)),
      },
    };
  }

  async evaluateByStudy(studyId: string, userId: string, organizationId: string) {
    const newAlerts: any[] = [];

    const existingAlert = await this.prisma.dashboardAlert.findFirst({
      where: { organizationId, type: 'study_progress', isResolved: false },
    });

    if (!existingAlert) {
      const alert = await this.prisma.dashboardAlert.create({
        data: {
          title: 'Study Progress Alert',
          message: `Automated evaluation triggered for study ${studyId}`,
          severity: 'info',
          type: 'study_progress',
          meta: toJsonValue({ studyId, source: 'evaluate-by-study' }),
          organizationId,
          createdById: userId,
        },
        include: { logs: true },
      });
      newAlerts.push(alert);
    }

    return { message: 'Alerts evaluated', new_alerts: newAlerts.length };
  }

  async resolve(id: string, userId: string) {
    const alert = await this.findById(id);

    if (alert.isResolved) {
      throw new ConflictException('Alert is already resolved');
    }

    await this.prisma.dashboardAlertLog.create({
      data: {
        action: 'resolve',
        meta: { resolvedBy: userId },
        alertId: id,
        userId,
      },
    });

    return this.prisma.dashboardAlert.update({
      where: { id },
      data: {
        isResolved: true,
        resolvedAt: new Date(),
        resolvedById: userId,
      },
      include: {
        logs: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    });
  }
}
