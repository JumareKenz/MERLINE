import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AnalysisReport, Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { consentBlockReason } from '../consents/consents.service';
import { PermanentJobError, RetryableJobError } from '../jobs/job-errors';
import type { JobFailure } from '../jobs/jobs.service';
import { TranscriptionProviderService } from '../transcripts/transcription-provider.service';
import { TRANSCRIPTION_LANGUAGES } from '../transcripts/languages';
import { segmentText } from '../transcripts/segment-text';
import {
  INTERVIEW_TYPE_LABELS,
  InterviewType,
} from '../common/research/interview-type';
import {
  InterviewReportSource,
  ProjectEvidenceInterview,
  buildCustomReport,
  buildInterviewReport,
  buildProjectEvidence,
  buildProjectReport,
  parseModelJson,
} from './report-builders';
import { ReportDocument, formatTimestamp } from './report-document';
import {
  CUSTOM_REPORT_PROMPT_VERSION,
  INTERVIEW_REPORT_PROMPT_VERSION,
  PROJECT_REPORT_PROMPT_VERSION,
  customReportPrompt,
  interviewReportPrompt,
  projectReportPrompt,
} from './report-prompts';

/** Transcripts longer than this are refused rather than cut. */
const MAX_TRANSCRIPT_CHARS = 350_000;
/** Synthesis input ceiling (fits the model's context with room to answer). */
const MAX_EVIDENCE_CHARS = 380_000;

const INTERVIEW_INCLUDE = {
  participant: { select: { displayName: true, externalRef: true } },
  interviewer: { select: { firstName: true, lastName: true } },
  project: { select: { id: true, name: true } },
  consent: true,
} satisfies Prisma.InterviewInclude;

type InterviewRow = Prisma.InterviewGetPayload<{
  include: typeof INTERVIEW_INCLUDE;
}>;

export function languageName(code?: string | null): string {
  if (!code) return 'English';
  return TRANSCRIPTION_LANGUAGES[code] ?? code;
}

function typeLabel(type?: string | null): string {
  return type
    ? (INTERVIEW_TYPE_LABELS[type as InterviewType] ?? type)
    : 'Interview';
}

function fmtDate(d?: Date | null): string {
  return d
    ? d.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        timeZone: 'UTC',
      })
    : 'Not recorded';
}

/**
 * The work behind report jobs. Interview reports analyse one transcript;
 * project reports first make sure every eligible interview has a current
 * interview report (writing any that are missing or out of date), then
 * synthesise across them; custom briefs do the same and follow the
 * requester's instructions. Consent is checked here, at run time.
 */
@Injectable()
export class AnalysisPipelineService {
  private readonly logger = new Logger(AnalysisPipelineService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly provider: TranscriptionProviderService,
    private readonly config: ConfigService,
  ) {}

  get model(): string {
    return this.config.get<string>('reports.model', 'openai/gpt-oss-120b');
  }

  async run(reportId: string): Promise<void> {
    const report = await this.prisma.analysisReport.findUnique({
      where: { id: reportId },
    });
    if (!report || report.deletedAt)
      throw new PermanentJobError('Report no longer exists');
    if (report.status === 'COMPLETED') return;

    await this.prisma.analysisReport.update({
      where: { id: report.id },
      data: { status: 'PROCESSING', errorMessage: null },
    });

    let result: {
      doc: ReportDocument;
      promptVersion: string;
      sourceCount: number;
      transcriptId?: string;
    };
    switch (report.scope) {
      case 'INTERVIEW':
        result = await this.interviewReport(report);
        break;
      case 'PROJECT':
        result = await this.projectReport(report);
        break;
      default:
        result = await this.customReport(report);
    }

    await this.prisma.analysisReport.update({
      where: { id: report.id },
      data: {
        status: 'COMPLETED',
        title: result.doc.title,
        content: result.doc as unknown as Prisma.InputJsonValue,
        model: this.model,
        promptVersion: result.promptVersion,
        sourceCount: result.sourceCount,
        ...(result.transcriptId && { transcriptId: result.transcriptId }),
        completedAt: new Date(),
        errorMessage: null,
      },
    });
  }

  async onFailure(reportId: string, failure: JobFailure) {
    await this.prisma.analysisReport.updateMany({
      where: { id: reportId, status: { not: 'COMPLETED' } },
      data: failure.final
        ? { status: 'FAILED', errorMessage: failure.message }
        : {
            status: 'PENDING',
            errorMessage: `Attempt ${failure.job.attempts} failed: ${failure.message}. Retrying automatically.`,
          },
    });
  }

