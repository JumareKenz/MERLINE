import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { BaseService } from '../common/base/base.service';

@Injectable()
export class DashboardsService extends BaseService {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async getExecutiveDashboard(organizationId: string) {
    const [
      totalStudies,
      totalSubmissions,
      totalIndicators,
      activeAssignments,
      totalProjects,
      totalUsers,
      recentAlerts,
      studiesByStatus,
      submissionsByStatus,
    ] = await Promise.all([
      this.prisma.study.count({
        where: { organizationId, deletedAt: null },
      }),
      this.prisma.submission.count({
        where: { organizationId, deletedAt: null },
      }),
      this.prisma.indicator.count({
        where: { organizationId, deletedAt: null },
      }),
      this.prisma.assignment.count({
        where: {
          organizationId,
          status: { notIn: ['COMPLETED', 'APPROVED'] },
        },
      }),
      this.prisma.project.count({
        where: { organizationId, deletedAt: null },
      }),
      this.prisma.user.count({
        where: { organizationId, deletedAt: null },
      }),
      this.prisma.dashboardAlert.findMany({
        where: { organizationId, isResolved: false },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      this.prisma.study.groupBy({
        by: ['status'],
        where: { organizationId, deletedAt: null },
        _count: { id: true },
      }),
      this.prisma.submission.groupBy({
        by: ['status'],
        where: { organizationId, deletedAt: null },
        _count: { id: true },
      }),
    ]);

    return {
      summary: {
        totalStudies,
        totalSubmissions,
        totalIndicators,
        activeAssignments,
        totalProjects,
        totalUsers,
      },
      studiesByStatus: studiesByStatus.map((s) => ({
        status: s.status,
        count: s._count.id,
      })),
      submissionsByStatus: submissionsByStatus.map((s) => ({
        status: s.status,
        count: s._count.id,
      })),
      recentAlerts,
      generatedAt: new Date().toISOString(),
    };
  }

  async getStudyDashboard(studyId: string) {
    const study = await this.prisma.study.findFirst({
      where: { id: studyId, deletedAt: null },
      include: {
        _count: {
          select: {
            questionnaires: true,
            assignments: true,
            submissions: true,
            indicators: true,
          },
        },
      },
    });

    if (!study) {
      return null;
    }

    const [submissionsByStatus, indicators, recentSubmissions] = await Promise.all([
      this.prisma.submission.groupBy({
        by: ['status'],
        where: { studyId, deletedAt: null },
        _count: { id: true },
      }),
      this.prisma.indicator.findMany({
        where: { studyId, deletedAt: null },
        select: {
          id: true,
          name: true,
          type: true,
          baseline: true,
          target: true,
          thresholdWarning: true,
          thresholdCritical: true,
          values: {
            orderBy: { date: 'desc' },
            take: 1,
          },
        },
      }),
      this.prisma.submission.findMany({
        where: { studyId, deletedAt: null },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          status: true,
          createdAt: true,
          enumerator: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      }),
    ]);

    return {
      study: {
        id: study.id,
        title: study.title,
        code: study.code,
        status: study.status,
        counts: study._count,
      },
      submissionsByStatus: submissionsByStatus.map((s) => ({
        status: s.status,
        count: s._count.id,
      })),
      indicators: indicators.map((ind) => ({
        id: ind.id,
        name: ind.name,
        type: ind.type,
        baseline: ind.baseline,
        target: ind.target,
        thresholdWarning: ind.thresholdWarning,
        thresholdCritical: ind.thresholdCritical,
        latestValue: ind.values[0]?.value ?? null,
      })),
      recentSubmissions,
      generatedAt: new Date().toISOString(),
    };
  }

  async getIndicatorDashboard(organizationId: string) {
    const indicators = await this.prisma.indicator.findMany({
      where: { organizationId, deletedAt: null },
      include: {
        values: {
          orderBy: { date: 'desc' },
          take: 1,
        },
        study: {
          select: { id: true, title: true },
        },
      },
    });

    const withStatus = indicators.map((ind) => {
      const latestValue = ind.values[0]?.value ?? null;
      let status: string;

      if (latestValue === null) {
        status = 'no_data';
      } else if (ind.thresholdCritical !== null && latestValue >= ind.thresholdCritical) {
        status = 'critical';
      } else if (ind.thresholdWarning !== null && latestValue >= ind.thresholdWarning) {
        status = 'warning';
      } else {
        status = 'on_track';
      }

      return {
        id: ind.id,
        name: ind.name,
        type: ind.type,
        baseline: ind.baseline,
        target: ind.target,
        latestValue,
        status,
        study: ind.study,
      };
    });

    return {
      indicators: withStatus,
      summary: {
        total: withStatus.length,
        onTrack: withStatus.filter((i) => i.status === 'on_track').length,
        warning: withStatus.filter((i) => i.status === 'warning').length,
        critical: withStatus.filter((i) => i.status === 'critical').length,
        noData: withStatus.filter((i) => i.status === 'no_data').length,
      },
      generatedAt: new Date().toISOString(),
    };
  }
}
