import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { BaseService } from '../common/base/base.service';

@Injectable()
export class TranslationsService extends BaseService {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async findAll(questionId: string) {
    return this.prisma.questionTranslation.findMany({
      where: { questionId },
    });
  }

  async findById(id: string) {
    const translation = await this.prisma.questionTranslation.findUnique({ where: { id } });
    if (!translation) throw new NotFoundException('Translation not found');
    return translation;
  }

  async create(questionId: string, dto: { locale: string; text: string; description?: string }) {
    const existing = await this.prisma.questionTranslation.findUnique({
      where: { questionId_locale: { questionId, locale: dto.locale } },
    });
    if (existing) {
      throw new ConflictException(`Translation for locale "${dto.locale}" already exists`);
    }
    return this.prisma.questionTranslation.create({
      data: {
        locale: dto.locale,
        text: dto.text,
        description: dto.description,
        questionId,
      },
    });
  }

  async update(id: string, dto: { text?: string; description?: string }) {
    await this.findById(id);
    return this.prisma.questionTranslation.update({
      where: { id },
      data: {
        text: dto.text,
        description: dto.description,
      },
    });
  }

  async remove(id: string) {
    await this.findById(id);
    return this.prisma.questionTranslation.delete({ where: { id } });
  }
}