  /* -------------------------------------------------------------- */

  private async interviewReport(report: AnalysisReport) {
    if (!report.interviewId)
      throw new PermanentJobError('Report has no interview');
    const interview = await this.prisma.interview.findFirst({
      where: {
        id: report.interviewId,
        organizationId: report.organizationId,
        deletedAt: null,
      },
      include: INTERVIEW_INCLUDE,
    });
    if (!interview) throw new PermanentJobError('The interview was deleted');
    const blocked = consentBlockReason(interview.consent, 'allowAiAnalysis');
    if (blocked) throw new PermanentJobError(blocked);

    const number = await this.interviewNumber(interview);
    const doc = await this.writeInterviewDoc(
      interview,
      number,
      report.language,
    );
    return {
      doc: doc.doc,
      promptVersion: INTERVIEW_REPORT_PROMPT_VERSION,
      sourceCount: 1,
      transcriptId: doc.transcriptId,
    };
  }

  /** Position of the interview within its project (1-based, by date). */
  private async interviewNumber(interview: InterviewRow): Promise<number> {
    if (!interview.projectId) return 1;
    const ids = await this.prisma.interview.findMany({
      where: {
        projectId: interview.projectId,
        organizationId: interview.organizationId,
        deletedAt: null,
      },
      orderBy: [{ startedAt: 'asc' }, { createdAt: 'asc' }],
      select: { id: true },
    });
    return ids.findIndex((i) => i.id === interview.id) + 1 || ids.length + 1;
  }

  private async latestTranscript(interviewId: string) {
    return this.prisma.transcript.findFirst({
      where: {
        interviewId,
        status: 'COMPLETED',
        media: { deletedAt: null },
        segments: { some: {} },
      },
      orderBy: { completedAt: 'desc' },
      include: { segments: { orderBy: { index: 'asc' } }, media: true },
    });
  }

  private async writeInterviewDoc(
    interview: InterviewRow,
    number: number,
    language: string,
  ) {
    const transcript = await this.latestTranscript(interview.id);
    if (!transcript)
      throw new PermanentJobError(
        'This interview has no completed transcript with speech',
      );

    const label = `Interview ${number} · ${interview.type ?? 'Interview'} · ${interview.participant.displayName}`;
    const edited = transcript.segments.filter((s) => s.editedText).length;
    const confidences = transcript.segments
      .map((s) => s.confidence)
      .filter((c): c is number => c != null);
    const avgConfidence = confidences.length
      ? confidences.reduce((a, b) => a + b, 0) / confidences.length
      : null;

    const quality: string[] = [];
    if (
      transcript.language === 'ha' &&
      edited < transcript.segments.length / 2
    ) {
      quality.push(
        `Machine transcription of Hausa is approximate and ${edited} of ${transcript.segments.length} segments have been corrected by a researcher. Treat details that are not quoted with caution.`,
      );
    } else if (avgConfidence !== null && avgConfidence < 0.6 && edited === 0) {
      quality.push(
        'The transcription model reported low confidence for much of this recording; listen before relying on specific details.',
      );
    }
    if (!transcript.requestedLanguage) {
      quality.push(
        'The language was detected automatically rather than set for this interview.',
      );
    }

    const src: InterviewReportSource = {
      interviewId: interview.id,
      transcriptId: transcript.id,
      sourceLabel: label,
      facts: [
        { label: 'Project', value: interview.project?.name ?? 'No project' },
        { label: 'Interview type', value: typeLabel(interview.type) },
        {
          label: 'Date',
          value: fmtDate(
            interview.startedAt ?? interview.scheduledAt ?? interview.createdAt,
          ),
        },
        { label: 'Location', value: interview.location || 'Not recorded' },
        {
          label: 'Interviewer',
          value:
            `${interview.interviewer.firstName} ${interview.interviewer.lastName}`.trim(),
        },
        { label: 'Participant', value: interview.participant.displayName },
        { label: 'Language', value: languageName(transcript.language) },
        {
          label: 'Recording length',
          value: transcript.durationMs
            ? formatTimestamp(transcript.durationMs)
            : 'Unknown',
        },
        {
          label: 'Transcript',
          value: edited
            ? `${transcript.segments.length} segments, ${edited} corrected by a researcher`
            : `${transcript.segments.length} segments, machine transcription`,
        },
      ],
      segments: transcript.segments,
      qualityNotes: quality,
      allowQuotes: !consentBlockReason(interview.consent, 'allowQuotation'),
    };

    const text = transcript.segments
      .map(
        (s) => `[${s.index}] (${formatTimestamp(s.startMs)}) ${segmentText(s)}`,
      )
      .join('\n');
    if (text.length > MAX_TRANSCRIPT_CHARS) {
      throw new PermanentJobError(
        'This transcript is too long to analyse in one pass',
      );
    }
    const details = src.facts.map((f) => `${f.label}: ${f.value}`).join('\n');

    const payload = await this.askJson(
      interviewReportPrompt(languageName(language)),
      `INTERVIEW DETAILS\n${details}\n\nTRANSCRIPT (${transcript.segments.length} segments, read all of them)\n${text}`,
    );
    const { doc, discarded } = buildInterviewReport(payload, src);
    if (discarded) {
      this.logger.warn(
        `Interview report for ${interview.id}: discarded ${discarded} non-verbatim quotation(s)`,
      );
    }
    return { doc, transcriptId: transcript.id, label };
  }

