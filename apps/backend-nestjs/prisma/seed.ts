import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

async function main() {
  const orgId = uuidv4();
  const adminRoleId = uuidv4();
  const userId = uuidv4();

  const adminPassword = await bcrypt.hash('admin123', 12);

  const org = await prisma.organization.upsert({
    where: { slug: 'demo-org' },
    update: {},
    create: {
      id: orgId,
      name: 'Demo Organization',
      slug: 'demo-org',
      settings: { locale: 'en', timezone: 'UTC' },
    },
  });

  const adminRole = await prisma.role.upsert({
    where: { slug_organizationId: { slug: 'administrator', organizationId: org.id } },
    update: {},
    create: {
      id: adminRoleId,
      name: 'Administrator',
      slug: 'administrator',
      description: 'Full system access',
      organizationId: org.id,
      isSystem: true,
    },
  });

  const viewerRole = await prisma.role.upsert({
    where: { slug_organizationId: { slug: 'viewer', organizationId: org.id } },
    update: {},
    create: {
      id: uuidv4(),
      name: 'Viewer',
      slug: 'viewer',
      description: 'Read-only access',
      organizationId: org.id,
      isSystem: true,
    },
  });

  const enumeratorRole = await prisma.role.upsert({
    where: { slug_organizationId: { slug: 'enumerator', organizationId: org.id } },
    update: {},
    create: {
      id: uuidv4(),
      name: 'Enumerator',
      slug: 'enumerator',
      description: 'Field data collection',
      organizationId: org.id,
      isSystem: true,
    },
  });

  const admin = await prisma.user.upsert({
    where: { email: 'admin@merline.org' },
    update: {},
    create: {
      id: userId,
      email: 'admin@merline.org',
      passwordHash: adminPassword,
      firstName: 'Admin',
      lastName: 'User',
      organizationId: org.id,
      isActive: true,
      emailVerifiedAt: new Date(),
    },
  });

  await prisma.roleUser.upsert({
    where: { userId_roleId: { userId: admin.id, roleId: adminRole.id } },
    update: {},
    create: { userId: admin.id, roleId: adminRole.id },
  });

  const projectId = uuidv4();
  const project = await prisma.project.upsert({
    where: { id: projectId },
    update: {},
    create: {
      id: projectId,
      name: 'Kenya Health Impact Evaluation',
      description: 'A comprehensive health impact evaluation across select counties in Kenya.',
      status: 'active',
      organizationId: org.id,
      createdById: admin.id,
      startDate: new Date('2026-01-01'),
      endDate: new Date('2026-12-31'),
    },
  });

  const studyId = uuidv4();
  await prisma.study.upsert({
    where: { id: studyId },
    update: {},
    create: {
      id: studyId,
      title: 'Baseline Health Survey 2026',
      code: 'BHS-2026-001',
      status: 'DRAFT',
      type: 'BASELINE',
      projectId: project.id,
      organizationId: org.id,
      createdById: admin.id,
      startDate: new Date('2026-03-01'),
      endDate: new Date('2026-06-30'),
    },
  });

  const qnrId = uuidv4();
  await prisma.questionnaire.upsert({
    where: { id: qnrId },
    update: {},
    create: {
      id: qnrId,
      title: 'Household Health Survey',
      description: 'Standard household health questionnaire for baseline assessment.',
      status: 'draft',
      version: 1,
      studyId,
      organizationId: org.id,
      createdById: admin.id,
    },
  });

  console.log('Seed completed successfully');
  console.log('Admin login: admin@merline.org / admin123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
