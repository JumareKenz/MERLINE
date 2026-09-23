import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Finding } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { BaseService } from '../common/base/base.service';
import { ConsentsService } from '../consents/consents.service';
import { AiGatewayService } from '../ai/ai-gateway.service';
import { CreateFindingDto } from './dto/create-finding.dto';
import { AddQuotationDto } from './dto/add-quotation.dto';
import { segmentText } from '../transcripts/segment-text';

/** Bump when the grounding instructions change, so a stored finding records which version produced it. */
const AI_DRAFT_PROMPT_VERSION = 'finding-draft-v2';

/** Transcripts beyond this are refused rather than silently truncated. */
const MAX_DRAFT_TRANSCRIPT_CHARS = 400_000;

const AI_DRAFT_SYSTEM_PROMPT = `You are a qualitative research assistant analysing ONE complete interview transcript.

You will receive every segment of the interview, numbered [index]. Read all of it, from the first segment to the last, before answering.

Produce ONE JSON object only - no prose, no markdown code fences - with exactly this shape:

{"findings": [{"title": string, "theme": string, "interpretation": string, "quotations": [{"segmentIndex": number, "excerpt": string}]}]}

Rules, all mandatory:
- Cover the whole interview. Identify each distinct theme, topic or claim the participant raises anywhere in it - beginning, middle and end - and make one finding per theme. Do not stop after the first topic.
- Aim for 3 to 8 findings; fewer only if the interview is genuinely short or single-topic. Never merge unrelated topics into one finding.
- "title": a short, specific statement of what was found (not a label like "Introduction").
- "interpretation": 2-4 sentences, grounded only in what the segments say. Do not speculate beyond the text. Write in English even if the transcript is in another language.
- Every "excerpt" MUST be an exact, verbatim, contiguous substring of the segment named by "segmentIndex" - copy it character-for-character, in the transcript's own language. Never translate, paraphrase, combine segments or invent a quote. Keep excerpts short (one sentence or clause).
- 1 to 4 quotations per finding, drawn from wherever in the interview that theme appears.
- If parts of the transcript are unintelligible, ignore them rather than interpreting them.
- Output valid JSON only, nothing before or after it.`;

interface AiDraftFinding {
  title: string;
  interpretation: string;
  theme?: string;
  quotations: Array<{ segmentIndex: number; excerpt: string }>;
}

interface AiDraftPayload {
  findings: AiDraftFinding[];
}

export interface GroundedDraft {
  title: string;
  interpretation: string;
  theme?: string;
  quotations: Array<{ segmentId: string; excerpt: string }>;
}

/**
 * Finds `excerpt` in `text` and returns the matching slice *of `text`*, or
 * null. Exact first; failing that, ignoring case, punctuation and spacing
 * (models often re-case or re-punctuate a quote). Either way the returned
 * string is copied from the transcript, so what is stored is verbatim.
 */
export function locateExcerpt(text: string, excerpt: string): string | null {
  if (!excerpt) return null;
  if (text.includes(excerpt)) return excerpt;

  // Normalised copy of `text`, remembering where each kept char came from.
  const kept: number[] = [];
  let norm = '';
  let lastSpace = true;
  for (let i = 0; i < text.length; i++) {
    const c = text[i].toLowerCase();
    if (/[\p{L}\p{N}]/u.test(c)) {
      norm += c;
      kept.push(i);
      lastSpace = false;
    } else if (!lastSpace) {
      norm += ' ';
      kept.push(i);
      lastSpace = true;
    }
  }
  const needle = excerpt
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
  if (needle.length < 3) return null;
  const at = norm.indexOf(needle);
  if (at < 0) return null;
  return text.slice(kept[at], kept[at + needle.length - 1] + 1);
}

/**
 * Keeps only what the transcript supports: a quotation survives only if
 * its segment exists and its excerpt appears verbatim in that segment's
 * (corrected) text; a finding survives only with at least one surviving
 * quotation. Returns the grounded findings and how many quotations were
 * discarded, so nothing unverified is ever stored.
 */
