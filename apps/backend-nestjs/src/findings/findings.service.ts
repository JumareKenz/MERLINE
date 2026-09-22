import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { BaseService } from '../common/base/base.service';
import { ConsentsService } from '../consents/consents.service';
import { CreateFindingDto } from './dto/create-finding.dto';
import { AddQuotationDto } from './dto/add-quotation.dto';

@Injectable()
export class FindingsService extends BaseService {
  constructor(
    prisma: PrismaService,
    private readonly consentsService: ConsentsService,
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
