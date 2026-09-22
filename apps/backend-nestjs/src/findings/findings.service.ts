import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { BaseService } from '../common/base/base.service';
import { ConsentsService } from '../consents/consents.service';
import { AiGatewayService } from '../ai/ai-gateway.service';
import { CreateFindingDto } from './dto/create-finding.dto';
import { AddQuotationDto } from './dto/add-quotation.dto';

/** Bump when the grounding instructions change, so a stored finding records which version produced it. */
const AI_DRAFT_PROMPT_VERSION = 'finding-draft-v1';

const AI_DRAFT_SYSTEM_PROMPT = `You are a qualitative research assistant analysing a single interview transcript.

You will receive a numbered list of transcript segments. Produce ONE JSON object only - no prose, no markdown code fences - with exactly this shape:

{"title": string, "interpretation": string, "theme": string, "quotations": [{"segmentIndex": number, "excerpt": string}]}

Rules, all mandatory:
- "interpretation" must be grounded only in what the segments actually say. Do not speculate beyond the text.
- Every "excerpt" MUST be an exact, verbatim, contiguous substring of the text of the segment named by "segmentIndex" - copy it character-for-character. Never paraphrase, combine segments, or invent a quote.
- Include at least one quotation and at most five.
- If the material is thin, still return your best-supported observation with at least one real, verbatim quotation rather than refusing.
- Output valid JSON only, nothing before or after it.`;

interface AiDraftPayload {
  title: string;
  interpretation: string;
  theme?: string;
  quotations: Array<{ segmentIndex: number; excerpt: string }>;
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
      if (!segment.text.includes(excerpt)) {
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
   * AI-assisted drafting. Produces a DRAFT Finding - never auto-approved,
   * since "AI-generated analysis must be clearly labeled as machine-generated
   * until a human approves it" (source/aiProvider/aiModel are stamped on the
   * row precisely so the UI can label it).
   *
   * The grounding guarantee is identical to the manual addQuotation() path,
   * just applied to every citation the model returns: each segmentIndex must
   * name a real segment on this transcript, and each excerpt must be a
   * verbatim substring of that segment's text. A citation that fails either
   * check fails the whole draft - this service never stores a partially
   * hallucinated finding. If the provider fails outright (no key, network,
   * bad response), the same ServiceUnavailableException contract as
   * AiGatewayService applies: fail loudly, never fabricate.
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
      .map((s) => `[${s.index}] ${s.text}`)
      .join('\n');

    const response = await this.aiGateway.sendMessage({
      provider: 'groq',
      systemPrompt: AI_DRAFT_SYSTEM_PROMPT,
      message: transcriptText,
      temperature: 0.2,
      maxTokens: 2048,
    });

    const payload = this.parseDraftPayload(response.content);

    if (!payload.quotations?.length) {
      throw new ServiceUnavailableException(
        'AI analysis returned no quotations; refusing to create an unevidenced finding',
      );
    }

    const validatedQuotations = payload.quotations.map((q) => {
      const segment = segmentsByIndex.get(q.segmentIndex);
      if (!segment) {
        throw new ServiceUnavailableException(
          `AI analysis cited segment ${q.segmentIndex}, which does not exist on this transcript`,
        );
      }
      const excerpt = (q.excerpt ?? '').trim();
      if (!excerpt || !segment.text.includes(excerpt)) {
        throw new ServiceUnavailableException(
          `AI analysis produced a quotation that does not appear verbatim in segment ${q.segmentIndex}`,
        );
      }
      return { segmentId: segment.id, excerpt };
    });

    return this.executeTransaction(async (tx) => {
      const finding = await tx.finding.create({
        data: {
          title: payload.title,
          interpretation: payload.interpretation,
          theme: payload.theme,
          organizationId,
          createdById: userId,
          status: 'DRAFT',
          source: 'AI',
          aiProvider: response.provider,
          aiModel: response.model,
          aiPromptVersion: AI_DRAFT_PROMPT_VERSION,
        },
      });

      await tx.quotation.createMany({
        data: validatedQuotations.map((q) => ({
          findingId: finding.id,
          transcriptSegmentId: q.segmentId,
          excerpt: q.excerpt,
          organizationId,
          createdById: userId,
        })),
      });

      return finding;
    });
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
    if (
      typeof candidate.title !== 'string' ||
      typeof candidate.interpretation !== 'string' ||
      !Array.isArray(candidate.quotations)
    ) {
      throw new ServiceUnavailableException(
        'AI analysis returned an unexpected shape (missing title, interpretation, or quotations)',
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
