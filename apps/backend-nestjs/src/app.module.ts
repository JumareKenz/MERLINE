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
import { MediaModule } from './media/media.module';
import { AiModule } from './ai/ai.module';
import { AuditLogModule } from './audit-log/audit-log.module';
import { NotificationsModule } from './notifications/notifications.module';

/**
 * PHASE 0 — QUALITATIVE RESET
 *
 * The MERL modules below are DEREGISTERED, not deleted. Their source remains
 * in `src/` and still compiles; it is simply no longer part of the application
 * graph, so its providers cannot be injected into qualitative code:
 *
 *   assignments · dashboards · indicators · logframes
 *   questionnaires · reports · studies · submissions · sync
 *
 * See LEGACY.md for the inventory and the dated deletion decision, and
 * `common/architecture/legacy-registry.ts` for the machine-readable list that
 * `legacy-boundary.spec.ts` enforces.
 *
 * Do not re-add a legacy module here. The boundary test will fail the build.
 */
@Module({
  imports: [
    AppConfigModule,
    PrismaModule,
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 60 }]),
    AuthModule,
    OrganizationsModule,
    UsersModule,
    ProjectsModule,
    MediaModule,
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
