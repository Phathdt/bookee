import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule } from '@nestjs/swagger';
import { Logger } from 'nestjs-pino';

import { AppModule } from './app.module';
import { FilteredLogger } from './modules/logger/filtered-logger';
import { swaggerConfig } from './swagger';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  // Swap default Nest logger for pino (via FilteredLogger which suppresses
  // known-noisy internal contexts like LegacyRouteConverter).
  app.useLogger(new FilteredLogger(app.get(Logger)));

  app.setGlobalPrefix('api/v1');

  app.enableCors({
    origin: ['http://localhost:5173', 'http://localhost:5174'],
    credentials: true,
  });

  if (process.env.NODE_ENV !== 'production') {
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('docs', app, document);
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