  /**
   * The evidence for project-level work: every interview in the project
   * whose consent allows AI analysis and that has a transcript, each with a
   * current interview report (written now if missing or out of date).
   */
  private async projectEvidence(report: AnalysisReport) {
    if (!report.projectId) throw new PermanentJobError('Report has no project');
    const project = await this.prisma.project.findFirst({
      where: {
        id: report.projectId,
        organizationId: report.organizationId,
        deletedAt: null,
      },
    });
    if (!project) throw new PermanentJobError('The project was deleted');

    const interviews = await this.prisma.interview.findMany({
      where: {
        projectId: project.id,
        organizationId: report.organizationId,
        deletedAt: null,
      },
      orderBy: [{ startedAt: 'asc' }, { createdAt: 'asc' }],
      include: INTERVIEW_INCLUDE,
    });

    const included: (ProjectEvidenceInterview & {
      interview: InterviewRow;
      transcriptLanguage: string | null;
      durationMs: number | null;
    })[] = [];
    let noConsent = 0;
    let noTranscript = 0;
    for (const [i, interview] of interviews.entries()) {
      const number = i + 1;
      if (consentBlockReason(interview.consent, 'allowAiAnalysis')) {
        noConsent++;
        continue;
      }
      const transcript = await this.latestTranscript(interview.id);
      if (!transcript) {
        noTranscript++;
        continue;
      }
      const doc = await this.currentInterviewDoc(
        report,
        interview,
        number,
        transcript,
      );
      const date = fmtDate(
        interview.startedAt ?? interview.scheduledAt ?? interview.createdAt,
      );
      included.push({
        ref: `I${number}`,
        label: `Interview ${number} · ${interview.type ?? 'Interview'} · ${interview.participant.displayName}`,
        meta: `${typeLabel(interview.type)}; ${date}; ${interview.location || 'location not recorded'}; ${languageName(transcript.language)}`,
        report: doc,
        interview,
        transcriptLanguage: transcript.language,
        durationMs: transcript.durationMs,
      });
    }
    if (included.length === 0) {
      throw new PermanentJobError(
        'No interview in this project has a completed transcript with consent to AI analysis yet',
      );
    }

    const evidence = buildProjectEvidence(included);
    if (evidence.text.length > MAX_EVIDENCE_CHARS) {
      throw new PermanentJobError(
        'This project has too much material to synthesise in one pass',
      );
    }
    return { project, interviews, included, evidence, noConsent, noTranscript };
  }

