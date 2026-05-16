import { Module } from '@nestjs/common';
import { LoggerModule as PinoLoggerModule } from 'nestjs-pino';

import { buildPinoOptions } from './pino-options';

/**
 * Centralized logger module wrapping nestjs-pino.
 *
 * Env-driven configuration:
 *   LOG_LEVEL   trace|debug|info|warn|error|fatal (default: info; debug in dev)
 *   LOG_FORMAT  text|json                         (default: text in dev, json in prod)
 *
 * Production defaults to structured JSON for log shippers (Datadog, Loki, etc.).
 * Dev defaults to pino-pretty colorized output.
 *
 * Request-context logging is enabled by default; every HTTP request gets a
 * `reqId` correlation field automatically attached to log lines.
 */
@Module({
  imports: [
    PinoLoggerModule.forRootAsync({
      useFactory: () => ({
        pinoHttp: buildPinoOptions(),
      }),
    }),
  ],
})
export class LoggerModule {}
