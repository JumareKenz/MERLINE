import {
  Controller, Get, Post, Put, Delete, Param, Body,
  UseGuards, ParseUUIDPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { SectionsService } from './sections.service';
import { CreateSectionDto } from './dto/create-section.dto';
import { UpdateSectionDto } from './dto/update-section.dto';

@UseGuards(JwtAuthGuard)
@Controller('questionnaires/:questionnaireId/sections')
export class SectionsController {
  constructor(private readonly sectionsService: SectionsService) {}

  @Get()
  async findAll(@Param('questionnaireId', ParseUUIDPipe) questionnaireId: string) {
    return this.sectionsService.findAll(questionnaireId);
  }

  @Post()
  async create(
    @Param('questionnaireId', ParseUUIDPipe) questionnaireId: string,
    @Body() dto: CreateSectionDto,
  ) {
    return this.sectionsService.create(questionnaireId, dto);
  }

  @Get(':id')
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.sectionsService.findById(id);
  }

  @Put(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSectionDto,
  ) {
    return this.sectionsService.update(id, dto);
  }

  @Delete(':id')
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.sectionsService.remove(id);
  }

  @Put('reorder')
  async reorder(
    @Param('questionnaireId', ParseUUIDPipe) questionnaireId: string,
    @Body() orderedIds: string[],
  ) {
    return this.sectionsService.reorder(questionnaireId, orderedIds);
  }
}
