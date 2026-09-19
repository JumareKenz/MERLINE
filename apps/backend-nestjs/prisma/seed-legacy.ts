/**
 * PHASE 0 — QUALITATIVE RESET · LEGACY SEED (FROZEN)
 *
 * MERL demo fixtures extracted from the core seed: study and questionnaire.
 *
 * The modules that serve these tables are deregistered from `app.module.ts`,
 * so seeding them produces rows that no active endpoint reads. This file
 * exists so the old fixtures remain reproducible for data-migration and export
 * work while the data-preservation decision is open — see LEGACY.md.
 *
 * Run with: npm run prisma:seed:legacy   (requires the core seed to have run)
 *
 * Do not extend this file. It is deleted alongside the legacy modules.
 */
import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { DEMO_ORG_SLUG, DEMO_PROJECT_NAME } from './seed';

const prisma = new PrismaClient();

async function main() {
  const org = await prisma.organization.findUnique({
    where: { slug: DEMO_ORG_SLUG },
  });
  if (!org) {
    throw new Error(
      'Core seed has not been run. Run `npm run prisma:seed` first.',
    );
  }

  const project = await prisma.project.findFirst({
    where: { name: DEMO_PROJECT_NAME, organizationId: org.id },
  });
  if (!project) {
    throw new Error('Demo project not found. Run `npm run prisma:seed` first.');
  }

  const existingStudy = await prisma.study.findFirst({
    where: { code: 'BHS-2026-001', organizationId: org.id },
  });

  const study =
    existingStudy ??
    (await prisma.study.create({
      data: {
        id: uuidv4(),
        title: 'Baseline Health Survey 2026',
        code: 'BHS-2026-001',
        status: 'DRAFT',
        type: 'BASELINE',
        projectId: project.id,
        organizationId: org.id,
        createdById: project.createdById,
        startDate: new Date('2026-03-01'),
        endDate: new Date('2026-06-30'),
      },
    }));

  const existingQuestionnaire = await prisma.questionnaire.findFirst({
    where: { title: 'Household Health Survey', studyId: study.id },
  });

  if (!existingQuestionnaire) {
    await prisma.questionnaire.create({
      data: {
        id: uuidv4(),
        title: 'Household Health Survey',
        description:
          'Standard household health questionnaire for baseline assessment.',
        status: 'draft',
        version: 1,
        studyId: study.id,
        organizationId: org.id,
        createdById: project.createdById,
      },
    });
  }

  console.log('Legacy MERL seed completed (study + questionnaire).');
  console.log('These rows are not served by any registered module.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
