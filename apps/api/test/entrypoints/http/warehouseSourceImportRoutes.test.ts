import Fastify from 'fastify';
import type { FastifyInstance } from 'fastify';
import { describe, expect, it, vi } from 'vitest';

import { ImportWarehouseSourcesUseCase } from '../../../src/application/services/importWarehouseSourcesUseCase.js';
import { ListWarehouseConnectionsUseCase } from '../../../src/application/services/listWarehouseConnectionsUseCase.js';
import { ListWarehouseConnectionTablesUseCase } from '../../../src/application/services/listWarehouseConnectionTablesUseCase.js';
import { registerWarehouseSourceImportRoutes } from '../../../src/entrypoints/http/warehouseSourceImportRoutes.js';
import { InMemoryWarehouseConnectionCatalog } from '../../../src/infrastructure/warehouseSourceImport/InMemoryWarehouseConnectionCatalog.js';

const SCOPE_QUERY = 'tenantId=tenant-a&projectId=project-a&environmentId=env-a';

function principal(): Record<string, unknown> {
  return {
    principalId: 'user-1',
    subjectId: 'user-1',
    issuer: 'issuer',
    audience: 'audience',
    principalType: 'user',
    expiresAt: new Date('2030-01-01T00:00:00Z'),
    rawScopes: [],
    assertedTenantIds: ['tenant-a'],
    assertedProjectIds: ['project-a'],
  };
}

function buildApp(
  options: {
    readonly authenticated?: boolean;
    readonly authorized?: boolean;
    readonly saveResult?:
      | {
          readonly kind: 'saved';
          readonly schemaVersion: string;
          readonly revision: string;
          readonly updatedAt: string;
          readonly deduplicated: boolean;
        }
      | {
          readonly kind: 'conflict';
          readonly currentRevision: string;
          readonly storedSchemaVersion: string;
          readonly updatedAt: string | null;
        };
  } = {}
): {
  readonly app: FastifyInstance;
  readonly authorize: ReturnType<typeof vi.fn>;
  readonly draftStore: {
    readonly read: ReturnType<typeof vi.fn>;
    readonly save: ReturnType<typeof vi.fn>;
  };
} {
  const app = Fastify({ logger: false });
  const catalog = new InMemoryWarehouseConnectionCatalog({
    connections: [
      {
        id: 'warehouse-prod',
        name: 'Production warehouse',
        type: 'snowflake',
        database: 'analytics',
        tables: [
          {
            database: 'analytics',
            schema: 'erp',
            table: 'orders',
            rowCount: 42,
            columns: [{ name: 'id', type: 'number', nullable: false }],
          },
        ],
      },
    ],
  });
  const draftStore = {
    read: vi.fn().mockResolvedValue({
      scope: { tenantId: 'tenant-a', projectId: 'project-a', environmentId: 'env-a' },
      schemaVersion: 'workspace-graph-draft.v1',
      revision: 'rev-1',
      updatedAt: '2026-05-30T00:00:00.000Z',
      draftPayload: {
        canvas: { id: 'canvas-a', kind: 'canvas', title: 'Canvas' },
        activeCanvasId: 'canvas-a',
        nodeIds: [],
        nodePositions: {},
        nodes: [],
        edges: [],
        canvases: [
          {
            canvas: { id: 'canvas-a', kind: 'canvas', title: 'Canvas' },
            nodeIds: [],
            nodePositions: {},
            nodes: [],
            edges: [],
          },
        ],
      },
    }),
    save: vi.fn().mockResolvedValue(
      options.saveResult ?? {
        kind: 'saved',
        schemaVersion: 'workspace-graph-draft.v1',
        revision: 'rev-2',
        updatedAt: '2026-05-30T00:00:01.000Z',
        deduplicated: false,
      }
    ),
  };
  const authorize = vi.fn().mockResolvedValue(
    options.authorized === false
      ? { ok: false, reason: 'ACTION_NOT_GRANTED' }
      : {
          ok: true,
          context: {
            principal: principal(),
            scope: { resource: 'environment', tenantId: { value: 'tenant-a' } },
            action: { kind: 'query', name: 'workspace:source-import:view' },
            requestId: 'req-1',
            authorizedAt: new Date('2026-05-30T00:00:00Z'),
          },
        }
  );

  registerWarehouseSourceImportRoutes(app, {
    authenticator: {
      authenticateBearerToken: vi.fn().mockResolvedValue(
        options.authenticated === false
          ? { ok: false, code: 'missing_token' }
          : {
              ok: true,
              principal: principal(),
            }
      ),
    } as never,
    authorizer: { authorize } as never,
    listConnectionsUseCase: new ListWarehouseConnectionsUseCase(catalog),
    listTablesUseCase: new ListWarehouseConnectionTablesUseCase(catalog),
    importSourcesUseCase: new ImportWarehouseSourcesUseCase(
      catalog,
      draftStore as never,
      () => new Date('2026-05-30T00:00:01.000Z')
    ),
    rateLimit: { max: 100, timeWindow: 60_000 },
  });

  return { app, authorize, draftStore };
}

