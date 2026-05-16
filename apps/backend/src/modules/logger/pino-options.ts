import { randomUUID } from 'node:crypto';
import type { IncomingMessage } from 'node:http';

import type { Options } from 'pino-http';

type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';
type LogFormat = 'text' | 'json';

const VALID_LEVELS: readonly LogLevel[] = ['trace', 'debug', 'info', 'warn', 'error', 'fatal'];

function resolveLevel(): LogLevel {
  const raw = process.env.LOG_LEVEL?.toLowerCase() as LogLevel | undefined;
  if (raw && VALID_LEVELS.includes(raw)) {
    return raw;
  }
  return process.env.NODE_ENV === 'production' ? 'info' : 'debug';
}

function resolveFormat(): LogFormat {
  const raw = process.env.LOG_FORMAT?.toLowerCase();
  if (raw === 'text' || raw === 'json') {
    return raw;
  }
  return process.env.NODE_ENV === 'production' ? 'json' : 'text';
}

/**
 * Build the pino-http config object consumed by nestjs-pino.
 *
 * `text` format pipes through pino-pretty for readable dev logs; `json`
 * format emits newline-delimited JSON for prod log aggregators. Health
 * checks are silenced to avoid noise (configurable later if needed).
 */
export function buildPinoOptions(): Options {
  const level = resolveLevel();
  const format = resolveFormat();

  const base: Options = {
    level,
    genReqId: (req: IncomingMessage) =>
      (req.headers['x-request-id'] as string | undefined) ?? randomUUID(),
    customLogLevel: (_req, res, err) => {
      if (err != null || res.statusCode >= 500) return 'error';
      if (res.statusCode >= 400) return 'warn';
      return 'info';
    },
    autoLogging: {
      ignore: (req: IncomingMessage) => req.url === '/api/v1/health',
    },
    redact: {
      paths: ['req.headers.authorization', 'req.headers.cookie', '*.password', '*.idCard'],
      remove: true,
    },
  };

  if (format === 'text') {
    return {
      ...base,
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          singleLine: false,
          translateTime: 'SYS:HH:MM:ss.l',
          ignore: 'pid,hostname,context',
          messageFormat: '{context} {msg}',
        },
      },
    };
  }

  return base;
}
