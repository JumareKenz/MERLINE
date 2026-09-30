import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  RevisionKind,
  TranscriptReviewStatus as Status,
} from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { BaseService } from '../common/base/base.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { StorageService } from '../storage/storage.service';
import {
  ADMIN_EDITABLE,
  APPROVABLE,
  ENUMERATOR_EDITABLE,
  ENUMERATOR_SUBMITTABLE,
  REVIEW_STATUS_LABELS,
} from './review-status';
import { normalizeCues } from './non-verbal-cues';
import {
  SegmentSnapshot,
  diffSnapshots,
  sameSnapshot,
  snapshotSegments,
} from './revisions';
import { segmentText } from './segment-text';
import { ReviewSegmentDto } from './dto/transcript-review.dto';

type Tx = Prisma.TransactionClient;
type Actor = 'ENUMERATOR' | 'ADMIN';

const DETAIL_INCLUDE = {
  segments: { orderBy: { index: 'asc' as const } },
  media: {
    select: { id: true, originalName: true, mimeType: true, size: true },
  },
  interview: {
    select: {
      id: true,
      type: true,
      typeMetadata: true,
      language: true,
      location: true,
      enumeratorName: true,
      interviewerId: true,
      project: { select: { id: true, name: true } },
      participant: { select: { id: true, displayName: true } },
    },
  },
} satisfies Prisma.TranscriptInclude;

/**
 * Human review of transcripts: the enumerator who conducted the interview
 * reviews first, an administrator approves. Every state change is one
 * transaction that also writes an event (who, when, from → to, note) and,
 * at milestones, an immutable revision of the segments. Machine text is
 * never overwritten; corrections live beside it.
 */
@Injectable()
export class TranscriptReviewService extends BaseService {
  constructor(
    prisma: PrismaService,
    private readonly audit: AuditLogService,
    private readonly storage: StorageService,
  ) {
    super(prisma);
  }

  // ─── Enumerator ───────────────────────────────────────────────────────

  /** Transcripts of interviews this user conducted, with their review state. */
  async listMine(userId: string, organizationId: string) {
    const rows = await this.prisma.transcript.findMany({
      where: {
        organizationId,
        status: 'COMPLETED',
        interview: { interviewerId: userId, deletedAt: null },
        media: { deletedAt: null },
      },
      omit: { text: true },
      include: {
        interview: {
          select: {
            id: true,
            type: true,
            project: { select: { id: true, name: true } },
            participant: { select: { displayName: true } },
            startedAt: true,
          },
        },
        _count: { select: { segments: true } },
      },
      orderBy: { updatedAt: 'desc' },
      take: 200,
    });
    return rows.map((t) => ({
      id: t.id,
      reviewStatus: t.reviewStatus,
      reviewStatusLabel: REVIEW_STATUS_LABELS[t.reviewStatus],
      reviewNote:
        t.reviewStatus === 'RETURNED_FOR_CORRECTION' ? t.reviewNote : null,
      language: t.language,
      durationMs: t.durationMs,
      segmentCount: t._count.segments,
      completedAt: t.completedAt,
      updatedAt: t.updatedAt,
      interview: t.interview,
    }));
  }

  async getMine(id: string, userId: string, organizationId: string) {
    const t = await this.ownTranscript(id, userId, organizationId);
    const events = await this.prisma.transcriptReviewEvent.findMany({
      where: { transcriptId: id, organizationId },
      orderBy: { createdAt: 'asc' },
      include: { actor: { select: { firstName: true, lastName: true } } },
    });
    return {
      ...this.presentDetail(t),
      // Feedback and approval history, not who edited what for others.
      history: events.map((e) => ({
        action: e.action,
        toStatus: e.toStatus,
        note: e.note,
        at: e.createdAt,
        by: e.actor ? `${e.actor.firstName} ${e.actor.lastName}`.trim() : null,
      })),
      canEdit: ENUMERATOR_EDITABLE.includes(t.reviewStatus),
    };
  }

  /** A short-lived link to play the enumerator's own recording. */
  async audioForMine(id: string, userId: string, organizationId: string) {
    const t = await this.ownTranscript(id, userId, organizationId);
    const media = await this.prisma.media.findFirst({
      where: { id: t.mediaId, organizationId, deletedAt: null },
    });
    if (!media || !(await this.storage.objectExists(media.path))) {
      throw new NotFoundException('The recording is not available');
    }
    return {
      url: await this.storage.getSignedDownloadUrl(
        media.path,
        media.originalName,
      ),
      expiresIn: Number(process.env.SIGNED_URL_TTL_SECONDS ?? 900),
      mimeType: media.mimeType,
    };
  }