export function groundDraftFindings(
  payload: AiDraftPayload,
  segmentsByIndex: Map<
    number,
    { id: string; text: string; editedText?: string | null }
  >,
): { findings: GroundedDraft[]; discardedQuotations: number } {
  let discardedQuotations = 0;
  const findings: GroundedDraft[] = [];
  for (const f of payload.findings) {
    if (typeof f?.title !== 'string' || typeof f?.interpretation !== 'string') {
      continue;
    }
    const seen = new Set<string>();
    const quotations: GroundedDraft['quotations'] = [];
    for (const q of Array.isArray(f.quotations) ? f.quotations : []) {
      const segment = segmentsByIndex.get(q?.segmentIndex);
      const wanted = typeof q?.excerpt === 'string' ? q.excerpt.trim() : '';
      const excerpt = segment
        ? locateExcerpt(segmentText(segment), wanted)
        : null;
      if (!segment || !excerpt) {
        discardedQuotations++;
        continue;
      }
      const key = `${segment.id}:${excerpt}`;
      if (seen.has(key)) continue;
      seen.add(key);
      quotations.push({ segmentId: segment.id, excerpt });
    }
    if (quotations.length > 0) {
      findings.push({
        title: f.title.trim(),
        interpretation: f.interpretation.trim(),
        theme: typeof f.theme === 'string' ? f.theme.trim() : undefined,
        quotations,
      });
    }
  }
  return { findings, discardedQuotations };
}

@Injectable()
export class FindingsService extends BaseService {
  private readonly logger = new Logger(FindingsService.name);

  constructor(
    prisma: PrismaService,
    private readonly consentsService: ConsentsService,
    private readonly aiGateway: AiGatewayService,
  ) {
    super(prisma);
  }

