import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule } from '@nestjs/swagger';
import { json, raw } from 'express';
import { Logger } from 'nestjs-pino';
import { cleanupOpenApiDoc, ZodValidationPipe } from 'nestjs-zod';

import { AppModule } from './app.module';
import { FilteredLogger } from './modules/logger/filtered-logger';
import { swaggerConfig } from './swagger';

async function bootstrap(): Promise<void> {
  // Disable built-in body parser so we can register per-route parsers.
  // This lets the Stripe webhook route receive the raw Buffer that its
  // signature verification requires, while all other routes get normal JSON.
  const app = await NestFactory.create(AppModule, { bufferLogs: true, bodyParser: false });

  // Stripe webhook — must receive raw body for HMAC verification.
  app.use('/api/v1/payments/webhooks/stripe', raw({ type: '*/*' }));

  // All other routes get standard JSON parsing.
  app.use(json());

  // Swap default Nest logger for pino (via FilteredLogger which suppresses
  // known-noisy internal contexts like LegacyRouteConverter).
  app.useLogger(new FilteredLogger(app.get(Logger)));

  // Global validation: every @Body/@Query/@Param DTO that extends createZodDto
  // is automatically parsed/validated; failures throw 400 with Zod issue tree.
  app.useGlobalPipes(new ZodValidationPipe());

  app.setGlobalPrefix('api/v1');

  app.enableCors({
    origin: ['http://localhost:5173', 'http://localhost:5174'],
    credentials: true,
  });

  if (process.env.NODE_ENV !== 'production') {
    const rawDoc = SwaggerModule.createDocument(app, swaggerConfig);
    // cleanupOpenApiDoc rewrites Zod-generated component schemas into a form
    // @nestjs/swagger consumers (and downstream Orval) handle correctly.
    SwaggerModule.setup('docs', app, cleanupOpenApiDoc(rawDoc));
  }

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);

  app.get(Logger).log(`[backend] listening on http://localhost:${port}`);
}

bootstrap().catch((err) => {
  // Pre-container failure — pino isn't available yet, fall back to console.
  console.error('[backend] failed to bootstrap', err);
  process.exit(1);
});
