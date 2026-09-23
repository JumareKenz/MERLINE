import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../database/prisma.service';
import { ConsentsService } from '../consents/consents.service';
import { enqueueJob } from '../jobs/enqueue';
import { RetryableJobError } from '../jobs/job-errors';
import {
  AnalysisPipelineService,
  languageName,
} from './analysis-pipeline.service';
import { RequestReportDto } from './dto/analysis-report.dto';
import { ReportDocument, ReportQuote } from './report-document';
import { projectAskPrompt, PROJECT_ASK_PROMPT_VERSION } from './report-prompts';
import { renderReportDocx } from './exporters/docx';
import { renderReportPdf } from './exporters/pdf';
import { renderReportXlsx } from './exporters/xlsx';
import { slugify } from './exporters/brand';

export const ANALYSIS_REPORT_JOB = 'analysis-report';
export type ExportFormat = 'docx' | 'xlsx' | 'pdf';

const MIME: Record<ExportFormat, string> = {
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  pdf: 'application/pdf',
};

@Injectable()
export class AnalysisReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly consents: ConsentsService,
    private readonly pipeline: AnalysisPipelineService,
    private readonly config: ConfigService,
  ) {}

  /** Queues a report; returns the PENDING row at once. */
  async request(dto: RequestReportDto, userId: string, organizationId: string) {
    const language = dto.language ?? 'en';

    if (dto.scope === 'INTERVIEW') {
      const interview = await this.prisma.interview.findFirst({
        where: { id: dto.interviewId, organizationId, deletedAt: null },
        include: { participant: true },
      });
      if (!interview) throw new NotFoundException('Interview not found');
      const consent = await this.consents.findById(
        interview.consentId,
        organizationId,
      );
      this.consents.assertScope(consent, 'allowAiAnalysis');
      const transcript = await this.prisma.transcript.findFirst({
        where: {
          interviewId: interview.id,
          status: 'COMPLETED',
          media: { deletedAt: null },
          segments: { some: {} },
        },
      });
      if (!transcript) {
        throw new BadRequestException(
          'This interview has no completed transcript with speech yet',
        );
      }
      return this.createAndQueue(
        {
          scope: 'INTERVIEW',
          title: `Interview report: ${interview.participant.displayName}`,
          language,
          projectId: interview.projectId,
          interviewId: interview.id,
        },
        userId,
        organizationId,
      );
    }

    const project = await this.prisma.project.findFirst({
      where: { id: dto.projectId, organizationId, deletedAt: null },
    });
    if (!project) throw new NotFoundException('Project not found');
    const eligible = await this.prisma.interview.count({
      where: {
        projectId: project.id,
        organizationId,
        deletedAt: null,
        consent: { allowAiAnalysis: true, withdrawnAt: null },
        transcripts: {
          some: {
            status: 'COMPLETED',
            media: { deletedAt: null },
            segments: { some: {} },
          },
        },
      },
    });
    if (eligible === 0) {
      throw new BadRequestException(
        'No interview in this project has a completed transcript with consent to AI analysis yet',
      );
    }
    return this.createAndQueue(
      {
        scope: dto.scope,
        title:
          dto.scope === 'PROJECT'
            ? `Project report: ${project.name}`
            : `Brief: ${(dto.instructions ?? '').slice(0, 80)}`,
        instructions: dto.scope === 'CUSTOM' ? dto.instructions : undefined,
        language,
        projectId: project.id,
      },
      userId,
      organizationId,
    );
  }

  private async createAndQueue(
    data: {
      scope: 'INTERVIEW' | 'PROJECT' | 'CUSTOM';
      title: string;
      language: string;
      projectId?: string | null;
      interviewId?: string;
      instructions?: string;
    },
    userId: string,
    organizationId: string,
  ) {
    // One report of a kind in flight per subject: a second click returns it.
    if (data.scope !== 'CUSTOM') {
      const inFlight = await this.prisma.analysisReport.findFirst({
        where: {
          organizationId,
          scope: data.scope,
          deletedAt: null,
          status: { in: ['PENDING', 'PROCESSING'] },
          ...(data.interviewId
            ? { interviewId: data.interviewId }
            : { projectId: data.projectId }),
        },
        omit: { content: true },
      });
      if (inFlight) return inFlight;
    }
    return this.prisma.$transaction(async (tx) => {
      const report = await tx.analysisReport.create({
        data: {
          ...data,
          status: 'PENDING',
          organizationId,
          requestedById: userId,
        },
        omit: { content: true },
      });
      await enqueueJob(tx, {
        type: ANALYSIS_REPORT_JOB,
        organizationId,
        payload: { reportId: report.id },
        dedupeKey: `${ANALYSIS_REPORT_JOB}:${report.id}`,
        maxAttempts: 4,
      });
      return report;
    });
  }

  async list(
    organizationId: string,
    filters: { projectId?: string; interviewId?: string },
  ) {
    return this.prisma.analysisReport.findMany({
      where: {
        organizationId,
        deletedAt: null,
        ...(filters.projectId && { projectId: filters.projectId }),
        ...(filters.interviewId && { interviewId: filters.interviewId }),
      },
      omit: { content: true },
      include: { requestedBy: { select: { firstName: true, lastName: true } } },
      orderBy: { createdAt: 'desc' },
      take: 300,
    });
  }

  async findById(id: string, organizationId: string) {
    const report = await this.prisma.analysisReport.findFirst({
      where: { id, organizationId, deletedAt: null },
      include: {
        project: { select: { id: true, name: true } },
        interview: {
          select: { id: true, participant: { select: { displayName: true } } },
        },
        requestedBy: { select: { firstName: true, lastName: true } },
      },
    });
    if (!report) throw new NotFoundException('Report not found');
    return report;
  }

  async remove(id: string, organizationId: string) {
    await this.findById(id, organizationId);
    await this.prisma.analysisReport.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return { deleted: true };
  }

  async export(id: string, organizationId: string, format: ExportFormat) {
    const report = await this.findById(id, organizationId);
    if (report.status !== 'COMPLETED' || !report.content) {
      throw new BadRequestException('This report is not ready yet');
    }
    const doc = report.content as unknown as ReportDocument;
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { name: true },
    });
    const orgName = org?.name ?? 'Merline';
    const buffer =
      format === 'docx'
        ? await renderReportDocx(doc, orgName)
        : format === 'xlsx'
          ? await renderReportXlsx(doc, orgName)
          : await renderReportPdf(
              doc,
              orgName,
              this.config.get<string>('reports.chromiumPath') || undefined,
            );
    const date = new Date().toISOString().slice(0, 10);
    return {
      buffer,
      mime: MIME[format],
      filename: `${slugify(doc.title)}-${date}.${format}`,
    };
  }

  /**
   * A quick, grounded answer about a project from its existing interview
   * reports. Cited quotations come only from their verified pool.
   */
  async ask(
    projectId: string,
    question: string,
    organizationId: string,
    language = 'en',
  ) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, organizationId, deletedAt: null },
    });
    if (!project) throw new NotFoundException('Project not found');
    const { interviews, items, evidence } =
      await this.pipeline.existingProjectEvidence(
        projectId,
        organizationId,
        language,
      );
    if (items.length === 0) {
      throw new BadRequestException(
        'No interview in this project has a report yet. Generate the project report first; it prepares every interview.',
      );
    }
    let payload: Record<string, unknown>;
    try {
      payload = await this.pipeline.askJson(
        projectAskPrompt(languageName(language)),
        `PROJECT\n${project.name}\n${project.description ?? ''}\n\nINTERVIEWS (${items.length} of ${interviews} have reports)\n${evidence.text}\n\nQUESTION\n${question.trim()}`,
        8000,
      );
    } catch (err) {
      if (err instanceof RetryableJobError)
        throw new BadRequestException(
          `The AI could not answer just now: ${err.message}`,
        );
      throw err;
    }
    // Quote ids belong in the citations, not the prose.
    const answer = (Array.isArray(payload.answer) ? payload.answer : [])
      .filter((p): p is string => typeof p === 'string')
      .map((p) =>
        p
          .replace(/\s*[([]\s*Q-I\d+-\d+(?:\s*[,;]\s*Q-I\d+-\d+)*\s*[)\]]/g, '')
          .replace(/\bQ-I\d+-\d+\b/g, '')
          .trim(),
      )
      .filter(Boolean);

    const quotes: ReportQuote[] = (
      Array.isArray(payload.quoteIds) ? payload.quoteIds : []
    )
      .filter(
        (id): id is string => typeof id === 'string' && !!evidence.pool[id],
      )
      .map((id) => evidence.pool[id]);
    return {
      projectId,
      question,
      answer,
      quotes,
      insufficientEvidence: Boolean(payload.insufficientEvidence),
      coverage: { withReports: items.length, interviews },
      model: this.pipeline.model,
      promptVersion: PROJECT_ASK_PROMPT_VERSION,
    };
  }
}
