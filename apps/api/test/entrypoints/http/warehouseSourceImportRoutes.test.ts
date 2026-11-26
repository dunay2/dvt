import { type WorkspaceGraphAuthoringNode } from '@dvt/contracts';
import { describe, expect, it, vi } from 'vitest';

import {
  expectSourceImportRejectedWithoutMutation,
  expectSourceImportRejection,
  expectWarehouseAuthorization,
  placeImportedSourceInstance,
  buildDisambiguatedCatalogEntries,
  expectSchemaGroupedYamlContent,
  injectWarehouseRequest,
  buildSourceImportPayload,
  DVT_SOURCE_NODE_ID_PATTERN,
  ROUTE_SCOPE,
  measuredMetrics,
  relationSourceObject,
  defaultOrdersSourceObject,
  buildApp,
} from './warehouseSourceImportRoutes.test-support.js';

import './warehouseSourceImportRoutes.test-cases.js';

describe('warehouseSourceImportRoutes', () => {
  it('imports selected source objects into the authoritative workspace graph draft', async () => {
    const { app, authorize, workspaceFiles, draftStore } = buildApp();

    const response = await injectWarehouseRequest(app, {
      method: 'POST',
      path: `/workspace/sources/import`,
      payload: buildSourceImportPayload({
        connectionId: 'warehouse-prod',
        objects: [{ objectId: defaultOrdersSourceObject.objectId }],
        groupingStrategy: 'schema',
        includeColumns: true,
        addTests: false,
        addFreshness: false,
      }),
    });

    expect(response.statusCode).toBe(200);
    const importedNodeIds = vi
      .mocked(draftStore.save)
      .mock.calls[0]![0].draft.nodes.map((node: WorkspaceGraphAuthoringNode) => node.id);
    expect(importedNodeIds).toHaveLength(1);
    expect(new Set(importedNodeIds).size).toBe(1);
    for (const nodeId of importedNodeIds) expect(nodeId).toMatch(DVT_SOURCE_NODE_ID_PATTERN);
    expect(response.json()).toMatchObject({
      success: true,
      schemaVersion: 'source-import-result.v2',
      sourcesCreated: 1,
      objectsImported: 1,
      yamlFiles: ['models/sources/src_erp.yml'],
      outcome: {
        kind: 'graph-draft',
        draftRevision: 'rev-2',
        importedNodeIds,
      },
      grouping: 'schema',
    });
    expectWarehouseAuthorization(authorize, {
      kind: 'command',
      name: 'workspace:source-import:import',
    });
    expect(workspaceFiles.saveFileContent).toHaveBeenCalledWith(
      ROUTE_SCOPE,
      expect.objectContaining({
        path: 'models/sources/src_erp.yml',
        content: [
          'version: 2',
          '',
          'sources:',
          '  - name: warehouse_prod_analytics_erp',
          '    database: analytics',
          '    schema: erp',
          '    tables:',
          '      - name: orders',
          '        columns:',
          '          - name: id',
          '            data_type: number',
          '',
        ].join('\n'),
        expectedRevision: { kind: 'absent' },
      })
    );
  });

  it('hydrates identity-only import requests from catalog-owned metadata', async () => {
    const { app, draftStore } = buildApp();

    const response = await injectWarehouseRequest(app, {
      method: 'POST',
      path: `/workspace/sources/import`,
      payload: buildSourceImportPayload({
        connectionId: 'warehouse-prod',
        objects: [{ objectId: defaultOrdersSourceObject.objectId }],
        groupingStrategy: 'schema',
        includeColumns: true,
        addTests: false,
        addFreshness: false,
      }),
    });

    expect(response.statusCode).toBe(200);
    expect(draftStore.save).toHaveBeenCalledWith(
      expect.objectContaining({
        draft: expect.objectContaining({
          nodes: [
            expect.objectContaining({
              metadata: expect.objectContaining({
                sourceMetricEvidence: measuredMetrics(42, 4096000),
                columns: [{ name: 'id', type: 'number', nullable: false }],
              }),
            }),
          ],
        }),
      })
    );
  });

  it.each([false, true])(
    'imports after placement and translates an invalid reference into a conflict: %s',
    async (invalidReference) => {
      const customers = relationSourceObject({ name: 'customers' });
      const { app, draftStore, workspaceFiles } = buildApp({
        catalogEntries: [
          {
            id: 'warehouse-prod',
            name: 'Production warehouse',
            type: 'postgres',
            database: 'analytics',
            sourceObjects: [defaultOrdersSourceObject, customers],
          },
        ],
      });
      const payload = buildSourceImportPayload({
        connectionId: 'warehouse-prod',
        objects: [{ objectId: defaultOrdersSourceObject.objectId }],
        groupingStrategy: 'schema',
        includeColumns: true,
        addTests: false,
        addFreshness: false,
      });
      const first = await injectWarehouseRequest(app, {
        method: 'POST',
        path: `/workspace/sources/import`,
        payload,
      });
      expect(first.statusCode).toBe(200);
      const { instance, nodeIds, nodePositions } = await placeImportedSourceInstance({
        draftStore,
        workspaceFiles,
        invalidReference,
      });

      const response = await injectWarehouseRequest(app, {
        method: 'POST',
        path: `/workspace/sources/import`,
        payload: {
          ...payload,
          idempotencyKey: 'source-import-after-placement',
          objects: [{ objectId: customers.objectId }],
        },
      });
      if (invalidReference) {
        expect(response.statusCode).toBe(409);
        expect(response.json()).toEqual({
          error: { type: 'conflict', reason: 'workspace_source_import_draft_conflict' },
        });
        expect(draftStore.save).toHaveBeenCalledTimes(1);
        expect(workspaceFiles.saveFileContent).toHaveBeenCalledTimes(1);
        return;
      }
      expect(response.statusCode).toBe(200);
      const saved = vi.mocked(draftStore.save).mock.calls[1]![0];
      expect(saved.expectedRevision).toBe('placed-revision');
      expect(saved.draft.nodeIds).toEqual(nodeIds);
      expect(saved.draft.nodePositions).toEqual(nodePositions);
      expect(
        saved.draft.nodes.find((node: WorkspaceGraphAuthoringNode) => node.id === instance.id)
      ).toEqual(instance);
      expect(saved.draft.nodes).toHaveLength(3);
      expect(response.json().outcome.importedNodeIds).toEqual([saved.draft.nodes[2]!.id]);
      const content = vi.mocked(workspaceFiles.saveFileContent).mock.calls[1]![1].content;
      expect(content).toContain('name: orders');
      expect(content).toContain('name: customers');
    }
  );

  it('rejects client-supplied source metrics before import', async () => {
    const { app, draftStore, workspaceFiles } = buildApp();
    const impossibleMetrics = [
      { rowCount: -1 },
      { byteSize: -1 },
      { estimatedByteSize: -1 },
    ] as const;

    for (const metrics of impossibleMetrics) {
      const response = await injectWarehouseRequest(app, {
        method: 'POST',
        path: `/workspace/sources/import`,
        payload: buildSourceImportPayload({
          connectionId: 'warehouse-prod',
          objects: [{ objectId: defaultOrdersSourceObject.objectId, ...metrics }],
          groupingStrategy: 'schema',
          includeColumns: true,
          addTests: false,
          addFreshness: false,
        }),
      });

      expect(response.statusCode).toBe(400);
      expect(response.json()).toEqual({
        error: { type: 'bad_request', reason: 'invalid_body', target: 'body' },
      });
    }
    expect(workspaceFiles.saveFileContent).not.toHaveBeenCalled();
    expect(draftStore.save).not.toHaveBeenCalled();
  });

  it('persists opaque source identity independently from the selected physical connection', async () => {
    const { app, draftStore, workspaceFiles } = buildApp({
      catalogEntries: [
        {
          id: 'warehouse-prod',
          name: 'Production warehouse',
          type: 'postgres',
          database: 'analytics',
          sourceObjects: [relationSourceObject()],
        },
        {
          id: 'warehouse-sandbox',
          name: 'Sandbox warehouse',
          type: 'postgres',
          database: 'analytics',
          sourceObjects: [relationSourceObject()],
        },
      ],
    });

    const response = await injectWarehouseRequest(app, {
      method: 'POST',
      path: `/workspace/sources/import`,
      payload: buildSourceImportPayload({
        connectionId: 'warehouse-sandbox',
        objects: [{ objectId: defaultOrdersSourceObject.objectId }],
        groupingStrategy: 'schema',
        includeColumns: false,
        addTests: false,
        addFreshness: false,
      }),
    });

    expect(response.statusCode).toBe(200);
    const importedNodeIds = vi
      .mocked(draftStore.save)
      .mock.calls[0]![0].draft.nodes.map((node: WorkspaceGraphAuthoringNode) => node.id);
    expect(importedNodeIds).toHaveLength(1);
    expect(new Set(importedNodeIds).size).toBe(1);
    for (const nodeId of importedNodeIds) expect(nodeId).toMatch(DVT_SOURCE_NODE_ID_PATTERN);
    expect(response.json()).toMatchObject({
      sourcesCreated: 1,
      outcome: {
        kind: 'graph-draft',
        importedNodeIds,
      },
    });
    expect(workspaceFiles.saveFileContent).toHaveBeenCalledWith(
      ROUTE_SCOPE,
      expect.objectContaining({
        path: 'models/sources/src_erp.yml',
        content: expect.stringContaining('  - name: warehouse_sandbox_analytics_erp'),
        expectedRevision: { kind: 'absent' },
      })
    );
    expect(draftStore.save).toHaveBeenCalledWith(
      expect.objectContaining({
        draft: expect.objectContaining({
          nodes: expect.arrayContaining([
            expect.objectContaining({
              id: importedNodeIds[0],
              metadata: expect.objectContaining({
                sourceName: 'warehouse_sandbox_analytics_erp',
              }),
            }),
          ]),
        }),
      })
    );
  });

  it('imports same schema and table name from different databases as distinct source nodes', async () => {
    const { app, draftStore } = buildApp({
      catalogEntries: [
        {
          id: 'warehouse-prod',
          name: 'Production warehouse',
          type: 'postgres',
          database: 'analytics',
          sourceObjects: [
            relationSourceObject({
              catalog: 'analytics',
              columns: [{ name: 'id', type: 'number', nullable: false }],
            }),
            relationSourceObject({
              catalog: 'finance',
              rowCount: 24,
              byteSize: 2048000,
              columns: [{ name: 'id', type: 'number', nullable: false }],
            }),
          ],
        },
      ],
    });

    const response = await injectWarehouseRequest(app, {
      method: 'POST',
      path: `/workspace/sources/import`,
      payload: buildSourceImportPayload({
        connectionId: 'warehouse-prod',
        objects: [
          { objectId: relationSourceObject({ catalog: 'analytics' }).objectId },
          { objectId: relationSourceObject({ catalog: 'finance' }).objectId },
        ],
        groupingStrategy: 'database',
        includeColumns: true,
        addTests: false,
        addFreshness: false,
      }),
    });

    expect(response.statusCode).toBe(200);
    const importedNodeIds = vi
      .mocked(draftStore.save)
      .mock.calls[0]![0].draft.nodes.map((node: WorkspaceGraphAuthoringNode) => node.id);
    expect(importedNodeIds).toHaveLength(2);
    expect(new Set(importedNodeIds).size).toBe(2);
    for (const nodeId of importedNodeIds) expect(nodeId).toMatch(DVT_SOURCE_NODE_ID_PATTERN);
    expect(response.json()).toMatchObject({
      success: true,
      sourcesCreated: 2,
      objectsImported: 2,
      yamlFiles: ['models/sources/src_analytics.yml', 'models/sources/src_finance.yml'],
      outcome: {
        kind: 'graph-draft',
        importedNodeIds,
      },
      grouping: 'database',
    });
  });

  it('rejects unsupported custom grouping instead of importing with schema semantics', async () => {
    await expectSourceImportRejectedWithoutMutation({
      payload: buildSourceImportPayload({
        connectionId: 'warehouse-prod',
        objects: [{ objectId: defaultOrdersSourceObject.objectId }],
        groupingStrategy: 'custom',
        includeColumns: true,
        addTests: false,
        addFreshness: false,
      }),
      responseBody: {
        error: { type: 'bad_request', reason: 'invalid_body', target: 'body' },
      },
    });
  });

  it('keeps schema-grouped YAML sources and imported node metadata distinct when database names disambiguate nodes', async () => {
    const { app, draftStore, workspaceFiles } = buildApp({
      catalogEntries: buildDisambiguatedCatalogEntries(),
    });

    const response = await injectWarehouseRequest(app, {
      method: 'POST',
      path: `/workspace/sources/import`,
      payload: buildSourceImportPayload({
        connectionId: 'warehouse-prod',
        objects: [
          { objectId: relationSourceObject({ catalog: 'analytics' }).objectId },
          { objectId: relationSourceObject({ catalog: 'finance' }).objectId },
        ],
        groupingStrategy: 'schema',
        includeColumns: true,
        addTests: false,
        addFreshness: false,
      }),
    });

    expect(response.statusCode).toBe(200);
    const importedNodeIds = vi
      .mocked(draftStore.save)
      .mock.calls[0]![0].draft.nodes.map((node: WorkspaceGraphAuthoringNode) => node.id);
    expect(importedNodeIds).toHaveLength(2);
    expect(new Set(importedNodeIds).size).toBe(2);
    for (const nodeId of importedNodeIds) expect(nodeId).toMatch(DVT_SOURCE_NODE_ID_PATTERN);
    expect(response.json()).toMatchObject({
      success: true,
      sourcesCreated: 1,
      objectsImported: 2,
      yamlFiles: ['models/sources/src_erp.yml'],
      outcome: {
        kind: 'graph-draft',
        importedNodeIds,
      },
      grouping: 'schema',
    });
    expectSchemaGroupedYamlContent(workspaceFiles);
    expect(draftStore.save).toHaveBeenCalledWith(
      expect.objectContaining({
        draft: expect.objectContaining({
          nodes: expect.arrayContaining([
            expect.objectContaining({
              id: importedNodeIds[0],
              metadata: expect.objectContaining({
                sourceName: 'warehouse_prod_analytics_erp',
                tableName: 'orders',
              }),
            }),
            expect.objectContaining({
              id: importedNodeIds[1],
              metadata: expect.objectContaining({
                sourceName: 'warehouse_prod_finance_erp',
                tableName: 'orders',
              }),
            }),
          ]),
        }),
      })
    );
  });

  it('rejects unknown connections before import', async () => {
    const { app } = buildApp();

    await expectSourceImportRejection({
      app,
      payload: buildSourceImportPayload({
        connectionId: 'missing',
        objects: [{ objectId: defaultOrdersSourceObject.objectId }],
        groupingStrategy: 'schema',
        includeColumns: true,
        addTests: false,
        addFreshness: false,
      }),
      expectedStatus: 404,
      responseBody: {
        error: { type: 'not_found', reason: 'warehouse_connection_not_found' },
      },
    });
  });

  it('returns conflict when the authoritative draft changes during import', async () => {
    const { app } = buildApp({
      saveResult: {
        kind: 'conflict',
        currentRevision: 'rev-3',
        storedSchemaVersion: 'workspace-graph-draft.v1',
        updatedAt: '2026-05-30T00:00:02.000Z',
      },
    });

    const response = await injectWarehouseRequest(app, {
      method: 'POST',
      path: `/workspace/sources/import`,
      payload: buildSourceImportPayload({
        connectionId: 'warehouse-prod',
        objects: [{ objectId: defaultOrdersSourceObject.objectId }],
        groupingStrategy: 'schema',
        includeColumns: true,
        addTests: false,
        addFreshness: false,
      }),
    });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toEqual({
      error: { type: 'conflict', reason: 'workspace_source_import_draft_conflict' },
    });
  });

  it('returns a stable conflict when an idempotency key is reused', async () => {
    const { app } = buildApp({ saveResult: { kind: 'idempotency_mismatch' } });

    await expectSourceImportRejection({
      app,
      payload: buildSourceImportPayload({
        connectionId: 'warehouse-prod',
        objects: [{ objectId: defaultOrdersSourceObject.objectId }],
        groupingStrategy: 'schema',
        includeColumns: true,
        addTests: false,
        addFreshness: false,
      }),
      expectedStatus: 409,
      responseBody: {
        error: {
          type: 'conflict',
          reason: 'workspace_source_import_idempotency_mismatch',
        },
      },
    });
  });

  it('rejects malformed existing source YAML before mutating the draft', async () => {
    await expectSourceImportRejectedWithoutMutation({
      fixtureOptions: {
        existingSourceFileContent: 'version: 2\nsources:\n  - name: [',
      },
      payload: buildSourceImportPayload({
        connectionId: 'warehouse-prod',
        objects: [{ objectId: defaultOrdersSourceObject.objectId }],
        groupingStrategy: 'schema',
        includeColumns: true,
        addTests: false,
        addFreshness: false,
      }),
      responseBody: {
        error: {
          type: 'bad_request',
          reason: 'invalid_workspace_source_yaml',
          target: 'workspace_file',
        },
      },
    });
  });

  it('fails closed when the bearer token is missing', async () => {
    const { app } = buildApp({ authenticated: false });

    const response = await injectWarehouseRequest(app, {
      method: 'GET',
      path: `/workspace/warehouse/connections`,
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({ error: { type: 'unauthorized', reason: 'missing_token' } });
  });

  it('fails closed when source import action is denied', async () => {
    const { app } = buildApp({ authorized: false });

    const response = await injectWarehouseRequest(app, {
      method: 'GET',
      path: `/workspace/warehouse/connections`,
    });

    expect(response.statusCode).toBe(403);
    expect(response.json()).toEqual({ error: { type: 'forbidden', reason: 'action_not_granted' } });
  });
});
