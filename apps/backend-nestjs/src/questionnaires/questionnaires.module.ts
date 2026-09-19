/**
 * LEGACY — FROZEN (Phase 0, qualitative reset)
 *
 * This module is MERL functionality and is NO LONGER REGISTERED in
 * `app.module.ts`. Its providers cannot be injected by qualitative code.
 *
 * Frozen: bug fixes only, and only if they block the qualitative path.
 * Do not re-register it. Do not import it from active modules —
 * `common/architecture/legacy-boundary.spec.ts` fails the build if you do.
 *
 * Kept on disk, with its tables intact, until the data-preservation decision
 * is confirmed. See LEGACY.md.
 */
import { Module } from '@nestjs/common';
import { PrismaModule } from '../database/prisma.module';
import { QuestionnairesController } from './questionnaires.controller';
import { QuestionnairesService } from './questionnaires.service';
import { SectionsController } from './sections.controller';
import { SectionsService } from './sections.service';
import { QuestionsController } from './questions.controller';
import { QuestionsService } from './questions.service';
import { OptionsController } from './options.controller';
import { OptionsService } from './options.service';
import { SkipLogicController } from './skip-logic.controller';
import { SkipLogicService } from './skip-logic.service';
import { ValidationsController } from './validations.controller';
import { ValidationsService } from './validations.service';
import { TranslationsController } from './translations.controller';
import { TranslationsService } from './translations.service';

@Module({
  imports: [PrismaModule],
  controllers: [
    QuestionnairesController,
    SectionsController,
    QuestionsController,
    OptionsController,
    SkipLogicController,
    ValidationsController,
    TranslationsController,
  ],
  providers: [
    QuestionnairesService,
    SectionsService,
    QuestionsService,
    OptionsService,
    SkipLogicService,
    ValidationsService,
    TranslationsService,
  ],
  exports: [
    QuestionnairesService,
    SectionsService,
    QuestionsService,
    OptionsService,
  ],
})
export class QuestionnairesModule {}
