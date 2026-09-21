import { Controller, Get } from '@nestjs/common';
import { Public } from '../common/decorators/public.decorator';
import { PrismaService } from '../database/prisma.service';

/**
 * DEPLOYMENT — health and readiness.
 *
 * `docker-compose.yml`, both CI workflows and `deploy.yml` all probed
 * `/api/v1/health`, which did not exist. The Compose API container was
 * therefore permanently unhealthy and the deploy smoke tests could never pass.
 *
 * Two endpoints, deliberately different:
 *
 *   /health  — liveness. Is the process up? No dependencies touched, so a
 *              database blip cannot cause a restart loop.
 *   /ready   — readiness. Can it actually serve traffic? Touches the database.
 *
 * Both are `@Public()`; a probe has no credentials. Neither reveals version,
 * configuration or dependency detail — an unauthenticated endpoint should not
 * be a reconnaissance surface.
 */
@Controller()
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('health')
  @Public()
  health() {
    return { status: 'ok' };
  }

  @Get('ready')
  @Public()
  async ready() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ready', database: 'up' };
    } catch {
      // Deliberately not returning the driver error: this endpoint is public.
      return { status: 'degraded', database: 'down' };
    }
  }
}
