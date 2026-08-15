import { describe, expect, it, vi } from 'vitest';

import { CreateWarehouseConnectionUseCase } from '../../../src/application/services/createWarehouseConnectionUseCase.js';

const SCOPE = {
  tenantId: 'tenant-1',
  projectId: 'project-1',
  environmentId: 'dev',
} as const;

describe('CreateWarehouseConnectionUseCase PostgreSQL credential refs', () => {
  it('rejects env aliases before probing or catalog persistence', async () => {
    const catalog = { createConnection: vi.fn() };
    const probe = { inspectConnection: vi.fn() };
    const useCase = new CreateWarehouseConnectionUseCase(catalog as never, probe as never);

    await expect(
      useCase.execute({
        scope: SCOPE,
        name: 'Legacy env connection',
        type: 'postgres',
        database: 'orders',
        credentialRef: 'env:DVT_WAREHOUSE_URL',
      })
    ).rejects.toThrow(/postgres:<alias>/i);
    expect(probe.inspectConnection).not.toHaveBeenCalled();
    expect(catalog.createConnection).not.toHaveBeenCalled();
  });
});
