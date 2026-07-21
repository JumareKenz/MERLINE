import {
  Controller, Get, Post, Put, Delete, Param, Body,
  UseGuards, ParseUUIDPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TranslationsService } from './translations.service';

@UseGuards(JwtAuthGuard)
@Controller('questions/:questionId/translations')
export class TranslationsController {
  constructor(private readonly translationsService: TranslationsService) {}

  @Get()
  async findAll(@Param('questionId', ParseUUIDPipe) questionId: string) {
    return this.translationsService.findAll(questionId);
  }

  @Post()
  async create(
    @Param('questionId', ParseUUIDPipe) questionId: string,
    @Body() dto: { locale: string; text: string; description?: string },
  ) {
    return this.translationsService.create(questionId, dto);
  }

  @Get(':id')
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.translationsService.findById(id);
  }

  @Put(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: { text?: string; description?: string },
  ) {
    return this.translationsService.update(id, dto);
  }

  @Delete(':id')
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.translationsService.remove(id);
  }
}
