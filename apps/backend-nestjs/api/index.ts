import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import express, { type Express, type Request, type Response } from 'express';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/configure-app';

/**
 * DEPLOYMENT — Vercel serverless entry point.
 *
 * `main.ts` calls `app.listen()`, which is a long-running server and produces
 * nothing routable on Vercel. This wraps the same Nest application in an
 * Express instance that Vercel invokes per request.
 *
 * The Nest app is created once per warm container and reused. Creating it per
 * request would open a new Prisma connection pool every time and exhaust the
 * database within a handful of concurrent invocations.
 *
 * Configuration comes from `configureApp`, shared with `main.ts`.
 *
 * KNOWN CONSTRAINT — request body size
 * -----------------------------------
 * Vercel Functions cap the request body at 4.5 MB. Interview audio is far
 * larger than that, so audio must NOT be uploaded through this handler.
 * Phase 2 uploads directly to object storage with a presigned URL, which
 * bypasses the function entirely and is the correct architecture regardless
 * of host. `MAX_UPLOAD_BYTES` should be set accordingly in Vercel — see
 * DEPLOYMENT.md.
 */

let cachedServer: Express | null = null;

async function createServer(): Promise<Express> {
  if (cachedServer) return cachedServer;

  const expressApp = express();

  const app = configureApp(
    await NestFactory.create(AppModule, new ExpressAdapter(expressApp), {
      // Vercel captures stdout; keep the noisy startup banner out of logs.
      logger: ['error', 'warn'],
    }),
  );

  await app.init();

  cachedServer = expressApp;
  return expressApp;
}

export default async function handler(req: Request, res: Response) {
  const server = await createServer();
  return server(req, res);
}
