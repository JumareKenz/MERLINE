import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { provisionOrganizationRoles } from './organization-provisioning';

/**
 * Brings every organization's permissions in line with the catalogue when
 * the API starts, so a permission added in code (e.g. a new delete.*)
 * reaches existing administrators on deploy without a manual script.
 * Provisioning only adds, so this never widens a role beyond its
 * definition or undoes a deliberate removal done by a migration.
 */
@Injectable()
export class PermissionCatalogueSync implements OnApplicationBootstrap {
  private readonly logger = new Logger(PermissionCatalogueSync.name);

  constructor(private readonly prisma: PrismaService) {}

  async onApplicationBootstrap() {
    if (process.env.JEST_WORKER_ID) return;
    try {
      const orgs = await this.prisma.organization.findMany({
        where: { deletedAt: null },
        select: { id: true },
      });
      for (const org of orgs) {
        await provisionOrganizationRoles(this.prisma, org.id);
      }
      this.logger.log(
        `Permission catalogue synced for ${orgs.length} organization(s)`,
      );
    } catch (err) {
      // Never block startup on this; the repair script still exists.
      this.logger.error(
        `Permission catalogue sync failed: ${err instanceof Error ? err.message : err}`,
      );
    }
  }
}