  /** Reuses a completed interview report if it reflects the latest transcript and corrections. */
  private async currentInterviewDoc(
    parent: AnalysisReport,
    interview: InterviewRow,
    number: number,
    transcript: NonNullable<
      Awaited<ReturnType<AnalysisPipelineService['latestTranscript']>>
    >,
  ): Promise<ReportDocument> {
    const lastEdit = transcript.segments.reduce<Date | null>(
      (max, s) => (s.editedAt && (!max || s.editedAt > max) ? s.editedAt : max),
      null,
    );
    const existing = await this.prisma.analysisReport.findFirst({
      where: {
        interviewId: interview.id,
        scope: 'INTERVIEW',
        status: 'COMPLETED',
        deletedAt: null,
        transcriptId: transcript.id,
        language: parent.language,
        ...(lastEdit && { completedAt: { gte: lastEdit } }),
      },
      orderBy: { completedAt: 'desc' },
    });
    if (existing?.content) return existing.content as unknown as ReportDocument;

    // Write it, and keep it: it is the interview's own report too.
    const row = await this.prisma.analysisReport.create({
      data: {
        scope: 'INTERVIEW',
        status: 'PROCESSING',
        title: `Interview report: ${interview.participant.displayName}`,
        language: parent.language,
        projectId: interview.projectId,
        interviewId: interview.id,
        transcriptId: transcript.id,
        organizationId: parent.organizationId,
        requestedById: parent.requestedById,
      },
    });
    try {
      const { doc } = await this.writeInterviewDoc(
        interview,
        number,
        parent.language,
      );
      await this.prisma.analysisReport.update({
        where: { id: row.id },
        data: {
          status: 'COMPLETED',
          title: doc.title,
          content: doc as unknown as Prisma.InputJsonValue,
          model: this.model,
          promptVersion: INTERVIEW_REPORT_PROMPT_VERSION,
          sourceCount: 1,
          completedAt: new Date(),
        },
      });
      return doc;
    } catch (err) {
      await this.prisma.analysisReport.update({
        where: { id: row.id },
        data: {
          status: 'FAILED',
          errorMessage: err instanceof Error ? err.message : String(err),
        },
      });
      throw err;
    }
  }

  private async projectReport(report: AnalysisReport) {
    const { project, interviews, included, evidence, noConsent, noTranscript } =
      await this.projectEvidence(report);
    const method = (project.settings as { method?: string } | null)?.method;

    const byType = new Map<string, number>();
    for (const iv of included)
      byType.set(
        typeLabel(iv.interview.type),
        (byType.get(typeLabel(iv.interview.type)) ?? 0) + 1,
      );
    const dates = included
      .map((iv) => iv.interview.startedAt ?? iv.interview.createdAt)
      .sort((a, b) => a.getTime() - b.getTime());
    const languages = [
      ...new Set(included.map((iv) => languageName(iv.transcriptLanguage))),
    ];
    const totalMs = included.reduce((t, iv) => t + (iv.durationMs ?? 0), 0);
    const typeSummary = [...byType.entries()]
      .map(([t, n]) => `${n} ${t.toLowerCase()}${n === 1 ? '' : 's'}`)
      .join(', ');

    const facts = [
      { label: 'Project', value: project.name },
      ...(method ? [{ label: 'Method', value: typeLabel(method) }] : []),
      {
        label: 'Interviews analysed',
        value: `${included.length} of ${interviews.length}`,
      },
      { label: 'Interview types', value: typeSummary },
      {
        label: 'Fieldwork',
        value: `${fmtDate(dates[0])} – ${fmtDate(dates.at(-1))}`,
      },
      { label: 'Languages', value: languages.join(', ') },
      { label: 'Audio analysed', value: formatTimestamp(totalMs) },
    ];

    const methodology = [
      `This report synthesises ${included.length} interview${included.length === 1 ? '' : 's'} (${typeSummary}) conducted for ${project.name} between ${fmtDate(dates[0])} and ${fmtDate(dates.at(-1))}, in ${languages.join(' and ')}. Participants gave recorded consent before each interview, including consent to AI-assisted analysis.`,
      'Interviews were audio-recorded in the field, transcribed automatically and, where needed, corrected by researchers. Each interview was first analysed on its own; this report then compares those analyses to identify findings, how widely each is shared, and where views diverge. Every quotation is verbatim and linked to its interview and timestamp.',
      ...(noConsent || noTranscript
        ? [
            `Not included: ${[
              noConsent
                ? `${noConsent} interview${noConsent === 1 ? '' : 's'} without consent to AI analysis`
                : '',
              noTranscript
                ? `${noTranscript} without a completed transcript`
                : '',
            ]
              .filter(Boolean)
              .join(' and ')}.`,
          ]
        : []),
    ];

    const payload = await this.askJson(
      projectReportPrompt(languageName(report.language)),
      `PROJECT\n${project.name}\n${project.description ?? ''}\nMethod: ${typeLabel(method)}\n${included.length} interviews: ${typeSummary}\n\nINTERVIEWS\n${evidence.text}`,
      32_000,
    );

    const doc = buildProjectReport(
      payload,
      {
        projectName: project.name,
        facts,
        methodology,
        interviewTable: {
          columns: [
            'No.',
            'Participant',
            'Type',
            'Date',
            'Location',
            'Interviewer',
            'Length',
          ],
          rows: included.map((iv) => [
            iv.ref,
            iv.interview.participant.displayName,
            iv.interview.type ?? '—',
            fmtDate(iv.interview.startedAt ?? iv.interview.createdAt),
            iv.interview.location || '—',
            `${iv.interview.interviewer.firstName} ${iv.interview.interviewer.lastName}`.trim(),
            iv.durationMs ? formatTimestamp(iv.durationMs) : '—',
          ]),
        },
        limitations: [
          'Findings reflect the people interviewed and are not statistically representative.',
          ...(languages.includes('Hausa')
            ? [
                'Hausa interviews rely on machine transcription unless corrected; uncorrected passages may contain errors.',
              ]
            : []),
        ],
        interviewSummaries: included.map((iv) => {
          const s = iv.report.sections.find(
            (x) => x.heading === 'Executive summary',
          );
          const first = s?.blocks.find((b) => b.type === 'paragraph');
          return {
            label: `${iv.ref} (${iv.label})`,
            summary: first && first.type === 'paragraph' ? first.text : '',
          };
        }),
        refLabels: Object.fromEntries(included.map((iv) => [iv.ref, iv.label])),
      },
      evidence.pool,
    );
    return {
      doc,
      promptVersion: PROJECT_REPORT_PROMPT_VERSION,
      sourceCount: included.length,
    };
  }

