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

/** Bump when the grounding instructions change. Returned with every answer. */
export const DIALOGUE_PROMPT_VERSION = 'transcript-dialogue-v1';

/**
 * Upper bound on transcript text sent in one question. Beyond this the
 * answer would silently ignore part of the interview, so the request is
 * refused instead of truncated.
 */
const MAX_TRANSCRIPT_CHARS = 120_000;

const DIALOGUE_SYSTEM_PROMPT = `You answer a researcher's question about ONE interview transcript, using only that transcript.

You will receive a numbered list of transcript segments, then the question. Reply with ONE JSON object only - no prose, no markdown fences:

{"answer": string, "insufficientEvidence": boolean, "citations": [{"segmentIndex": number, "excerpt": string}]}

Rules, all mandatory:
- Base the answer only on what the segments say. Never use outside knowledge or speculate.
- Every claim in "answer" must be supported by at least one citation.
- Every "excerpt" MUST be an exact, verbatim, contiguous substring of the segment named by "segmentIndex". Copy it character-for-character.
- Cite between one and six segments.
- If the transcript does not contain enough to answer, set "insufficientEvidence" to true, say so plainly in "answer", and return an empty "citations" array.
- Output valid JSON only.`;

interface DialoguePayload {
  answer: string;
  insufficientEvidence?: boolean;
  citations: Array<{ segmentIndex: number; excerpt: string }>;
}

/**
 * PHASE 2 — AI Dialogue: grounded questions over a transcript.
 *
 * The same contract as FindingsService.draftFromTranscript: consent must
 * permit AI analysis, every citation must resolve to a real segment and
 * appear verbatim in it, and one bad citation fails the whole answer. An
 * answer that claims support but cites nothing is refused. Nothing is
 * stored; the answer is an exploration aid, and evidence only becomes a
 * finding through the normal quotation workflow.
 */
@Injectable()
export class TranscriptDialogueService extends BaseService {
  private readonly logger = new Logger(TranscriptDialogueService.name);

  constructor(
    prisma: PrismaService,
    private readonly consentsService: ConsentsService,
    private readonly aiGateway: AiGatewayService,
  ) {
    super(prisma);
  }

  async ask(transcriptId: string, question: string, organizationId: string) {
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
        'Only a completed transcript with segments can be questioned',
      );
    }

    this.consentsService.assertScope(
      transcript.interview.consent,
      'allowAiAnalysis',
    );

    const transcriptText = transcript.segments
      .map(
        (s) =>
          `[${s.index}]${s.speakerLabel ? ` (${s.speakerLabel})` : ''} ${s.text}`,
      )
      .join('\n');
    if (transcriptText.length > MAX_TRANSCRIPT_CHARS) {
      throw new BadRequestException(
        'This transcript is too long to question in one pass',
      );
    }

    const response = await this.aiGateway.sendMessage({
      systemPrompt: DIALOGUE_SYSTEM_PROMPT,
      message: `TRANSCRIPT SEGMENTS:\n${transcriptText}\n\nQUESTION: ${question.trim()}`,
      temperature: 0.1,
      maxTokens: 1500,
    });

    const payload = this.parse(response.content);
    const segmentsByIndex = new Map(
      transcript.segments.map((s) => [s.index, s]),
    );

    const citations = (payload.citations ?? []).map((c) => {
      const segment = segmentsByIndex.get(c.segmentIndex);
      if (!segment) {
        throw new ServiceUnavailableException(
          `The answer cited segment ${c.segmentIndex}, which does not exist; it was discarded`,
        );
      }
      const excerpt = (c.excerpt ?? '').trim();
      if (!excerpt || !segment.text.includes(excerpt)) {
        throw new ServiceUnavailableException(
          `The answer quoted text that does not appear in segment ${c.segmentIndex}; it was discarded`,
        );
      }
      return {
        segmentId: segment.id,
        segmentIndex: segment.index,
        excerpt,
        speakerLabel: segment.speakerLabel,
        startMs: segment.startMs,
        endMs: segment.endMs,
      };
    });

    const insufficientEvidence = Boolean(payload.insufficientEvidence);
    if (!insufficientEvidence && citations.length === 0) {
      throw new ServiceUnavailableException(
        'The answer cited no transcript evidence; it was discarded',
      );
    }

    return {
      transcriptId,
      question: question.trim(),
      answer: payload.answer,
      insufficientEvidence,
      citations: insufficientEvidence ? [] : citations,
      provider: response.provider,
      model: response.model,
      promptVersion: DIALOGUE_PROMPT_VERSION,
    };
  }

  private parse(content: string): DialoguePayload {
    const stripped = content
      .trim()
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/i, '');
    let parsed: unknown;
    try {
      parsed = JSON.parse(stripped);
    } catch {
      this.logger.error(`Dialogue returned non-JSON: ${content.slice(0, 300)}`);
      throw new ServiceUnavailableException(
        'The AI provider did not return a usable answer',
      );
    }
    const candidate = parsed as Partial<DialoguePayload>;
    if (
      typeof candidate.answer !== 'string' ||
      !Array.isArray(candidate.citations ?? [])
    ) {
      throw new ServiceUnavailableException(
        'The AI provider returned an unexpected answer shape',
      );
    }
    return { citations: [], ...candidate } as DialoguePayload;
  }
}