  async findAll(organizationId: string, projectId?: string) {
    return this.prisma.finding.findMany({
      where: {
        organizationId,
        deletedAt: null,
        ...(projectId && { projectId }),
      },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { quotations: true } } },
    });
  }

  async findById(id: string, organizationId: string) {
    const finding = await this.prisma.finding.findFirst({
      where: { id, organizationId, deletedAt: null },
      include: {
        quotations: {
          include: { transcriptSegment: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!finding) {
      throw new NotFoundException('Finding not found');
    }

    return finding;
  }

  async create(dto: CreateFindingDto, userId: string, organizationId: string) {
    return this.prisma.finding.create({
      data: {
        title: dto.title,
        interpretation: dto.interpretation,
        theme: dto.theme,
        projectId: dto.projectId,
        organizationId,
        createdById: userId,
        status: 'DRAFT',
        source: 'HUMAN',
      },
    });
  }

  /**
   * The evidence link. `transcriptSegmentId` must resolve to a real,
   * same-organization TranscriptSegment (enforced by the non-nullable
   * foreign key — this insert simply cannot succeed otherwise) and the
   * excerpt must actually appear in that segment's text, so a quotation
   * cannot claim words the transcript does not contain.
   *
   * Also re-checks consent.allowQuotation on the interview the segment came
   * from: a participant may permit transcription without permitting their
   * words to be quoted in a finding.
   */
  async addQuotation(
    findingId: string,
    dto: AddQuotationDto,
    userId: string,
    organizationId: string,
  ) {
    await this.findById(findingId, organizationId);

    return this.executeTransaction(async (tx) => {
      const segment = await tx.transcriptSegment.findFirst({
        where: { id: dto.transcriptSegmentId, organizationId },
        include: {
          transcript: {
            include: { interview: { include: { consent: true } } },
          },
        },
      });

      if (!segment) {
        throw new NotFoundException('Transcript segment not found');
      }

      const excerpt = dto.excerpt.trim();
      if (!segmentText(segment).includes(excerpt)) {
        throw new BadRequestException(
          'Excerpt does not appear verbatim in the transcript segment text',
        );
      }

      this.consentsService.assertScope(
        segment.transcript.interview.consent,
        'allowQuotation',
      );

      return tx.quotation.create({
        data: {
          findingId,
          transcriptSegmentId: dto.transcriptSegmentId,
          excerpt,
          organizationId,
          createdById: userId,
        },
      });
    });
  }

  /** DRAFT/IN_REVIEW -> APPROVED. Requires at least one quotation. */
  async approve(id: string, userId: string, organizationId: string) {
    const finding = await this.requireStatus(id, organizationId, [
      'DRAFT',
      'IN_REVIEW',
    ]);

    const quotationCount = await this.prisma.quotation.count({
      where: { findingId: id, organizationId },
    });
    if (quotationCount === 0) {
      throw new BadRequestException(
        'A finding needs at least one quotation, resolving to a real transcript segment, before it can be approved',
      );
    }

    return this.prisma.finding.update({
      where: { id: finding.id },
      data: {
        status: 'APPROVED',
        reviewedById: userId,
        reviewedAt: new Date(),
      },
    });
  }

  /** DRAFT/IN_REVIEW -> REJECTED. No evidence requirement — rejection needs no proof. */
  async reject(id: string, userId: string, organizationId: string) {
    const finding = await this.requireStatus(id, organizationId, [
      'DRAFT',
      'IN_REVIEW',
    ]);

    return this.prisma.finding.update({
      where: { id: finding.id },
      data: {
        status: 'REJECTED',
        reviewedById: userId,
        reviewedAt: new Date(),
      },
    });
  }

  /**
   * APPROVED -> PUBLISHED. Re-checks allowPublication on every quotation's
   * source consent, not just allowQuotation: a participant may permit their
   * words to be quoted internally without permitting publication.
   */
  async publish(id: string, organizationId: string) {
    const finding = await this.requireStatus(id, organizationId, ['APPROVED']);

    const quotations = await this.prisma.quotation.findMany({
      where: { findingId: id, organizationId },
      include: {
        transcriptSegment: {
          include: {
            transcript: {
              include: { interview: { include: { consent: true } } },
            },
          },
        },
      },
    });

    if (quotations.length === 0) {
      // Should be unreachable given approve()'s guard, but publication is
      // exactly the transition this invariant protects — check again anyway.
      throw new BadRequestException(
        'Finding has no quotations and cannot be published',
      );
    }

    for (const quotation of quotations) {
      this.consentsService.assertScope(
        quotation.transcriptSegment.transcript.interview.consent,
        'allowPublication',
      );
    }

    return this.prisma.finding.update({
      where: { id: finding.id },
      data: { status: 'PUBLISHED', publishedAt: new Date() },
    });
  }

  async archive(id: string, organizationId: string) {
    await this.findById(id, organizationId);

    return this.prisma.finding.update({
      where: { id },
      data: { status: 'ARCHIVED' },
    });
  }

  /**
   * AI-assisted drafting: analyses the whole transcript and produces one
   * DRAFT finding per theme - never auto-approved, and stamped as AI so
   * the UI labels it until a human approves it.
   *
   * The grounding guarantee is the manual addQuotation() check, applied to
   * every citation: the segment must exist on this transcript and the
   * excerpt must appear verbatim in its (corrected) text. A citation that
   * fails is discarded; a finding left with no verified quotation is
   * discarded. Nothing unverified is stored, and if nothing survives the
   * request fails. Provider failure follows AiGatewayService's contract:
   * fail loudly, never fabricate.
   */
  async draftFromTranscript(
    transcriptId: string,
    userId: string,
    organizationId: string,
  ) {
    const transcript = await this.prisma.transcript.findFirst({
      where: { id: transcriptId, organizationId },
      include: {
        segments: { orderBy: { index: 'asc' } },
        interview: { include: { consent: true } },
      },
    });
    if (!transcript) {
      throw new NotFoundException('Transcript not found');
    }
    if (transcript.status !== 'COMPLETED' || transcript.segments.length === 0) {
      throw new BadRequestException(
        'Transcript must be COMPLETED with at least one segment before AI drafting',
      );
    }

    this.consentsService.assertScope(
      transcript.interview.consent,
      'allowAiAnalysis',
    );

    const segmentsByIndex = new Map(
      transcript.segments.map((s) => [s.index, s]),
    );
    const transcriptText = transcript.segments
      .map((s) => `[${s.index}] ${segmentText(s)}`)
      .join('\n');
    if (transcriptText.length > MAX_DRAFT_TRANSCRIPT_CHARS) {
      throw new BadRequestException(
        'This transcript is too long to analyse in one pass',
      );
    }

    const response = await this.aiGateway.sendMessage({
      provider: 'groq',
      systemPrompt: AI_DRAFT_SYSTEM_PROMPT,
      message: `INTERVIEW TRANSCRIPT (${transcript.segments.length} segments, analyse all of them):\n${transcriptText}`,
      temperature: 0.2,
      // Room for reasoning plus several findings; 2k truncated the answer.
      maxTokens: 16_000,
    });

    const payload = this.parseDraftPayload(response.content);
    const { findings: grounded, discardedQuotations } = groundDraftFindings(
      payload,
      segmentsByIndex,
    );
    if (discardedQuotations > 0) {
      this.logger.warn(
        `AI draft for transcript ${transcript.id}: discarded ${discardedQuotations} quotation(s) not found verbatim`,
      );
    }
    if (grounded.length === 0) {
      throw new ServiceUnavailableException(
        'AI analysis returned no finding with a verbatim quotation; nothing was saved',
      );
    }

    const created = await this.executeTransaction(async (tx) => {
      const rows: Array<Finding & { quotationCount: number }> = [];
      for (const draft of grounded) {
        const finding = await tx.finding.create({
          data: {
            title: draft.title,
            interpretation: draft.interpretation,
            theme: draft.theme,
            organizationId,
            projectId: transcript.interview.projectId,
            createdById: userId,
            status: 'DRAFT',
            source: 'AI',
            aiProvider: response.provider,
            aiModel: response.model,
            aiPromptVersion: AI_DRAFT_PROMPT_VERSION,
          },
        });
        await tx.quotation.createMany({
          data: draft.quotations.map((q) => ({
            findingId: finding.id,
            transcriptSegmentId: q.segmentId,
            excerpt: q.excerpt,
            organizationId,
            createdById: userId,
          })),
        });
        rows.push({ ...finding, quotationCount: draft.quotations.length });
      }
      return rows;
    });

    return {
      transcriptId: transcript.id,
      findings: created,
      discardedQuotations,
    };
  }

  private parseDraftPayload(content: string): AiDraftPayload {
    // Models asked for "JSON only" still sometimes wrap it in a fenced code
    // block. Strip that defensively rather than failing on formatting alone.
    const stripped = content
      .trim()
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/i, '');

    let parsed: unknown;
    try {
      parsed = JSON.parse(stripped);
    } catch {
      this.logger.error(
        `AI draft returned non-JSON content: ${content.slice(0, 500)}`,
      );
      throw new ServiceUnavailableException(
        'AI analysis did not return valid JSON',
      );
    }

    const candidate = parsed as Partial<AiDraftPayload>;
    if (!Array.isArray(candidate.findings)) {
      throw new ServiceUnavailableException(
        'AI analysis returned an unexpected shape (no findings list)',
      );
    }
    return candidate as AiDraftPayload;
  }

  private async requireStatus(
    id: string,
    organizationId: string,
    allowed: string[],
  ) {
    const finding = await this.prisma.finding.findFirst({
      where: { id, organizationId, deletedAt: null },
    });
    if (!finding) {
      throw new NotFoundException('Finding not found');
    }
    if (!allowed.includes(finding.status)) {
      throw new BadRequestException(
        `Finding is ${finding.status}; this transition requires one of: ${allowed.join(', ')}`,
      );
    }
    return finding;
  }
}
