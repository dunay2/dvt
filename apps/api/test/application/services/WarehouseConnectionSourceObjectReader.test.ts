import { buildRelationalSourceObjectId, type SourceObject } from '@dvt/contracts';
import { describe, expect, it, vi } from 'vitest';

import type {
  IWarehouseConnectionCatalog,
  IWarehouseConnectionProbe,
  WarehouseConnectionCatalogEntry,
} from '../../../src/application/ports/warehouseSourceImport.js';
import { WarehouseSourceDiscoveryFailedError } from '../../../src/application/ports/warehouseSourceImport.js';
import { WarehouseConnectionSourceObjectReader } from '../../../src/application/services/WarehouseConnectionSourceObjectReader.js';

const scope = {
  tenantId: 'tenant-source-reader',
  projectId: 'project-source-reader',
  environmentId: 'env-source-reader',
};

function sourceObject(rowCount: number, observedAt: string): SourceObject {
  const locator = {
    kind: 'relation' as const,
    catalog: 'analytics',
    schema: 'public',
    name: 'orders',
    relationType: 'table' as const,
  };
  return {
    objectId: buildRelationalSourceObjectId(locator),
    displayName: 'orders',
    locator,
    metricEvidence: {
      observedAt,
      observationScope: { kind: 'snapshot' },
      rowCount: {
        value: rowCount,
        provenance: 'estimated',
        method: 'provider-statistics',
        confidence: 'medium',
      },
      byteSize: {
        value: rowCount * 64,
        provenance: 'estimated',
        method: 'schema-width',
        confidence: 'low',
        basis: 'provider-row-storage',
      },
    },
  };
}

const storedObject = sourceObject(10, '2026-07-10T10:00:00.000Z');
const liveObject = sourceObject(24, '2026-07-11T10:00:00.000Z');
const connection: WarehouseConnectionCatalogEntry = {
  id: 'warehouse-prod',
  name: 'Production warehouse',
  type: 'postgres',
  database: 'analytics',
  credentialRef: 'postgres:warehouse',
  sourceObjects: [storedObject],
};

function catalog(): IWarehouseConnectionCatalog {
  return {
    listConnections: vi.fn(async () => []),
    listSourceObjects: vi.fn(async () => connection.sourceObjects),
    getConnection: vi.fn(async () => connection),
    createConnection: vi.fn(async () => connection),
    renameConnection: vi.fn(async () => connection),
  };
}

describe('WarehouseConnectionSourceObjectReader', () => {
  it('returns freshly inspected source objects instead of the stored creation snapshot', async () => {
    const probe: IWarehouseConnectionProbe = {
      inspectConnection: vi.fn(
        async (): Promise<Awaited<ReturnType<IWarehouseConnectionProbe['inspectConnection']>>> => ({
          status: 'passed',
          checkedAt: liveObject.metricEvidence.observedAt,
          databaseUser: 'warehouse_reader',
          sourceObjects: [liveObject],
        })
      ),
      testConnection: vi.fn(),
    };
    const reader = new WarehouseConnectionSourceObjectReader(catalog(), probe);

    const result = await reader.read(scope, connection.id);

    expect(result.connection).toEqual(connection);
    expect(result.databaseUser).toBe('warehouse_reader');
    expect(result.sourceObjects).toEqual([liveObject]);
    expect(probe.inspectConnection).toHaveBeenCalledWith({
      type: 'postgres',
      database: 'analytics',
      credentialRef: 'postgres:warehouse',
    });
  });

  it('fails explicitly when live discovery cannot produce an authoritative catalog', async () => {
    const probe: IWarehouseConnectionProbe = {
      inspectConnection: vi.fn(
        async (): Promise<Awaited<ReturnType<IWarehouseConnectionProbe['inspectConnection']>>> => ({
          status: 'failed',
          reason: 'connection_failed',
          message: 'Warehouse connection test failed.',
          checkedAt: '2026-07-11T10:00:00.000Z',
        })
      ),
      testConnection: vi.fn(),
    };
    const reader = new WarehouseConnectionSourceObjectReader(catalog(), probe);

    await expect(reader.read(scope, connection.id)).rejects.toBeInstanceOf(
      WarehouseSourceDiscoveryFailedError
    );
  });
});
