import { BadRequestException, PipeTransform } from '@nestjs/common';
import { TRASH_TYPES, type TrashType } from './trash.service';

export class TrashTypePipe implements PipeTransform<string, TrashType> {
  transform(value: string): TrashType {
    if (!(TRASH_TYPES as readonly string[]).includes(value)) {
      throw new BadRequestException(`Unknown item type "${value}"`);
    }
    return value as TrashType;
  }
}
