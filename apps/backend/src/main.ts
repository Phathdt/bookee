import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: ['http://localhost:5173', 'http://localhost:5174'],
    credentials: true,
  });

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);

  // eslint-disable-next-line no-console
  console.log(`[backend] listening on http://localhost:${port}`);
}

bootstrap().catch((err) => {
  console.error('[backend] failed to bootstrap', err);
  process.exit(1);
});