  async editMine(
    id: string,
    segmentId: string,
    patch: ReviewSegmentDto,
    userId: string,
    organizationId: string,
  ) {
    const t = await this.ownTranscript(id, userId, organizationId);
    return this.editSegment(
      'ENUMERATOR',
      t.id,
      segmentId,
      patch,
      userId,
      organizationId,
    );
  }

  async renameSpeakerMine(
    id: string,
    from: string,
    to: string,
    userId: string,
    organizationId: string,
  ) {
    const t = await this.ownTranscript(id, userId, organizationId);
    return this.renameSpeaker(
      'ENUMERATOR',
      t.id,
      from,
      to,
      userId,
      organizationId,
    );
  }

  async submitMine(
    id: string,
    note: string | undefined,
    userId: string,
    organizationId: string,
  ) {
    const t = await this.ownTranscript(id, userId, organizationId);
    if (!ENUMERATOR_SUBMITTABLE.includes(t.reviewStatus)) {
      throw new ConflictException(
        this.stateMessage(t.reviewStatus, 'be submitted'),
      );
    }
    await this.executeTransaction(async (tx) => {
      await this.transition(tx, t.id, organizationId, {
        allowedFrom: ENUMERATOR_SUBMITTABLE,
        to: 'SUBMITTED_FOR_ADMIN_REVIEW',
        action: 'submitted_for_admin_review',
        actorId: userId,
        note,
        data: {
          reviewSubmittedAt: new Date(),
          reviewSubmittedById: userId,
          reviewNote: null,
        },
      });
      await this.snapshot(
        tx,
        t.id,
        organizationId,
        'ENUMERATOR',
        userId,
        note ?? 'Submitted by enumerator',
      );
    });
    return this.getMine(id, userId, organizationId);
  }

  // ─── Administrator ────────────────────────────────────────────────────

  async editAsAdmin(
    id: string,
    segmentId: string,
    patch: ReviewSegmentDto,
    userId: string,
    organizationId: string,
  ) {
    return this.editSegment(
      'ADMIN',
      id,
      segmentId,
      patch,
      userId,
      organizationId,
    );
  }

  async renameSpeakerAsAdmin(
    id: string,
    from: string,
    to: string,
    userId: string,
    organizationId: string,
  ) {
    return this.renameSpeaker('ADMIN', id, from, to, userId, organizationId);
  }

  /**
   * Makes a transcript authoritative. Requires the enumerator's submission,
   * unless the administrator explicitly skips that (with a note, which is
   * recorded), and — while passages are still flagged — an explicit
   * acknowledgement. The approved segments are frozen as a revision.
   */
  async approve(
    id: string,
    opts: {
      note?: string;
      acknowledgeFlags?: boolean;
      skipEnumeratorReview?: boolean;
    },
    userId: string,
    organizationId: string,
  ) {
    const t = await this.adminTranscript(id, organizationId);
    if (!APPROVABLE.includes(t.reviewStatus)) {
      throw new ConflictException(
        this.stateMessage(t.reviewStatus, 'be approved'),
      );
    }
    if (t.status !== 'COMPLETED' || t.segments.length === 0) {
      throw new BadRequestException(
        'Only a completed transcript with speech can be approved',
      );
    }
    const enumeratorReviewed = t.reviewStatus === 'SUBMITTED_FOR_ADMIN_REVIEW';
    if (!enumeratorReviewed) {
      if (!opts.skipEnumeratorReview) {
        throw new ConflictException(
          'The enumerator has not submitted this transcript for review yet. Wait for their submission, or approve without it and say why.',
        );
      }
      if ((opts.note ?? '').length < 10) {
        throw new BadRequestException(
          'Approving without the enumerator’s review needs a note (at least 10 characters) explaining why.',
        );
      }
    }
    const flagged = t.segments.filter((s) => s.flagged).length;
    if (flagged > 0 && !opts.acknowledgeFlags) {
      throw new ConflictException(
        `${flagged} passage${flagged === 1 ? ' is' : 's are'} still flagged as uncertain or inaudible. Resolve or clear the flags, or approve knowing they remain.`,
      );
    }

    await this.executeTransaction(async (tx) => {
      await this.snapshotIfChanged(
        tx,
        t.id,
        organizationId,
        'ADMIN',
        userId,
        'Administrator corrections',
      );
      const approved = await this.snapshot(
        tx,
        t.id,
        organizationId,
        'APPROVED',
        userId,
        opts.note ?? 'Approved',
      );
      await this.transition(tx, t.id, organizationId, {
        allowedFrom: APPROVABLE,
        to: 'APPROVED',
        action: enumeratorReviewed
          ? 'approved'
          : 'approved_without_enumerator_review',
        actorId: userId,
        note: opts.note,
        data: {
          approvedAt: new Date(),
          approvedById: userId,
          approvedRevisionId: approved.id,
          reviewNote: opts.note ?? null,
        },
      });
    });
    await this.audit.log({
      event: 'transcript.approved',
      auditableType: 'Transcript',
      auditableId: id,
      userId,
      organizationId,
      newValues: {
        skippedEnumeratorReview: !enumeratorReviewed,
        flaggedRemaining: flagged,
      },
    });
    return this.adminDetail(id, organizationId);
  }

