import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { BaseService } from '../common/base/base.service';
import { CreateQuestionnaireDto } from './dto/create-questionnaire.dto';
import { UpdateQuestionnaireDto } from './dto/update-questionnaire.dto';
import { toJsonValue } from '../common/utils/prisma-json';

interface ImportQuestionOption {
  text: string;
  value: string;
  sortOrder?: number;
}

interface ImportSkipLogic {
  condition: unknown;
  action: string;
  targetId?: string;
}

interface ImportValidation {
  rule: string;
  value?: string;
  message?: string;
}

interface ImportTranslation {
  locale: string;
  text: string;
  description?: string;
}

interface ImportQuestion {
  text: string;
  description?: string;
  type: string;
  sortOrder?: number;
  isRequired?: boolean;
  options?: ImportQuestionOption[];
  skipLogic?: ImportSkipLogic[];
  validations?: ImportValidation[];
  translations?: ImportTranslation[];
}

interface ImportSection {
  title: string;
  description?: string;
  sortOrder?: number;
  questions?: ImportQuestion[];
}

interface ImportData {
  title: string;
  description?: string;
  locale?: string;
  sections?: ImportSection[];
}

@Injectable()
export class QuestionnairesService extends BaseService {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async findAll(query: {
    studyId?: string;
    status?: string;
    page?: number;
    limit?: number;
    search?: string;
  }) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 20));
    const skip = (page - 1) * limit;

    const where: any = { deletedAt: null };
    if (query.studyId) where.studyId = query.studyId;
    if (query.status) where.status = query.status;
    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.questionnaire.findMany({
        where,
        skip,
        take: limit,
        include: {
          _count: { select: { sections: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.questionnaire.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  async findById(id: string) {
    const q = await this.prisma.questionnaire.findFirst({
      where: { id, deletedAt: null },
      include: {
        sections: {
          orderBy: { sortOrder: 'asc' },
          include: {
            questions: {
              orderBy: { sortOrder: 'asc' },
              include: {
                options: { orderBy: { sortOrder: 'asc' } },
                skipLogic: true,
                validations: true,
                translations: true,
              },
            },
          },
        },
      },
    });
    if (!q) throw new NotFoundException('Questionnaire not found');
    return q;
  }

  async create(dto: CreateQuestionnaireDto, userId: string, organizationId: string) {
    return this.prisma.questionnaire.create({
      data: {
        title: dto.title,
        description: dto.description,
        locale: dto.locale ?? 'en',
        studyId: dto.studyId,
        organizationId,
        createdById: userId,
      },
    });
  }

  async update(id: string, dto: UpdateQuestionnaireDto) {
    await this.findById(id);
    return this.prisma.questionnaire.update({
      where: { id },
      data: {
        title: dto.title,
        description: dto.description,
        locale: dto.locale,
      },
    });
  }

  async remove(id: string) {
    await this.findById(id);
    return this.prisma.questionnaire.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async clone(id: string, userId: string, organizationId: string) {
    const source = await this.findById(id);

    return this.executeTransaction(async (tx) => {
      const newQuestionnaire = await tx.questionnaire.create({
        data: {
          title: `${source.title} (Copy)`,
          description: source.description,
          locale: source.locale,
          studyId: source.studyId,
          organizationId,
          createdById: userId,
        },
      });

      for (const section of source.sections) {
        const newSection = await tx.section.create({
          data: {
            title: section.title,
            description: section.description,
            sortOrder: section.sortOrder,
            questionnaireId: newQuestionnaire.id,
          },
        });

        for (const question of section.questions) {
          const newQuestion = await tx.question.create({
            data: {
              text: question.text,
              description: question.description,
              type: question.type,
              sortOrder: question.sortOrder,
              isRequired: question.isRequired,
              sectionId: newSection.id,
            },
          });

          if (question.options?.length) {
            await tx.questionOption.createMany({
              data: question.options.map((opt) => ({
                text: opt.text,
                value: opt.value,
                sortOrder: opt.sortOrder,
                questionId: newQuestion.id,
              })),
            });
          }

          if (question.skipLogic?.length) {
            await tx.skipLogic.createMany({
              data: question.skipLogic.map((logic) => ({
                condition: toJsonValue(logic.condition),
                action: logic.action,
                targetId: logic.targetId,
                questionId: newQuestion.id,
              })),
            });
          }

          if (question.validations?.length) {
            await tx.questionValidation.createMany({
              data: question.validations.map((v) => ({
                rule: v.rule,
                value: v.value,
                message: v.message,
                questionId: newQuestion.id,
              })),
            });
          }

          if (question.translations?.length) {
            await tx.questionTranslation.createMany({
              data: question.translations.map((t) => ({
                locale: t.locale,
                text: t.text,
                description: t.description,
                questionId: newQuestion.id,
              })),
            });
          }
        }
      }

      return tx.questionnaire.findFirst({
        where: { id: newQuestionnaire.id, deletedAt: null },
        include: {
          sections: {
            include: {
              questions: {
                include: {
                  options: true,
                  skipLogic: true,
                  validations: true,
                  translations: true,
                },
                orderBy: { sortOrder: 'asc' },
              },
            },
            orderBy: { sortOrder: 'asc' },
          },
        },
      });
    }) as unknown as Promise<ReturnType<typeof this.findById>>;
  }

  async publish(id: string) {
    const q = await this.findById(id);
    if (q.status !== 'draft') {
      throw new ConflictException('Only draft questionnaires can be published');
    }
    return this.prisma.questionnaire.update({
      where: { id },
      data: { status: 'published', version: q.version + 1 },
    });
  }

  async archive(id: string) {
    const q = await this.findById(id);
    if (q.status === 'archived') {
      throw new ConflictException('Questionnaire is already archived');
    }
    return this.prisma.questionnaire.update({
      where: { id },
      data: { status: 'archived' },
    });
  }

  async getTree(id: string) {
    return this.findById(id);
  }

  async submitForReview(id: string) {
    const q = await this.findById(id);
    if (q.status !== 'draft' && q.status !== 'published') {
      throw new ConflictException('Only draft or published questionnaires can be submitted for review');
    }
    return this.prisma.questionnaire.update({
      where: { id },
      data: { status: 'review' },
    });
  }

  async approveRevision(id: string) {
    const q = await this.findById(id);
    if (q.status !== 'review') {
      throw new ConflictException('Questionnaire must be in review status to approve');
    }
    return this.prisma.questionnaire.update({
      where: { id },
      data: { status: 'published', version: q.version + 1 },
    });
  }

  async exportJson(id: string) {
    const q = await this.findById(id);
    return {
      title: q.title,
      description: q.description,
      version: q.version,
      status: q.status,
      locale: q.locale,
      sections: q.sections.map((s) => ({
        title: s.title,
        description: s.description,
        sortOrder: s.sortOrder,
        questions: s.questions.map((qu) => ({
          text: qu.text,
          description: qu.description,
          type: qu.type,
          sortOrder: qu.sortOrder,
          isRequired: qu.isRequired,
          options: qu.options.map((o) => ({
            text: o.text,
            value: o.value,
            sortOrder: o.sortOrder,
          })),
          skipLogic: qu.skipLogic.map((sl) => ({
            condition: sl.condition,
            action: sl.action,
            targetId: sl.targetId,
          })),
          validations: qu.validations.map((v) => ({
            rule: v.rule,
            value: v.value,
            message: v.message,
          })),
          translations: qu.translations.map((t) => ({
            locale: t.locale,
            text: t.text,
            description: t.description,
          })),
        })),
      })),
    };
  }

  async importJson(data: ImportData, studyId: string, userId: string, organizationId: string) {
    return this.executeTransaction(async (tx) => {
      const q = await tx.questionnaire.create({
        data: {
          title: data.title,
          description: data.description,
          locale: data.locale ?? 'en',
          studyId,
          organizationId,
          createdById: userId,
        },
      });
      if (data.sections) {
        for (const sectionData of data.sections) {
          const section = await tx.section.create({
            data: {
              title: sectionData.title,
              description: sectionData.description,
              sortOrder: sectionData.sortOrder ?? 0,
              questionnaireId: q.id,
            },
          });
          if (sectionData.questions) {
            for (const questionData of sectionData.questions) {
              const question = await tx.question.create({
                data: {
                  text: questionData.text,
                  description: questionData.description,
                  type: questionData.type,
                  sortOrder: questionData.sortOrder ?? 0,
                  isRequired: questionData.isRequired ?? false,
                  sectionId: section.id,
                },
              });
              if (questionData.options) {
                await tx.questionOption.createMany({
                  data: questionData.options.map((opt: ImportQuestionOption) => ({
                    text: opt.text, value: opt.value, sortOrder: opt.sortOrder ?? 0, questionId: question.id,
                  })),
                });
              }
            if (questionData.skipLogic?.length) {
              await tx.skipLogic.createMany({
                data: questionData.skipLogic.map((sl: ImportSkipLogic) => ({
                  condition: sl.condition as any, action: sl.action, targetId: sl.targetId, questionId: question.id,
                })),
              });
            }
            if (questionData.validations?.length) {
              await tx.questionValidation.createMany({
                data: questionData.validations.map((v: ImportValidation) => ({
                  rule: v.rule, value: v.value, message: v.message, questionId: question.id,
                })),
              });
            }
            if (questionData.translations?.length) {
              await tx.questionTranslation.createMany({
                data: questionData.translations.map((t: ImportTranslation) => ({
                  locale: t.locale, text: t.text, description: t.description, questionId: question.id,
                })),
              });
            }
          }
        }
      }
    }
    return tx.questionnaire.findFirst({
      where: { id: q.id, deletedAt: null },
      include: {
        sections: {
          include: {
            questions: {
              include: { options: true, skipLogic: true, validations: true, translations: true },
              orderBy: { sortOrder: 'asc' },
            },
          },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });
  }) as unknown as Promise<ReturnType<typeof this.findById>>;
  }
}
