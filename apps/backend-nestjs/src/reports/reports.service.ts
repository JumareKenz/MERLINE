import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { BaseService } from '../common/base/base.service';
import { CreateReportDto } from './dto/create-report.dto';
import { UpdateReportDto } from './dto/update-report.dto';
import { toJsonValue } from '../common/utils/prisma-json';

@Injectable()
export class ReportsService extends BaseService {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async findAll(query: { studyId?: string; type?: string; status?: string }) {
    const where: any = { deletedAt: null };

    if (query.studyId) {
      where.studyId = query.studyId;
    }
    if (query.type) {
      where.type = query.type;
    }
    if (query.status) {
      where.status = query.status;
    }

    return this.prisma.report.findMany({
      where,
      include: {
        study: {
          select: { id: true, title: true, code: true },
        },
        _count: {
          select: { schedules: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string) {
    const report = await this.prisma.report.findFirst({
      where: { id, deletedAt: null },
      include: {
        study: {
          select: { id: true, title: true, code: true },
        },
        schedules: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!report) {
      throw new NotFoundException('Report not found');
    }

    return report;
  }

  async create(dto: CreateReportDto, userId: string, organizationId: string) {
    if (dto.studyId) {
      await this.ensureStudyExists(dto.studyId);
    }
    if (dto.templateId) {
      await this.ensureTemplateExists(dto.templateId);
    }

    return this.prisma.report.create({
      data: {
        title: dto.title,
        description: dto.description,
        type: dto.type,
        config: toJsonValue(dto.config ?? {}),
        studyId: dto.studyId,
        templateId: dto.templateId,
        organizationId,
        createdById: userId,
      },
      include: {
        study: {
          select: { id: true, title: true, code: true },
        },
      },
    });
  }

  async update(id: string, dto: UpdateReportDto) {
    await this.findById(id);

    const data: any = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.type !== undefined) data.type = dto.type;
    if (dto.config !== undefined) data.config = toJsonValue(dto.config);
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.data !== undefined) data.data = toJsonValue(dto.data);

    return this.prisma.report.update({
      where: { id },
      data,
      include: {
        study: {
          select: { id: true, title: true, code: true },
        },
      },
    });
  }

  async remove(id: string) {
    await this.findById(id);
    return this.prisma.report.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async generate(id: string, userId: string) {
    const report = await this.findById(id);

    const generatedData: {
      summary: string;
      sections: Array<{ title: string; content: string }>;
      tables: Array<{ title: string; headers: string[]; rows: string[][] }>;
      generatedAt: string;
      generatedBy: string;
    } = {
      summary: '',
      sections: [],
      tables: [],
      generatedAt: new Date().toISOString(),
      generatedBy: userId,
    };

    if (report.studyId) {
      const study = await this.prisma.study.findFirst({
        where: { id: report.studyId, deletedAt: null },
        include: {
          _count: {
            select: {
              questionnaires: true,
              assignments: true,
              submissions: true,
              indicators: true,
            },
          },
          questionnaires: { where: { deletedAt: null }, select: { id: true, title: true, status: true } },
          indicators: { where: { deletedAt: null }, select: { id: true, name: true, baseline: true, target: true } },
        },
      });

      if (study) {
        const submissionStats = await this.prisma.submission.aggregate({
          where: { studyId: study.id, deletedAt: null },
          _count: true,
        });

        generatedData.summary = `This report provides an overview of the "${study.title}" (${study.code || 'No code'}) study. The study is currently in "${study.status}" status with ${study._count.submissions} total submissions.`;

        generatedData.sections = [
          {
            title: 'Study Overview',
            content: `The study "${study.title}" is a ${study.type?.toLowerCase() || 'general'} study conducted as part of the MERL platform. It includes ${study._count.questionnaires} questionnaires, ${study._count.indicators} indicators, and has collected ${submissionStats._count} submissions to date.`,
          },
          {
            title: 'Data Collection Progress',
            content: `A total of ${study._count.assignments} assignments have been created, with ${study._count.submissions} submissions received. The study has ${study._count.questionnaires} questionnaires designed for data collection.`,
          },
          {
            title: 'Key Findings',
            content: 'Detailed analysis of the collected data will be presented here once the data cleaning and analysis phases are complete.',
          },
        ];

        if (study.indicators.length > 0) {
          generatedData.tables.push({
            title: 'Indicator Performance',
            headers: ['Indicator', 'Baseline', 'Target', 'Status'],
            rows: study.indicators.map((ind) => [
              ind.name,
              ind.baseline?.toString() || '—',
              ind.target?.toString() || '—',
              ind.baseline && ind.target ? `${Math.round((ind.baseline / ind.target) * 100)}%` : '—',
            ]),
          });
        }

        if (study.questionnaires.length > 0) {
          generatedData.tables.push({
            title: 'Questionnaires',
            headers: ['Title', 'Status'],
            rows: study.questionnaires.map((q) => [q.title, q.status]),
          });
        }
      }
    }

    return this.prisma.report.update({
      where: { id },
      data: {
        status: 'completed',
        data: toJsonValue(generatedData),
      },
      include: {
        study: {
          select: { id: true, title: true, code: true },
        },
      },
    });
  }

  async exportReport(id: string, format: string) {
    const report = await this.findById(id);

    if (!report.data) {
      throw new BadRequestException('Report has no generated data. Run generate first.');
    }

    const exportFormats = ['pdf', 'csv', 'excel'];
    if (!exportFormats.includes(format)) {
      throw new BadRequestException(`Unsupported export format: ${format}. Supported: ${exportFormats.join(', ')}`);
    }

    return {
      reportId: report.id,
      title: report.title,
      format,
      data: report.data,
      exportedAt: new Date().toISOString(),
    };
  }

  async clone(id: string, userId: string, organizationId: string) {
    const report = await this.findById(id);

    return this.prisma.report.create({
      data: {
        title: `${report.title} (Copy)`,
        description: report.description,
        type: report.type,
        config: report.config as any,
        studyId: report.studyId,
        templateId: report.templateId,
        status: 'draft',
        organizationId,
        createdById: userId,
      },
      include: {
        study: {
          select: { id: true, title: true, code: true },
        },
      },
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

  private async ensureTemplateExists(templateId: string) {
    const template = await this.prisma.reportTemplate.findFirst({
      where: { id: templateId },
    });
    if (!template) {
      throw new NotFoundException('Report template not found');
    }
  }
}
