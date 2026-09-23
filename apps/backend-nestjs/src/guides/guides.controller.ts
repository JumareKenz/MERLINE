import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import type { AuthenticatedUser } from '../common/interfaces';
import { ImportGuideDto, SaveGuideDto } from './dto/guide.dto';
import { templateCsv, templateXlsx } from './guide-import';
import { GuidesService } from './guides.service';

@Controller('guides')
export class GuidesController {
  constructor(private readonly guides: GuidesService) {}

  @Get()
  @Permissions('view.guides')
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query('projectId', new ParseUUIDPipe({ optional: true }))
    projectId?: string,
    @Query('interviewType') interviewType?: string,
  ) {
    return this.guides.list(user.organizationId, { projectId, interviewType });
  }

  /** The upload template, with three example questions in English and Hausa. */
  @Get('template')
  @Permissions('view.guides')
  async template(@Query('format') format: string, @Res() res: Response) {
    if (format === 'xlsx') {
      const buf = await templateXlsx();
      res.set({
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition':
          'attachment; filename="merline-guide-template.xlsx"',
      });
      return res.end(buf);
    }
    res.set({
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition':
        'attachment; filename="merline-guide-template.csv"',
    });
    return res.end(templateCsv());
  }

  @Post('import')
  @Permissions('create.guides')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }),
  )
  import(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: ImportGuideDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!file) throw new BadRequestException('Attach a .csv or .xlsx file');
    return this.guides.import(file, dto, user.id, user.organizationId);
  }

  @Get(':id')
  @Permissions('view.guides')
  findById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.guides.findById(id, user.organizationId);
  }

  @Post()
  @Permissions('create.guides')
  create(@Body() dto: SaveGuideDto, @CurrentUser() user: AuthenticatedUser) {
    return this.guides.create(dto, user.id, user.organizationId);
  }

  /** Edits a draft, or starts the next version of an approved guide. */
  @Put(':id')
  @Permissions('edit.guides')
  save(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SaveGuideDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.guides.save(id, dto, user.id, user.organizationId);
  }

  @Post(':id/approve')
  @Permissions('approve.guides')
  approve(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.guides.approve(id, user.id, user.organizationId);
  }

  @Post(':id/archive')
  @Permissions('edit.guides')
  archive(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.guides.archive(id, user.organizationId);
  }

  @Delete(':id')
  @Permissions('delete.guides')
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.guides.remove(id, user.organizationId);
  }
}
