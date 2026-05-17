import 'reflect-metadata';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

import { NestFactory } from '@nestjs/core';
import { SwaggerModule } from '@nestjs/swagger';
import { dump } from 'js-yaml';
import { cleanupOpenApiDoc } from 'nestjs-zod';

import { AppModule } from '../src/app.module';
import { swaggerConfig } from '../src/swagger';

const OUTPUT_PATH = resolve(__dirname, '../../../packages/api-client/openapi.yaml');

async function exportOpenApi(): Promise<void> {
  process.env.EXPORT_OPENAPI = '1';

  const app = await NestFactory.create(AppModule, {
    logger: false,
  });
  app.setGlobalPrefix('api/v1');

  const document = cleanupOpenApiDoc(SwaggerModule.createDocument(app, swaggerConfig));
  const yaml = dump(document, { lineWidth: 120, noRefs: true });

  await mkdir(dirname(OUTPUT_PATH), { recursive: true });
  await writeFile(OUTPUT_PATH, yaml, 'utf8');

  await app.close();

  // eslint-disable-next-line no-console
  console.log(`[openapi:export] wrote ${OUTPUT_PATH}`);
}

exportOpenApi().catch((err) => {
  console.error('[openapi:export] failed', err);
  process.exit(1);
});