  private async customReport(report: AnalysisReport) {
    const { project, included, evidence } = await this.projectEvidence(report);
    const latestProject = await this.prisma.analysisReport.findFirst({
      where: {
        projectId: project.id,
        scope: 'PROJECT',
        status: 'COMPLETED',
        deletedAt: null,
      },
      orderBy: { completedAt: 'desc' },
    });
    let projectReportText = '';
    if (latestProject?.content) {
      const doc = latestProject.content as unknown as ReportDocument;
      projectReportText = doc.sections
        .filter((s) => s.aiGenerated)
        .map(
          (s) =>
            `## ${s.heading}\n${s.blocks.map((b) => (b.type === 'paragraph' ? b.text : b.type === 'bullets' ? b.items.join('; ') : '')).join('\n')}`,
        )
        .join('\n');
    }
    const payload = await this.askJson(
      customReportPrompt(languageName(report.language)),
      `INSTRUCTIONS FROM THE REQUESTER\n${report.instructions}\n\nPROJECT\n${project.name}\n${project.description ?? ''}\n\n${projectReportText ? `PROJECT REPORT\n${projectReportText}\n\n` : ''}INTERVIEWS\n${evidence.text}`,
      24_000,
    );
    const doc = buildCustomReport(
      payload,
      project.name,
      [
        { label: 'Project', value: project.name },
        { label: 'Interviews drawn on', value: String(included.length) },
        { label: 'Requested', value: report.instructions ?? '' },
      ],
      evidence.pool,
    );
    return {
      doc,
      promptVersion: CUSTOM_REPORT_PROMPT_VERSION,
      sourceCount: included.length,
    };
  }

  /** One JSON answer from the report model; malformed output is retried. */
  async askJson(system: string, user: string, maxTokens = 20_000) {
    const content = await this.provider.chat({
      system,
      user,
      model: this.model,
      maxTokens,
      json: true,
    });
    try {
      return parseModelJson(content);
    } catch {
      throw new RetryableJobError('The model returned malformed JSON');
    }
  }

  /** Evidence from interview reports that already exist (no generation). For quick questions. */
  async existingProjectEvidence(
    projectId: string,
    organizationId: string,
    language: string,
  ) {
    const interviews = await this.prisma.interview.findMany({
      where: { projectId, organizationId, deletedAt: null },
      orderBy: [{ startedAt: 'asc' }, { createdAt: 'asc' }],
      include: INTERVIEW_INCLUDE,
    });
    const items: ProjectEvidenceInterview[] = [];
    for (const [i, interview] of interviews.entries()) {
      if (consentBlockReason(interview.consent, 'allowAiAnalysis')) continue;
      const report = await this.prisma.analysisReport.findFirst({
        where: {
          interviewId: interview.id,
          scope: 'INTERVIEW',
          status: 'COMPLETED',
          deletedAt: null,
          language,
        },
        orderBy: { completedAt: 'desc' },
      });
      if (!report?.content) continue;
      items.push({
        ref: `I${i + 1}`,
        label: `Interview ${i + 1} · ${interview.type ?? 'Interview'} · ${interview.participant.displayName}`,
        meta: typeLabel(interview.type),
        report: report.content as unknown as ReportDocument,
      });
    }
    return {
      interviews: interviews.length,
      items,
      evidence: buildProjectEvidence(items),
    };
  }
}
