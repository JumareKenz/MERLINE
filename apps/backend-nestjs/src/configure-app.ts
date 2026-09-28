import { INestApplication, ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

/**
 * DEPLOYMENT — shared application configuration.
 *
 * Applied identically by the long-running server (`main.ts`) and the Vercel
 * serverless handler (`api/index.ts`).
 *
 * This exists because the platform already lost a week to exactly this class
 * of bug: JWT signing options were defined in one place and verification
 * options in another, they disagreed, and no token ever verified. Two copies
 * of the bootstrap would drift the same way — a pipe or filter present in one
 * runtime and missing in the other is a security difference, not a cosmetic
 * one.
 *
 * Anything that changes request handling belongs here, not in a caller.
 */
export function configureApp(app: INestApplication): INestApplication {
  app.setGlobalPrefix('api/v1');

  // The API sits behind nginx on the same machine. Without this every
  // request's address is 127.0.0.1, so each per-IP rate limit was in fact
  // shared by every user of the platform (60 requests a minute per route,
  // for everyone). Only a proxy on loopback is trusted to set
  // X-Forwarded-For, so a client cannot spoof its own address.
  const http = app.getHttpAdapter().getInstance() as {
    set?: (key: string, value: unknown) => void;
  };
  http.set?.('trust proxy', 'loopback');

  const corsOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',').map((origin) => origin.trim())
    : process.env.NODE_ENV === 'production'
      ? [process.env.APP_URL].filter(Boolean)
      : ['http://localhost:3000', 'http://localhost:5173'];

  app.enableCors({
    origin: corsOrigins as string[],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    credentials: true,
  });

  app.use(helmet());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      // Rejects unknown fields outright. Load-bearing for tenancy: it is what
      // turns a smuggled `organizationId` in a create payload into a 400.
      forbidNonWhitelisted: true,
    }),
  );

  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new TransformInterceptor());

  return app;
}
