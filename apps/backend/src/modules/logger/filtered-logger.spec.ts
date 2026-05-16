import { type Logger as PinoLogger } from 'nestjs-pino';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { FilteredLogger } from './filtered-logger';

function makeInnerMock(): PinoLogger {
  return {
    log: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    verbose: vi.fn(),
    fatal: vi.fn(),
  } as unknown as PinoLogger;
}

describe('FilteredLogger', () => {
  let inner: PinoLogger;
  let logger: FilteredLogger;

  beforeEach(() => {
    inner = makeInnerMock();
    logger = new FilteredLogger(inner);
  });

  const passthroughMethods = ['log', 'warn', 'debug', 'verbose', 'fatal'] as const;
  for (const method of passthroughMethods) {
    it(`${method}: forwards non-suppressed context`, () => {
      logger[method]('hello', 'SomeContext');
      expect((inner[method] as unknown as { mock: { calls: unknown[][] } }).mock.calls[0]).toEqual([
        'hello',
        'SomeContext',
      ]);
    });

    it(`${method}: drops LegacyRouteConverter messages`, () => {
      logger[method]('boom', 'LegacyRouteConverter');
      expect(inner[method]).not.toHaveBeenCalled();
    });
  }

  it('error: forwards stack + context for non-suppressed', () => {
    logger.error('oops', 'STACK', 'Ctx');
    expect((inner.error as unknown as { mock: { calls: unknown[][] } }).mock.calls[0]).toEqual([
      'oops',
      'STACK',
      'Ctx',
    ]);
  });

  it('error: drops LegacyRouteConverter', () => {
    logger.error('oops', 'STACK', 'LegacyRouteConverter');
    expect(inner.error).not.toHaveBeenCalled();
  });
});
