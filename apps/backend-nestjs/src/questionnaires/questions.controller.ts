import {
  Controller, Get, Post, Put, Delete, Param, Body,
  UseGuards, ParseUUIDPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { QuestionsService } from './questions.service';
import { CreateQuestionDto } from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';

@UseGuards(JwtAuthGuard)
@Controller('sections/:sectionId/questions')
export class QuestionsController {
  constructor(private readonly questionsService: QuestionsService) {}

  @Get()
  async findAll(@Param('sectionId', ParseUUIDPipe) sectionId: string) {
    return this.questionsService.findAll(sectionId);
  }

  @Post()
  async create(
    @Param('sectionId', ParseUUIDPipe) sectionId: string,
    @Body() dto: CreateQuestionDto,
  ) {
    return this.questionsService.create(sectionId, dto);
  }

  @Get(':id')
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.questionsService.findById(id);
  }

  @Put(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateQuestionDto,
  ) {
    return this.questionsService.update(id, dto);
  }

  @Delete(':id')
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.questionsService.remove(id);
  }

  @Put('reorder')
  async reorder(
    @Param('sectionId', ParseUUIDPipe) sectionId: string,
    @Body() orderedIds: string[],
  ) {
    return this.questionsService.reorder(sectionId, orderedIds);
  }
}
