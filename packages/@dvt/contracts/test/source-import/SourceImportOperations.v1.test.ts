import { describe, expect, it } from 'vitest';

import {
  CreateWarehouseConnectionRequestSchema,
  ImportSourceObjectsRequestSchema,
  ImportSourceObjectsResultSchema,
  TestWarehouseConnectionResultSchema,
  WarehouseConnectionSchema,
} from '../../src/contracts/source-import/SourceImportOperations.v1.js';

describe('SourceImportOperations v1', () => {
  it('validates the connection command and query DTOs', () => {
    expect(
      CreateWarehouseConnectionRequestSchema.parse({
        name: 'Production warehouse',
        type: 'postgres',
        database: 'analytics',
        credentialRef: 'env:WAREHOUSE_URL',
      })
    ).toMatchObject({ type: 'postgres', database: 'analytics' });
    expect(
      WarehouseConnectionSchema.parse({
        id: 'warehouse-prod',
        name: 'Production warehouse',
        type: 'postgres',
        database: 'analytics',
      })
    ).toMatchObject({ id: 'warehouse-prod' });
    expect(
      TestWarehouseConnectionResultSchema.parse({
        connectionId: 'warehouse-prod',
        status: 'passed',
        checkedAt: '2026-07-11T12:00:00.000Z',
        objectCount: 12,
      })
    ).toMatchObject({ status: 'passed', objectCount: 12 });
  });

  it('validates a unique object-id-only import command', () => {
    const request = {
      connectionId: 'warehouse-prod',
      objects: [{ objectId: 'relation/analytics/public/orders' }],
      groupingStrategy: 'schema',
      includeColumns: true,
      addTests: false,
      addFreshness: false,
    };

    expect(ImportSourceObjectsRequestSchema.parse(request)).toEqual(request);
    expect(() =>
      ImportSourceObjectsRequestSchema.parse({
        ...request,
        objects: [request.objects[0], request.objects[0]],
      })
    ).toThrow();
  });

  it('requires a complete import receipt for draft reconciliation', () => {
    const result = {
      success: true,
      draftRevision: 'draft-revision-2',
      sourcesCreated: 1,
      objectsImported: 1,
      yamlFiles: ['models/sources/public.yml'],
      importedNodeIds: ['source-orders'],
      grouping: 'schema',
      options: {
        includeColumns: true,
        addTests: false,
        addFreshness: false,
      },
    };

    expect(ImportSourceObjectsResultSchema.parse(result)).toEqual(result);
    expect(() =>
      ImportSourceObjectsResultSchema.parse({ ...result, draftRevision: undefined })
    ).toThrow();
    expect(() =>
      ImportSourceObjectsResultSchema.parse({ ...result, importedNodeIds: undefined })
    ).toThrow();
  });
});
