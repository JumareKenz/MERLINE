import {
  Controller, Get, Post, Put, Delete, Param, Body,
  UseGuards, ParseUUIDPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ValidationsService } from './validations.service';

@UseGuards(JwtAuthGuard)
@Controller()
export class ValidationsController {
  constructor(private readonly validationsService: ValidationsService) {}

  @Get('questions/:questionId/validations')
  async findAll(@Param('questionId', ParseUUIDPipe) questionId: string) {
    return this.validationsService.findAll(questionId);
  }

  @Post('questions/:questionId/validations')
  async create(
    @Param('questionId', ParseUUIDPipe) questionId: string,
    @Body() dto: { rule: string; value?: string; message?: string },
  ) {
    return this.validationsService.create(questionId, dto);
  }

  @Get('questions/:questionId/validations/:id')
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.validationsService.findById(id);
  }

  @Put('questions/:questionId/validations/:id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: { rule?: string; value?: string; message?: string },
  ) {
    return this.validationsService.update(id, dto);
  }

  @Delete('validation-rules/:id')
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.validationsService.remove(id);
  }
}
