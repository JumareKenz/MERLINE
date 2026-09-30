import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { BaseService } from '../common/base/base.service';
import {
  availableInterviewTypes,
} from '../common/research/interview-type';
import { SetProjectInterviewTypesDto } from './interview-types.dto';

@Injectable()
export class InterviewTypesService extends BaseService {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async list(projectId: string, organizationId: string) {
    await this.requireProject(projectId, organizationId);
    const configured =
      (await this.prisma.projectInterviewType.count({
        where: { projectId, organizationId, isActive: true },
      })) > 0;
    return {
      configured,
      types: await availableInterviewTypes(this.prisma, organizationId, projectId),
    };
  }

  /**
   * Replaces the project's list. A type that already has interviews cannot
   * be dropped (their `type` would point at nothing): it is kept, inactive
   * types simply stop being offered.
   */
  async replace(projectId: string, dto: SetProjectInterviewTypesDto, organizationId: string) {
    await this.requireProject(projectId, organizationId);
    const keys = dto.types.map((t) => t.key);
    if (new Set(keys).size !== keys.length) {
      throw new BadRequestException('Each interview type key can appear only once');
    }
    if (!dto.types.length) {
      throw new BadRequestException(
        'A project needs at least one interview type. Remove the list to fall back to the standard types.',
      );
    }
    for (const t of dto.types) {
      for (const f of t.fields ?? []) {
        if (f.kind === 'select' && !f.options?.length) {
          throw new BadRequestException(`"${f.label}" needs at least one option`);
        }
      }
    }

    await this.executeTransaction(async (tx) => {
      await tx.projectInterviewType.updateMany({
        where: { projectId, organizationId, key: { notIn: keys } },
        data: { isActive: false },
      });
      for (const [i, t] of dto.types.entries()) {
        const data = {
          label: t.label.trim(),
          description: t.description?.trim() || null,
          fields: (t.fields ?? []) as object[],
          sortOrder: i,
          isActive: true,
        };
        await tx.projectInterviewType.upsert({
          where: { projectId_key: { projectId, key: t.key } },
          create: { ...data, key: t.key, projectId, organizationId },
          update: data,
        });
      }
    });
    return this.list(projectId, organizationId);
  }

  /** Counts per type, for filters and the project overview. */
  async usage(projectId: string, organizationId: string) {
    await this.requireProject(projectId, organizationId);
    const rows = await this.prisma.interview.groupBy({
      by: ['type'],
      where: { projectId, organizationId, deletedAt: null },
      _count: { _all: true },
    });
    return rows.map((r) => ({ type: r.type ?? 'OTHER', interviews: r._count._all }));
  }

  private async requireProject(projectId: string, organizationId: string) {
    const p = await this.prisma.project.findFirst({
      where: { id: projectId, organizationId, deletedAt: null },
      select: { id: true },
    });
    if (!p) throw new NotFoundException('Project not found');
  }
}

