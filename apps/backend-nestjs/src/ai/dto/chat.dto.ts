import { IsOptional, IsString, IsNotEmpty, IsUUID } from 'class-validator';

export class ChatDto {
  @IsUUID()
  @IsOptional()
  sessionId?: string;

  @IsString()
  @IsNotEmpty()
  message: string;
}
