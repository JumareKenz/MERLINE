import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';

/** DEPLOYMENT — liveness and readiness probes. See health.controller.ts. */
@Module({ controllers: [HealthController] })
export class HealthModule {}
