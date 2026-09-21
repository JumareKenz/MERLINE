import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configureApp } from './configure-app';

/**
 * Long-running server entry (Docker, local dev, any Node host).
 *
 * The serverless entry is `api/index.ts`. Both call `configureApp` so the two
 * runtimes cannot drift.
 */
async function bootstrap() {
  const app = configureApp(await NestFactory.create(AppModule));

  const port = process.env.PORT ?? 4000;
  await app.listen(port);
  console.log(`Application running on port ${port}`);
}

void bootstrap();
