import type { IncomingMessage, ServerResponse } from 'node:http';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { buildPinoOptions } from './pino-options';

describe('buildPinoOptions', () => {
  const original = { ...process.env };
  beforeEach(() => {
    delete process.env.LOG_LEVEL;
    delete process.env.LOG_FORMAT;
    delete process.env.NODE_ENV;
  });
  afterEach(() => {
    process.env = { ...original };
  });

  it('defaults to debug+pretty in dev', () => {
    const opts = buildPinoOptions();
    expect(opts.level).toBe('debug');
    expect((opts as { transport?: unknown }).transport).toBeDefined();
  });

  it('defaults to info+json in production', () => {
    process.env.NODE_ENV = 'production';
    const opts = buildPinoOptions();
    expect(opts.level).toBe('info');
    expect((opts as { transport?: unknown }).transport).toBeUndefined();
  });

  it('honors explicit LOG_LEVEL', () => {
    process.env.LOG_LEVEL = 'warn';
    expect(buildPinoOptions().level).toBe('warn');
  });

  it('falls back to default when LOG_LEVEL is unknown', () => {
    process.env.LOG_LEVEL = 'galactic';
    const opts = buildPinoOptions();
    expect(['debug', 'info']).toContain(opts.level);
  });

  it('honors explicit LOG_FORMAT=json', () => {
    process.env.LOG_FORMAT = 'json';
    const opts = buildPinoOptions();
    expect((opts as { transport?: unknown }).transport).toBeUndefined();
  });

  it('honors explicit LOG_FORMAT=text', () => {
    process.env.NODE_ENV = 'production';
    process.env.LOG_FORMAT = 'text';
    const opts = buildPinoOptions();
    expect((opts as { transport?: unknown }).transport).toBeDefined();
  });

  it('generates a reqId, preferring x-request-id', () => {
    const opts = buildPinoOptions();
    type GenReqId = (req: IncomingMessage, res: ServerResponse) => string;
    const gen = opts.genReqId as GenReqId;
    expect(
      gen({ headers: { 'x-request-id': 'abc-123' } } as IncomingMessage, {} as ServerResponse),
    ).toBe('abc-123');
    const generated = gen({ headers: {} } as IncomingMessage, {} as ServerResponse);
    expect(generated).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('maps response status to log level', () => {
    const opts = buildPinoOptions();
    type CustomLogLevel = NonNullable<typeof opts.customLogLevel>;
    const level = opts.customLogLevel as CustomLogLevel;
    const req = {} as IncomingMessage;
    expect(level(req, { statusCode: 200 } as ServerResponse, null)).toBe('info');
    expect(level(req, { statusCode: 404 } as ServerResponse, null)).toBe('warn');
    expect(level(req, { statusCode: 500 } as ServerResponse, null)).toBe('error');
    expect(level(req, { statusCode: 200 } as ServerResponse, new Error('boom'))).toBe('error');
  });

  it('ignores health-check requests in autoLogging', () => {
    const opts = buildPinoOptions();
    const auto = opts.autoLogging as { ignore: (req: IncomingMessage) => boolean };
    expect(auto.ignore({ url: '/api/v1/health' } as IncomingMessage)).toBe(true);
    expect(auto.ignore({ url: '/api/v1/auth/login' } as IncomingMessage)).toBe(false);
  });
});
