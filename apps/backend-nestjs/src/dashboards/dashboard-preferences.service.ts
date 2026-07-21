import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { BaseService } from '../common/base/base.service';

@Injectable()
export class DashboardPreferencesService extends BaseService {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async getLayout(userId: string) {
    const pref = await this.prisma.userDashboardPreference.findUnique({
      where: { userId },
    });

    return pref?.layout ?? [];
  }

  async saveLayout(userId: string, organizationId: string, layout: unknown) {
    return this.prisma.userDashboardPreference.upsert({
      where: { userId },
      create: {
        userId,
        organizationId,
        layout: layout as any,
      },
      update: {
        layout: layout as any,
      },
    });
  }
}