  /** Sends a submitted transcript back to the enumerator with feedback. */
  async returnForCorrection(
    id: string,
    note: string,
    userId: string,
    organizationId: string,
  ) {
    const t = await this.adminTranscript(id, organizationId);
    if (t.reviewStatus !== 'SUBMITTED_FOR_ADMIN_REVIEW') {
      throw new ConflictException(
        this.stateMessage(t.reviewStatus, 'be returned'),
      );
    }
    await this.executeTransaction(async (tx) => {
      await this.snapshotIfChanged(
        tx,
        t.id,
        organizationId,
        'ADMIN',
        userId,
        'Administrator corrections',
      );
      await this.transition(tx, t.id, organizationId, {
        allowedFrom: ['SUBMITTED_FOR_ADMIN_REVIEW'],
        to: 'RETURNED_FOR_CORRECTION',
        action: 'returned_for_correction',
        actorId: userId,
        note,
        data: { reviewNote: note },
      });
    });
    await this.audit.log({
      event: 'transcript.returned',
      auditableType: 'Transcript',
      auditableId: id,
      userId,
      organizationId,
      newValues: { note },
    });
    return this.adminDetail(id, organizationId);
  }

  /** Reopens an approved transcript for correction; what depended on it is flagged by its own history. */
  async reopen(
    id: string,
    note: string,
    userId: string,
    organizationId: string,
  ) {
    const t = await this.adminTranscript(id, organizationId);
    if (t.reviewStatus !== 'APPROVED') {
      throw new ConflictException(
        this.stateMessage(t.reviewStatus, 'be reopened'),
      );
    }
    await this.executeTransaction((tx) =>
      this.transition(tx, t.id, organizationId, {
        allowedFrom: ['APPROVED'],
        to: 'SUBMITTED_FOR_ADMIN_REVIEW',
        action: 'reopened',
        actorId: userId,
        note,
        data: {
          approvedAt: null,
          approvedById: null,
          approvedRevisionId: null,
        },
      }),
    );
    await this.audit.log({
      event: 'transcript.reopened',
      auditableType: 'Transcript',
      auditableId: id,
      userId,
      organizationId,
      newValues: { note },
    });
    return this.adminDetail(id, organizationId);
  }

  /** Locks an approved transcript for good: no further edits or reopening. */
  async lock(id: string, userId: string, organizationId: string) {
    const t = await this.adminTranscript(id, organizationId);
    if (t.reviewStatus !== 'APPROVED') {
      throw new ConflictException(
        this.stateMessage(t.reviewStatus, 'be locked'),
      );
    }
    await this.executeTransaction((tx) =>
      this.transition(tx, t.id, organizationId, {
        allowedFrom: ['APPROVED'],
        to: 'LOCKED',
        action: 'locked',
        actorId: userId,
        data: { lockedAt: new Date() },
      }),
    );
    await this.audit.log({
      event: 'transcript.locked',
      auditableType: 'Transcript',
      auditableId: id,
      userId,
      organizationId,
    });
    return this.adminDetail(id, organizationId);
  }

