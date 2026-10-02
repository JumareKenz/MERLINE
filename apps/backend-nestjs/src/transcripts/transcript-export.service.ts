import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../database/prisma.service';
import { slugify } from '../analysis/exporters/brand';
import { renderReportDocx } from '../analysis/exporters/docx';
import { renderReportPdf } from '../analysis/exporters/pdf';
import {
  INTERVIEW_TYPE_LABELS,
  InterviewType,
} from '../common/research/interview-type';
import { TRANSCRIPTION_LANGUAGES } from './languages';
import { buildTranscriptDocument } from './transcript-document';

export type TranscriptExportFormat = 'docx' | 'pdf';

const MIME: Record<TranscriptExportFormat, string> = {
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  pdf: 'application/pdf',
};

/** A branded Word or PDF copy of one interview's transcript, for administrators. */
@Injectable()
export class TranscriptExportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async export(
    id: string,
    organizationId: string,
    format: TranscriptExportFormat,
  ) {
    if (format !== 'docx' && format !== 'pdf') {
      throw new BadRequestException('format must be docx or pdf');
    }
    const t = await this.prisma.transcript.findFirst({
      where: { id, organizationId, interview: { deletedAt: null } },
      include: {
        segments: { orderBy: { index: 'asc' } },
        interview: {
          include: {
            participant: { select: { displayName: true } },
            project: { select: { name: true } },
          },
        },
      },
    });
    if (!t) throw new NotFoundException('Transcript not found');
    if (t.status !== 'COMPLETED') {
      throw new BadRequestException('This transcript is not ready yet');
    }

    const [org, approver, revision] = await Promise.all([
      this.prisma.organization.findUnique({
        where: { id: organizationId },
        select: { name: true },
      }),
      t.approvedById
        ? this.prisma.user.findFirst({
            where: { id: t.approvedById, organizationId },
            select: { firstName: true, lastName: true },
          })
        : null,
      t.approvedRevisionId
        ? this.prisma.transcriptRevision.findFirst({
            where: { id: t.approvedRevisionId, organizationId },
            select: { number: true },
          })
        : null,
    ]);

    const type = t.interview.type;
    const doc = buildTranscriptDocument({
      transcript: {
        id: t.id,
        reviewStatus: t.reviewStatus,
        language: t.language,
        provider: t.provider,
        model: t.model,
        durationMs: t.durationMs,
        approvedAt: t.approvedAt,
        approvedByName: approver
          ? `${approver.firstName} ${approver.lastName}`.trim()
          : null,
        revisionNumber: revision?.number ?? null,
      },
      interview: {
        type,
        typeLabel: type
          ? (INTERVIEW_TYPE_LABELS[type as InterviewType] ?? type)
          : 'Interview',
        location: t.interview.location,
        startedAt:
          t.interview.startedAt ??
          t.interview.scheduledAt ??
          t.interview.createdAt,
        enumeratorName: t.interview.enumeratorName,
        participantName: t.interview.participant.displayName,
        projectName: t.interview.project?.name ?? null,
      },
      languageName: t.language
        ? (TRANSCRIPTION_LANGUAGES[t.language] ?? t.language)
        : 'Not detected',
      segments: t.segments,
      now: new Date(),
    });

    const orgName = org?.name ?? 'Merline';
    const buffer =
      format === 'docx'
        ? await renderReportDocx(doc, orgName)
        : await renderReportPdf(
            doc,
            orgName,
            this.config.get<string>('reports.chromiumPath') || undefined,
          );
    const stamp = new Date().toISOString().slice(0, 10);
    const draft =
      t.reviewStatus === 'APPROVED' || t.reviewStatus === 'LOCKED'
        ? ''
        : '-draft';
    return {
      buffer,
      mime: MIME[format],
      filename: `${slugify(`transcript-${t.interview.participant.displayName}-${type ?? 'interview'}`)}${draft}-${stamp}.${format}`,
    };
  }
}
