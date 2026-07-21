import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { BaseService } from '../common/base/base.service';
import { CreatePromptDto } from './dto/create-prompt.dto';
import { UpdatePromptDto } from './dto/update-prompt.dto';

@Injectable()
export class PromptRegistryService extends BaseService {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async getPrompt(name: string, organizationId: string) {
    return this.prisma.aiPrompt.findFirst({
      where: { name, organizationId, isActive: true },
      orderBy: { version: 'desc' },
    });
  }

  async createPrompt(dto: CreatePromptDto, organizationId: string, userId: string) {
    const existing = await this.prisma.aiPrompt.findFirst({
      where: { name: dto.name, organizationId },
      orderBy: { version: 'desc' },
    });

    if (existing) {
      return this.prisma.aiPrompt.create({
        data: {
          name: dto.name,
          content: dto.content,
          version: existing.version + 1,
          model: dto.model,
          temperature: dto.temperature,
          maxTokens: dto.maxTokens,
          isActive: true,
          organizationId,
          createdById: userId,
        },
      });
    }

    return this.prisma.aiPrompt.create({
      data: {
        name: dto.name,
        content: dto.content,
        version: 1,
        model: dto.model,
        temperature: dto.temperature,
        maxTokens: dto.maxTokens,
        isActive: true,
        organizationId,
        createdById: userId,
      },
    });
  }

  async updatePrompt(id: string, dto: UpdatePromptDto) {
    const prompt = await this.prisma.aiPrompt.findUnique({ where: { id } });
    if (!prompt) {
      throw new NotFoundException('Prompt not found');
    }

    return this.prisma.aiPrompt.update({
      where: { id },
      data: {
        ...dto,
        version: prompt.version + 1,
      },
    });
  }

  async listPrompts(organizationId: string) {
    return this.prisma.aiPrompt.findMany({
      where: { organizationId },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async deletePrompt(id: string) {
    const prompt = await this.prisma.aiPrompt.findUnique({ where: { id } });
    if (!prompt) {
      throw new NotFoundException('Prompt not found');
    }

    await this.prisma.aiPrompt.update({
      where: { id },
      data: { isActive: false },
    });

    return { deleted: true };
  }
}