  async revisions(id: string, organizationId: string) {
    await this.adminTranscript(id, organizationId);
    const rows = await this.prisma.transcriptRevision.findMany({
      where: { transcriptId: id, organizationId },
      orderBy: { number: 'asc' },
      select: {
        id: true,
        number: true,
        kind: true,
        note: true,
        createdAt: true,
        author: { select: { id: true, firstName: true, lastName: true } },
        segments: true,
      },
    });
    return rows.map(({ segments, ...r }) => ({
      ...r,
      segmentCount: (segments as unknown as SegmentSnapshot[]).length,
    }));
  }

  /** Segment-level differences between two revisions (default: machine → latest). */
  async compare(
    id: string,
    organizationId: string,
    from?: number,
    to?: number,
  ) {
    await this.adminTranscript(id, organizationId);
    const rows = await this.prisma.transcriptRevision.findMany({
      where: { transcriptId: id, organizationId },
      orderBy: { number: 'asc' },
    });
    if (rows.length === 0)
      throw new NotFoundException('This transcript has no revisions yet');
    const a = from ? rows.find((r) => r.number === from) : rows[0];
    const b = to ? rows.find((r) => r.number === to) : rows[rows.length - 1];
    if (!a || !b) throw new NotFoundException('Revision not found');
    const diffs = diffSnapshots(
      a.segments as unknown as SegmentSnapshot[],
      b.segments as unknown as SegmentSnapshot[],
    );
    return {
      from: { number: a.number, kind: a.kind, createdAt: a.createdAt },
      to: { number: b.number, kind: b.kind, createdAt: b.createdAt },
      changedSegments: diffs.length,
      diffs,
    };
  }

