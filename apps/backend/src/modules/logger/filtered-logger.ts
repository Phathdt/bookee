import { Injectable, type LoggerService } from '@nestjs/common';
import { type Logger as PinoLogger } from 'nestjs-pino';

/**
 * Decorator over nestjs-pino's Logger that suppresses known-noisy internal
 * Nest warnings while forwarding everything else unchanged.
 *
 * Currently filters:
 * - `LegacyRouteConverter` — Nest 11 emits a warning per registered route
 *   because path-to-regexp v8 deprecated bare `*` wildcards. Conversion is
 *   automatic and harmless, but logs twice on every boot. No upstream flag
 *   exists to silence it (as of @nestjs/core 11.1.x).
 */
@Injectable()
export class FilteredLogger implements LoggerService {
  private readonly SUPPRESSED_CONTEXTS = new Set(['LegacyRouteConverter']);

  constructor(private readonly inner: PinoLogger) {}

  private isSuppressed(context: unknown): boolean {
    return typeof context === 'string' && this.SUPPRESSED_CONTEXTS.has(context);
  }

  log(message: unknown, context?: string): void {
    if (this.isSuppressed(context)) return;
    this.inner.log(message, context);
  }

  warn(message: unknown, context?: string): void {
    if (this.isSuppressed(context)) return;
    this.inner.warn(message, context);
  }

  error(message: unknown, stack?: string, context?: string): void {
    if (this.isSuppressed(context)) return;
    this.inner.error(message, stack, context);
  }

  debug(message: unknown, context?: string): void {
    if (this.isSuppressed(context)) return;
    this.inner.debug(message, context);
  }

  verbose(message: unknown, context?: string): void {
    if (this.isSuppressed(context)) return;
    this.inner.verbose(message, context);
  }

  fatal(message: unknown, context?: string): void {
    if (this.isSuppressed(context)) return;
    this.inner.fatal(message, context);
  }
}
