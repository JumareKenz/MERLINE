import {
  Controller, Get, Post, Put, Delete, Param, Body,
  UseGuards, ParseUUIDPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { SkipLogicService } from './skip-logic.service';

@UseGuards(JwtAuthGuard)
@Controller('questions/:questionId/skip-logic')
export class SkipLogicController {
  constructor(private readonly skipLogicService: SkipLogicService) {}

  @Get()
  async findAll(@Param('questionId', ParseUUIDPipe) questionId: string) {
    return this.skipLogicService.findAll(questionId);
  }

  @Post()
  async create(
    @Param('questionId', ParseUUIDPipe) questionId: string,
    @Body() dto: { condition: any; action: string; targetId?: string },
  ) {
    return this.skipLogicService.create(questionId, dto);
  }

  @Get(':id')
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.skipLogicService.findById(id);
  }

  @Put(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: { condition?: any; action?: string; targetId?: string },
  ) {
    return this.skipLogicService.update(id, dto);
  }

  @Delete(':id')
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.skipLogicService.remove(id);
  }
}