describe('warehouseSourceImportRoutes', () => {
  it('lists warehouse connections through the protected query rail', async () => {
    const { app, authorize } = buildApp();

    const response = await app.inject({
      method: 'GET',
      url: `/workspace/warehouse/connections?${SCOPE_QUERY}`,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual([
      {
        id: 'warehouse-prod',
        name: 'Production warehouse',
        type: 'snowflake',
        database: 'analytics',
      },
    ]);
    expect(authorize).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        action: { kind: 'query', name: 'workspace:source-import:view' },
      }),
      expect.any(String)
    );
  });

  it('lists warehouse tables for a known connection', async () => {
    const { app } = buildApp();

    const response = await app.inject({
      method: 'GET',
      url: `/workspace/warehouse/connections/warehouse-prod/tables?${SCOPE_QUERY}`,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual([
      {
        database: 'analytics',
        schema: 'erp',
        table: 'orders',
        rowCount: 42,
        columns: [{ name: 'id', type: 'number', nullable: false }],
      },
    ]);
  });

  it('imports selected tables into the authoritative workspace graph draft', async () => {
    const { app, authorize } = buildApp();

    const response = await app.inject({
      method: 'POST',
      url: `/workspace/sources/import?${SCOPE_QUERY}`,
      payload: {
        connectionId: 'warehouse-prod',
        tables: [{ database: 'analytics', schema: 'erp', table: 'orders' }],
        groupingStrategy: 'schema',
        includeColumns: true,
        addTests: false,
        addFreshness: false,
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      success: true,
      sourcesCreated: 1,
      tablesImported: 1,
      yamlFiles: ['models/sources/src_erp.yml'],
      importedNodeIds: ['src_erp_orders'],
      grouping: 'schema',
    });
    expect(authorize).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        action: { kind: 'command', name: 'workspace:source-import:import' },
      }),
      expect.any(String)
    );
  });

  it('uses catalog-owned table metadata instead of client-supplied columns', async () => {
    const { app, draftStore } = buildApp();

    const response = await app.inject({
      method: 'POST',
      url: `/workspace/sources/import?${SCOPE_QUERY}`,
      payload: {
        connectionId: 'warehouse-prod',
        tables: [
          {
            database: 'analytics',
            schema: 'erp',
            table: 'orders',
            columns: [{ name: 'fake_admin_token', type: 'string', nullable: false }],
          },
        ],
        groupingStrategy: 'schema',
        includeColumns: true,
        addTests: false,
        addFreshness: false,
      },
    });

    expect(response.statusCode).toBe(200);
    expect(draftStore.save).toHaveBeenCalledWith(
      expect.objectContaining({
        draft: expect.objectContaining({
          nodes: [
            expect.objectContaining({
              metadata: expect.objectContaining({
                columns: [{ name: 'id', type: 'number', nullable: false }],
              }),
            }),
          ],
        }),
      })
    );
  });

  it('rejects unknown connections before import', async () => {
    const { app } = buildApp();

    const response = await app.inject({
      method: 'POST',
      url: `/workspace/sources/import?${SCOPE_QUERY}`,
      payload: {
        connectionId: 'missing',
        tables: [{ database: 'analytics', schema: 'erp', table: 'orders' }],
        groupingStrategy: 'schema',
        includeColumns: true,
        addTests: false,
        addFreshness: false,
      },
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({
      error: { type: 'not_found', reason: 'warehouse_connection_not_found' },
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

    const response = await app.inject({
      method: 'POST',
      url: `/workspace/sources/import?${SCOPE_QUERY}`,
      payload: {
        connectionId: 'warehouse-prod',
        tables: [{ database: 'analytics', schema: 'erp', table: 'orders' }],
        groupingStrategy: 'schema',
        includeColumns: true,
        addTests: false,
        addFreshness: false,
      },
    });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toEqual({
      error: { type: 'conflict', reason: 'workspace_source_import_draft_conflict' },
    });
  });

  it('fails closed when the bearer token is missing', async () => {
    const { app } = buildApp({ authenticated: false });

    const response = await app.inject({
      method: 'GET',
      url: `/workspace/warehouse/connections?${SCOPE_QUERY}`,
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({ error: { type: 'unauthorized', reason: 'missing_token' } });
  });

  it('fails closed when source import action is denied', async () => {
    const { app } = buildApp({ authorized: false });

    const response = await app.inject({
      method: 'GET',
      url: `/workspace/warehouse/connections?${SCOPE_QUERY}`,
    });

    expect(response.statusCode).toBe(403);
    expect(response.json()).toEqual({ error: { type: 'forbidden', reason: 'action_not_granted' } });
  });
});
