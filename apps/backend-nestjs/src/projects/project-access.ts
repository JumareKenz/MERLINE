import { NotFoundException } from '@nestjs/common';
import type { PrismaService } from '../database/prisma.service';

/**
 * A project id from a URL must resolve inside the caller's organization.
 * Project sub-resources (team, tags, activities) used to check only that
 * the project existed at all, so any signed-in user could read or change
 * another tenant's project team and tags by id.
 */
export async function requireProjectInOrganization(
  prisma: Pick<PrismaService, 'project'>,
  projectId: string,
  organizationId: string,
) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, organizationId, deletedAt: null },
    select: { id: true },
  });
  if (!project) throw new NotFoundException('Project not found');
  return project;
}
