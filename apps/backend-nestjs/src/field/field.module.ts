import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { FieldController, FieldTeamController } from './field.controller';
import { FieldService } from './field.service';
import { FieldTeamService } from './field-team.service';

@Module({
  imports: [UsersModule],
  controllers: [FieldController, FieldTeamController],
  providers: [FieldService, FieldTeamService],
})
export class FieldModule {}
