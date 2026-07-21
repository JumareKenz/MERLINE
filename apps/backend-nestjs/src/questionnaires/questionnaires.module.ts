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
