import { Injectable, NotFoundException } from '@nestjs/common';
import { BaseService } from '../common/base/base.service';
import { PrismaService } from '../database/prisma.service';

/** PHASE 2 — missing constructor; see organizations.service.ts for why this made every method throw. */
@Injectable()
export class PermissionsService extends BaseService {
  constructor(protected readonly prisma: PrismaService) {
    super(prisma);
  }

  async findAll(orgId: string) {
    const org = await this.prisma.organization.findFirst({
      where: { id: orgId, deletedAt: null },
    });
    if (!org) {
      throw new NotFoundException('Organization not found');
    }
    return this.prisma.permission.findMany({
      where: { organizationId: orgId },
      orderBy: { module: 'asc' },
    });
  }
}
