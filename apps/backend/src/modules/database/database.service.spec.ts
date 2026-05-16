import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DatabaseService } from './database.service';

describe('DatabaseService lifecycle', () => {
  let svc: DatabaseService;
  const originalEnv = { ...process.env };

  beforeEach(() => {
    svc = new DatabaseService('postgresql://bookee:bookee@localhost:5432/bookee?schema=public');
    delete process.env.EXPORT_OPENAPI;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  it('skips $connect when EXPORT_OPENAPI=1', async () => {
    process.env.EXPORT_OPENAPI = '1';
    const spy = vi.spyOn(svc, '$connect').mockResolvedValue(undefined);
    await svc.onModuleInit();
    expect(spy).not.toHaveBeenCalled();
  });

  it('calls $connect on normal boot', async () => {
    const spy = vi.spyOn(svc, '$connect').mockResolvedValue(undefined);
    await svc.onModuleInit();
    expect(spy).toHaveBeenCalledOnce();
  });

  it('disconnects on shutdown', async () => {
    const spy = vi.spyOn(svc, '$disconnect').mockResolvedValue(undefined);
    await svc.onModuleDestroy();
    expect(spy).toHaveBeenCalledOnce();
  });
});
