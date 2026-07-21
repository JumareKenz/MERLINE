import {
  Controller, Get, Post, Put, Delete, Param, Body,
  UseGuards, ParseUUIDPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { OptionsService } from './options.service';
import { CreateOptionDto } from './dto/create-option.dto';
import { UpdateOptionDto } from './dto/update-option.dto';

@UseGuards(JwtAuthGuard)
@Controller('questions/:questionId/options')
export class OptionsController {
  constructor(private readonly optionsService: OptionsService) {}

  @Get()
  async findAll(@Param('questionId', ParseUUIDPipe) questionId: string) {
    return this.optionsService.findAll(questionId);
  }

  @Post()
  async create(
    @Param('questionId', ParseUUIDPipe) questionId: string,
    @Body() dto: CreateOptionDto,
  ) {
    return this.optionsService.create(questionId, dto);
  }

  @Get(':id')
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.optionsService.findById(id);
  }

  @Put(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateOptionDto,
  ) {
    return this.optionsService.update(id, dto);
  }

  @Delete(':id')
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.optionsService.remove(id);
  }

  @Put('reorder')
  async reorder(
    @Param('questionId', ParseUUIDPipe) questionId: string,
    @Body() orderedIds: string[],
  ) {
    return this.optionsService.reorder(questionId, orderedIds);
  }
}
