import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

export const TRASH_TYPES = [
  'project',
  'interview',
  'recording',
  'participant',
  'finding',
  'report',
  'user',
] as const;
export type TrashType = (typeof TRASH_TYPES)[number];

export interface TrashItem {
  type: TrashType;
  id: string;
  name: string;
  context?: string | null;
  deletedAt: Date;
}

/**
 * Everything an administrator has deleted, and the way back. Deletion in
 * Merline is a move to the Trash (deletedAt): research records and their
 * consent history are never destroyed by a click.
 */
@Injectable()
export class TrashService {
  constructor(private readonly prisma: PrismaService) {}

  async list(organizationId: string): Promise<TrashItem[]> {
    const deleted = { organizationId, deletedAt: { not: null } } as const;
    const take = 200;
    const [
      projects,
      interviews,
      recordings,
      participants,
      findings,
      reports,
      users,
    ] = await Promise.all([
      this.prisma.project.findMany({
        where: deleted,
        take,
        select: { id: true, name: true, deletedAt: true },
      }),
      this.prisma.interview.findMany({
        where: deleted,
        take,
        select: {
          id: true,
          deletedAt: true,
          type: true,
          participant: { select: { displayName: true } },
          project: { select: { name: true } },
        },
      }),
      this.prisma.media.findMany({
        where: { ...deleted, interviewId: { not: null } },
        take,
        select: {
          id: true,
          originalName: true,
          deletedAt: true,
          interview: {
            select: { participant: { select: { displayName: true } } },
          },
        },
      }),
      this.prisma.participant.findMany({
        where: deleted,
        take,
        select: {
          id: true,
          displayName: true,
          deletedAt: true,
          project: { select: { name: true } },
        },
      }),
      this.prisma.finding.findMany({
        where: deleted,
        take,
        select: {
          id: true,
          title: true,
          deletedAt: true,
          project: { select: { name: true } },
        },
      }),
      this.prisma.analysisReport.findMany({
        where: deleted,
        take,
        select: {
          id: true,
          title: true,
          deletedAt: true,
          project: { select: { name: true } },
        },
      }),
      this.prisma.user.findMany({
        where: deleted,
        take,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          deletedAt: true,
        },
      }),
    ]);

    const items: TrashItem[] = [
      ...projects.map((p) => ({
        type: 'project' as const,
        id: p.id,
        name: p.name,
        deletedAt: p.deletedAt!,
      })),
      ...interviews.map((i) => ({
        type: 'interview' as const,
        id: i.id,
        name: `${i.type ? `${i.type} · ` : ''}${i.participant.displayName}`,
        context: i.project?.name,
        deletedAt: i.deletedAt!,
      })),
      ...recordings.map((m) => ({
        type: 'recording' as const,
        id: m.id,
        name: m.originalName,
        context: m.interview?.participant.displayName,
        deletedAt: m.deletedAt!,
      })),
      ...participants.map((p) => ({
        type: 'participant' as const,
        id: p.id,
        name: p.displayName,
        context: p.project?.name,
        deletedAt: p.deletedAt!,
      })),
      ...findings.map((f) => ({
        type: 'finding' as const,
        id: f.id,
        name: f.title,
        context: f.project?.name,
        deletedAt: f.deletedAt!,
      })),
      ...reports.map((r) => ({
        type: 'report' as const,
        id: r.id,
        name: r.title,
        context: r.project?.name,
        deletedAt: r.deletedAt!,
      })),
      ...users.map((u) => ({
        type: 'user' as const,
        id: u.id,
        name: `${u.firstName} ${u.lastName}`.trim(),
        context: u.email,
        deletedAt: u.deletedAt!,
      })),
    ];
    return items.sort((a, b) => b.deletedAt.getTime() - a.deletedAt.getTime());
  }

  async restore(type: TrashType, id: string, organizationId: string) {
    const where = { id, organizationId, deletedAt: { not: null } };
    switch (type) {
      case 'project': {
        const project = await this.prisma.project.findFirst({ where });
        if (!project) throw new NotFoundException('Nothing to restore');
        const at = project.deletedAt!;
        // Bring back exactly what was deleted with it (same timestamp).
        await this.prisma.$transaction([
          this.prisma.project.update({
            where: { id },
            data: { deletedAt: null },
          }),
          this.prisma.interview.updateMany({
            where: { projectId: id, organizationId, deletedAt: at },
            data: { deletedAt: null },
          }),
          this.prisma.participant.updateMany({
            where: { projectId: id, organizationId, deletedAt: at },
            data: { deletedAt: null },
          }),
          this.prisma.analysisReport.updateMany({
            where: { projectId: id, organizationId, deletedAt: at },
            data: { deletedAt: null },
          }),
        ]);
        break;
      }
      case 'interview': {
        const interview = await this.prisma.interview.findFirst({
          where,
          include: { project: true },
        });
        if (!interview) throw new NotFoundException('Nothing to restore');
        if (interview.project?.deletedAt) {
          throw new BadRequestException(
            `Restore the project "${interview.project.name}" first`,
          );
        }
        await this.prisma.interview.update({
          where: { id },
          data: { deletedAt: null },
        });
        break;
      }
      case 'recording': {
        const media = await this.prisma.media.findFirst({
          where,
          include: { interview: true },
        });
        if (!media) throw new NotFoundException('Nothing to restore');
        if (media.interview?.deletedAt)
          throw new BadRequestException('Restore its interview first');
        await this.prisma.media.update({
          where: { id },
          data: { deletedAt: null },
        });
        break;
      }
      case 'participant': {
        const participant = await this.prisma.participant.findFirst({
          where,
          include: { project: true },
        });
        if (!participant) throw new NotFoundException('Nothing to restore');
        if (participant.project?.deletedAt) {
          throw new BadRequestException(
            `Restore the project "${participant.project.name}" first`,
          );
        }
        await this.prisma.participant.update({
          where: { id },
          data: { deletedAt: null },
        });
        break;
      }
      case 'finding': {
        const count = await this.prisma.finding.updateMany({
          where,
          data: { deletedAt: null },
        });
        if (!count.count) throw new NotFoundException('Nothing to restore');
        break;
      }
      case 'report': {
        const report = await this.prisma.analysisReport.findFirst({
          where,
          include: { project: true },
        });
        if (!report) throw new NotFoundException('Nothing to restore');
        if (report.project?.deletedAt) {
          throw new BadRequestException(
            `Restore the project "${report.project.name}" first`,
          );
        }
        await this.prisma.analysisReport.update({
          where: { id },
          data: { deletedAt: null },
        });
        break;
      }
      case 'user': {
        // Restored users can sign in again; a new field access code must be issued.
        const count = await this.prisma.user.updateMany({
          where,
          data: { deletedAt: null, isActive: true },
        });
        if (!count.count) throw new NotFoundException('Nothing to restore');
        break;
      }
    }
    return { restored: true };
  }
}
