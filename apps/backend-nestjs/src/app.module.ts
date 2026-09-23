import { Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { TenantGuard } from './common/guards/tenant.guard';
import { PermissionGuard } from './common/guards/permission.guard';
import { AppConfigModule } from './config/config.module';
import { PrismaModule } from './database/prisma.module';
import { AuditLogInterceptor } from './common/interceptors/audit-log.interceptor';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { UsersModule } from './users/users.module';
import { ProjectsModule } from './projects/projects.module';
import { MediaModule } from './media/media.module';
import { StorageModule } from './storage/storage.module';
import { AiModule } from './ai/ai.module';
import { AuditLogModule } from './audit-log/audit-log.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ParticipantsModule } from './participants/participants.module';
import { ConsentsModule } from './consents/consents.module';
import { InterviewsModule } from './interviews/interviews.module';
import { TranscriptsModule } from './transcripts/transcripts.module';
import { FindingsModule } from './findings/findings.module';
import { FieldModule } from './field/field.module';
import { JobsModule } from './jobs/jobs.module';
import { TrashModule } from './trash/trash.module';
import { AnalysisModule } from './analysis/analysis.module';

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
    HealthModule,
    AuthModule,
    OrganizationsModule,
    UsersModule,
    ProjectsModule,
    StorageModule,
    MediaModule,
    AiModule,
    AuditLogModule,
    NotificationsModule,
    // PHASE 2 — qualitative interview product
    ParticipantsModule,
    ConsentsModule,
    InterviewsModule,
    TranscriptsModule,
    FindingsModule,
    FieldModule,
    JobsModule,
    TrashModule,
    AnalysisModule,
  ],
  providers: [
    // ─── PHASE 1: global guard chain ───
    // Order matters — these run top to bottom, before any controller guard.
    // Previously none of these were bound: ThrottlerModule was imported with
    // no guard, and JwtAuthGuard was applied per-controller while TenantGuard
    // and PermissionGuard were never applied at all.
    //
    // 1. Throttle before doing any work, so login and the AI endpoints are
    //    protected from credential stuffing and token-spend abuse.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    // 2. Authenticate. Honours @Public() for the auth routes.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    // 3. Establish the tenant and reject cross-tenant route params.
    { provide: APP_GUARD, useClass: TenantGuard },
    // 4. Authorize. Only enforces on routes carrying @Permissions().
    { provide: APP_GUARD, useClass: PermissionGuard },
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditLogInterceptor,
    },
  ],
})
export class AppModule {}