  async events(id: string, organizationId: string) {
    await this.adminTranscript(id, organizationId);
    return this.prisma.transcriptReviewEvent.findMany({
      where: { transcriptId: id, organizationId },
      orderBy: { createdAt: 'asc' },
      include: {
        actor: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  /** What the administrator sees while reviewing: everything, with provenance. */
  async adminDetail(id: string, organizationId: string) {
    const t = await this.adminTranscript(id, organizationId);
    const [events, revisions] = await Promise.all([
      this.events(id, organizationId),
      this.revisions(id, organizationId),
    ]);
    return { ...this.presentDetail(t), events, revisions };
  }

  // ─── Shared machinery ─────────────────────────────────────────────────

  private async editSegment(
    actor: Actor,
    transcriptId: string,
    segmentId: string,
    patch: ReviewSegmentDto,
    userId: string,
    organizationId: string,
  ) {
    return this.executeTransaction(async (tx) => {
      const segment = await tx.transcriptSegment.findFirst({
        where: { id: segmentId, transcriptId, organizationId },
        include: {
          transcript: { select: { status: true, reviewStatus: true } },
          quotations: { select: { excerpt: true } },
        },
      });
      if (!segment) throw new NotFoundException('Transcript segment not found');
      const { status, reviewStatus } = segment.transcript;
      if (status !== 'COMPLETED') {
        throw new BadRequestException(
          'Only a completed transcript can be edited',
        );
      }
      const editable =
        actor === 'ENUMERATOR' ? ENUMERATOR_EDITABLE : ADMIN_EDITABLE;
      if (!editable.includes(reviewStatus)) {
        throw new ConflictException(
          this.stateMessage(reviewStatus, 'be edited by you'),
        );
      }

      const data: Prisma.TranscriptSegmentUpdateInput = {};

      if (patch.text !== undefined) {
        const cleaned =
          patch.text === null ? null : normalizeCues(patch.text).trim() || null;
        const editedText = cleaned === segment.text ? null : cleaned;
        const effective = editedText ?? segment.text;
        const broken = segment.quotations.find(
          (q) => !effective.includes(q.excerpt),
        );
        if (broken) {
          throw new BadRequestException(
            `A finding quotes "${broken.excerpt.slice(0, 80)}" from this segment; keep those words unchanged`,
          );
        }
        data.editedText = editedText;
        if (effective !== segmentText(segment)) {
          // A translation of the old wording would now be misleading.
          data.translatedText = null;
        }
      }
      if (patch.speakerLabel !== undefined) {
        const label = patch.speakerLabel?.trim() || null;
        data.editedSpeakerLabel = label === segment.speakerLabel ? null : label;
      }
      if (patch.flagged !== undefined) {
        data.flagged = patch.flagged;
        if (!patch.flagged) data.flagReason = null;
      }
      if (patch.flagReason !== undefined)
        data.flagReason = patch.flagReason?.trim() || null;
      if (patch.note !== undefined)
        data.reviewNote = patch.note?.trim() || null;

      if (
        data.editedText !== undefined ||
        data.editedSpeakerLabel !== undefined
      ) {
        const finalText =
          data.editedText !== undefined ? data.editedText : segment.editedText;
        const finalSpeaker =
          data.editedSpeakerLabel !== undefined
            ? data.editedSpeakerLabel
            : segment.editedSpeakerLabel;
        if (finalText == null && finalSpeaker == null) {
          // Back to the machine version: nobody is credited with an edit.
          data.editedBy = { disconnect: true };
          data.editedAt = null;
        } else {
          data.editedBy = { connect: { id: userId } };
          data.editedAt = new Date();
        }
      }

      const updated = await tx.transcriptSegment.update({
        where: { id: segment.id },
        data,
        include: {
          editedBy: { select: { id: true, firstName: true, lastName: true } },
        },
      });

      if (actor === 'ENUMERATOR' && reviewStatus !== 'ENUMERATOR_EDITING') {
        await this.transition(tx, transcriptId, organizationId, {
          allowedFrom: ENUMERATOR_EDITABLE,
          to: 'ENUMERATOR_EDITING',
          action: 'editing_started',
          actorId: userId,
        });
      }
      return updated;
    });
  }

  private async renameSpeaker(
    actor: Actor,
    transcriptId: string,
    from: string,
    to: string,
    userId: string,
    organizationId: string,
  ) {
    return this.executeTransaction(async (tx) => {
      const t = await tx.transcript.findFirst({
        where: { id: transcriptId, organizationId },
        select: { status: true, reviewStatus: true },
      });
      if (!t) throw new NotFoundException('Transcript not found');
      const editable =
        actor === 'ENUMERATOR' ? ENUMERATOR_EDITABLE : ADMIN_EDITABLE;
      if (!editable.includes(t.reviewStatus)) {
        throw new ConflictException(
          this.stateMessage(t.reviewStatus, 'be edited by you'),
        );
      }
      const segments = await tx.transcriptSegment.findMany({
        where: { transcriptId, organizationId },
        select: { id: true, speakerLabel: true, editedSpeakerLabel: true },
      });
      const ids = segments
        .filter((s) => (s.editedSpeakerLabel ?? s.speakerLabel) === from)
        .map((s) => s.id);
      if (ids.length === 0)
        throw new NotFoundException(`No passages are labelled "${from}"`);
      for (const s of segments.filter((x) => ids.includes(x.id))) {
        await tx.transcriptSegment.update({
          where: { id: s.id },
          data: {
            editedSpeakerLabel: to === s.speakerLabel ? null : to,
            editedBy: { connect: { id: userId } },
            editedAt: new Date(),
          },
        });
      }
      if (actor === 'ENUMERATOR' && t.reviewStatus !== 'ENUMERATOR_EDITING') {
        await this.transition(tx, transcriptId, organizationId, {
          allowedFrom: ENUMERATOR_EDITABLE,
          to: 'ENUMERATOR_EDITING',
          action: 'editing_started',
          actorId: userId,
        });
      }
      return { renamed: ids.length };
    });
  }

  /** Guarded state change + event, in the caller's transaction. */
  async transition(
    tx: Tx,
    transcriptId: string,
    organizationId: string,
    opts: {
      allowedFrom: readonly Status[];
      to: Status;
      action: string;
      actorId?: string;
      note?: string | null;
      data?: Prisma.TranscriptUpdateManyMutationInput;
    },
  ) {
    const current = await tx.transcript.findFirst({
      where: { id: transcriptId, organizationId },
      select: { reviewStatus: true },
    });
    if (!current) throw new NotFoundException('Transcript not found');
    // The status is part of the WHERE: two racing actors cannot both succeed.
    const moved = await tx.transcript.updateMany({
      where: {
        id: transcriptId,
        organizationId,
        reviewStatus: { in: [...opts.allowedFrom] },
      },
      data: { reviewStatus: opts.to, ...opts.data },
    });
    if (moved.count !== 1) {
      throw new ConflictException(
        'This transcript was just changed by someone else. Reload and try again.',
      );
    }
    await tx.transcriptReviewEvent.create({
      data: {
        organizationId,
        transcriptId,
        action: opts.action,
        fromStatus: current.reviewStatus,
        toStatus: opts.to,
        actorId: opts.actorId ?? null,
        note: opts.note ?? null,
      },
    });
  }

  /** Freezes the transcript's current segments as the next revision. */
  async snapshot(
    tx: Tx,
    transcriptId: string,
    organizationId: string,
    kind: RevisionKind,
    authorId: string | null,
    note?: string | null,
  ) {
    const segments = await tx.transcriptSegment.findMany({
      where: { transcriptId, organizationId },
      orderBy: { index: 'asc' },
    });
    const last = await tx.transcriptRevision.aggregate({
      where: { transcriptId },
      _max: { number: true },
    });
    return tx.transcriptRevision.create({
      data: {
        organizationId,
        transcriptId,
        number: (last._max.number ?? 0) + 1,
        kind,
        authorId,
        note: note ?? null,
        segments: snapshotSegments(
          segments,
        ) as unknown as Prisma.InputJsonValue,
      },
    });
  }

  private async snapshotIfChanged(
    tx: Tx,
    transcriptId: string,
    organizationId: string,
    kind: RevisionKind,
    authorId: string,
    note: string,
  ) {
    const [latest, segments] = await Promise.all([
      tx.transcriptRevision.findFirst({
        where: { transcriptId },
        orderBy: { number: 'desc' },
      }),
      tx.transcriptSegment.findMany({
        where: { transcriptId, organizationId },
      }),
    ]);
    if (
      latest &&
      sameSnapshot(
        latest.segments as unknown as SegmentSnapshot[],
        snapshotSegments(segments),
      )
    ) {
      return null;
    }
    return this.snapshot(
      tx,
      transcriptId,
      organizationId,
      kind,
      authorId,
      note,
    );
  }

  private stateMessage(status: Status, what: string): string {
    return `This transcript is "${REVIEW_STATUS_LABELS[status]}" and cannot ${what} right now.`;
  }

  /** 404 (not 403) for anything that is not theirs: no hint that it exists. */
  private async ownTranscript(
    id: string,
    userId: string,
    organizationId: string,
  ) {
    const t = await this.prisma.transcript.findFirst({
      where: {
        id,
        organizationId,
        interview: { interviewerId: userId, deletedAt: null },
        media: { deletedAt: null },
      },
      include: DETAIL_INCLUDE,
    });
    if (!t) throw new NotFoundException('Transcript not found');
    return t;
  }

  private async adminTranscript(id: string, organizationId: string) {
    const t = await this.prisma.transcript.findFirst({
      where: { id, organizationId, interview: { deletedAt: null } },
      include: DETAIL_INCLUDE,
    });
    if (!t) throw new NotFoundException('Transcript not found');
    return t;
  }

  private presentDetail(
    t: Prisma.TranscriptGetPayload<{ include: typeof DETAIL_INCLUDE }>,
  ) {
    const { segments, ...rest } = t;
    return {
      id: rest.id,
      status: rest.status,
      reviewStatus: rest.reviewStatus,
      reviewStatusLabel: REVIEW_STATUS_LABELS[rest.reviewStatus],
      reviewNote: rest.reviewNote,
      language: rest.language,
      provider: rest.provider,
      durationMs: rest.durationMs,
      approvedAt: rest.approvedAt,
      approvedById: rest.approvedById,
      approvedRevisionId: rest.approvedRevisionId,
      reviewSubmittedAt: rest.reviewSubmittedAt,
      interview: rest.interview,
      media: rest.media,
      segments: segments.map((s) => ({
        id: s.id,
        index: s.index,
        startMs: s.startMs,
        endMs: s.endMs,
        // Machine text alongside the reviewed text, so the UI can show both.
        machineText: s.text,
        text: segmentText(s),
        edited: s.editedText != null,
        machineSpeaker: s.speakerLabel,
        speaker: s.editedSpeakerLabel ?? s.speakerLabel,
        confidence: s.confidence,
        flagged: s.flagged,
        flagReason: s.flagReason,
        note: s.reviewNote,
        editedById: s.editedById,
        editedAt: s.editedAt,
      })),
    };
  }
}
