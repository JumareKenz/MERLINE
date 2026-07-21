import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppConfigModule } from './config/config.module';
import { PrismaModule } from './database/prisma.module';
import { AuditLogInterceptor } from './common/interceptors/audit-log.interceptor';
import { AuthModule } from './auth/auth.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { UsersModule } from './users/users.module';
import { ProjectsModule } from './projects/projects.module';
import { StudiesModule } from './studies/studies.module';
import { IndicatorsModule } from './indicators/indicators.module';
import { QuestionnairesModule } from './questionnaires/questionnaires.module';
import { SubmissionsModule } from './submissions/submissions.module';
import { AssignmentsModule } from './assignments/assignments.module';
import { MediaModule } from './media/media.module';
import { SyncModule } from './sync/sync.module';
import { ReportsModule } from './reports/reports.module';
import { DashboardsModule } from './dashboards/dashboards.module';
import { AiModule } from './ai/ai.module';
import { AuditLogModule } from './audit-log/audit-log.module';
import { NotificationsModule } from './notifications/notifications.module';

@Module({
  imports: [
    AppConfigModule,
    PrismaModule,
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 60 }]),
    AuthModule,
    OrganizationsModule,
    UsersModule,
    ProjectsModule,
    StudiesModule,
    IndicatorsModule,
    QuestionnairesModule,
    SubmissionsModule,
    AssignmentsModule,
    MediaModule,
    SyncModule,
    ReportsModule,
    DashboardsModule,
    AiModule,
    AuditLogModule,
    NotificationsModule,
  ],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditLogInterceptor,
    },
  ],
})
export class AppModule {}
