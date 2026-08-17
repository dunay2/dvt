import type { SourceDataSampleResponse } from '@dvt/contracts';
import { describe, expect, it, vi } from 'vitest';

import type {
  IWarehouseConnectionCatalog,
  IWarehouseSourceDataSampleProbe,
  WarehouseConnectionCatalogEntry,
} from '../../../src/application/ports/warehouseSourceImport.js';
import { WarehouseSourceDiscoveryFailedError } from '../../../src/application/ports/warehouseSourceImport.js';
import { PreviewWarehouseSourceObjectRowsUseCase } from '../../../src/application/services/previewWarehouseSourceObjectRowsUseCase.js';

const scope = {
  tenantId: 'tenant-sample',
  projectId: 'project-sample',
  environmentId: 'dev',
};
const connection: WarehouseConnectionCatalogEntry = {
  id: 'postgresql-local',
  name: 'PostgreSQL local',
  type: 'postgres',
  database: 'dvt',
  credentialRef: 'postgres:local-postgres-proof',
  sourceObjects: [],
};

function catalog(entry: WarehouseConnectionCatalogEntry = connection): IWarehouseConnectionCatalog {
  return {
    listConnections: vi.fn(async () => []),
    listSourceObjects: vi.fn(async () => []),
    getConnection: vi.fn(async () => entry),
    createConnection: vi.fn(async () => entry),
    renameConnection: vi.fn(async () => entry),
  };
}

describe('PreviewWarehouseSourceObjectRowsUseCase', () => {
  it('projects a bounded sample without exposing the credential reference', async () => {
    const probe: IWarehouseSourceDataSampleProbe = {
      previewSourceObjectRows: vi.fn(async () => ({
        columns: [
          { name: 'order_id', type: 'integer', nullable: true },
          { name: 'customer', type: 'text', nullable: true },
        ],
        rows: [{ values: ['1', 'Ada'] }],
        truncated: false,
        sampledAt: '2026-08-17T10:00:00.000Z',
      })),
    };
    const useCase = new PreviewWarehouseSourceObjectRowsUseCase(catalog(), probe);

    const result: SourceDataSampleResponse = await useCase.execute({
      scope,
      connectionId: connection.id,
      objectId: 'relation/dvt/public/orders',
      limit: 20,
    });

    expect(probe.previewSourceObjectRows).toHaveBeenCalledWith({
      type: 'postgres',
      database: 'dvt',
      credentialRef: 'postgres:local-postgres-proof',
      objectId: 'relation/dvt/public/orders',
      limit: 20,
    });
    expect(result).toEqual({
      contractVersion: 1,
      connectionId: connection.id,
      objectId: 'relation/dvt/public/orders',
      columns: [
        { name: 'order_id', type: 'integer', nullable: true },
        { name: 'customer', type: 'text', nullable: true },
      ],
      rows: [{ values: ['1', 'Ada'] }],
      limit: 20,
      truncated: false,
      sampledAt: '2026-08-17T10:00:00.000Z',
    });
    expect(result).not.toHaveProperty('credentialRef');
  });

  it('fails closed before probing when the governed credential reference is missing', async () => {
    const { credentialRef: _credentialRef, ...connectionWithoutCredential } = connection;
    const probe: IWarehouseSourceDataSampleProbe = {
      previewSourceObjectRows: vi.fn(),
    };
    const useCase = new PreviewWarehouseSourceObjectRowsUseCase(
      catalog(connectionWithoutCredential),
      probe
    );

    await expect(
      useCase.execute({
        scope,
        connectionId: connection.id,
        objectId: 'relation/dvt/public/orders',
        limit: 20,
      })
    ).rejects.toBeInstanceOf(WarehouseSourceDiscoveryFailedError);
    expect(probe.previewSourceObjectRows).not.toHaveBeenCalled();
  });
});
