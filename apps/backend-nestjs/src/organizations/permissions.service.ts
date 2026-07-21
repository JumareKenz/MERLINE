import { Injectable, NotFoundException } from '@nestjs/common';
import { BaseService } from '../common/base/base.service';

@Injectable()
export class PermissionsService extends BaseService {
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
