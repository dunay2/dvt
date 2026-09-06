import { createHash } from 'node:crypto';

import type {
  RelationalSourceObject,
  WorkspaceGraphAuthoringDraft,
} from '@dvt/contracts';
import { describe, expect, it, vi } from 'vitest';

import type {
  IWarehouseConnectionCatalog,
  IWarehouseConnectionProbe,
  WarehouseConnectionCatalogEntry,
} from '../../../src/application/ports/warehouseSourceImport.js';
import { WarehouseSourceRebindBindingConflictError, WarehouseSourceRebindSchemaDriftError } from '../../../src/application/ports/warehouseSourceRebind.js';
import type {
  IWorkspaceFileBatchMutationPort,
  WorkspaceFileBatchMutation,
  WorkspaceStorageScope,
} from '../../../src/application/ports/workspaceFiles.js';
import type { IWorkspaceGraphDraftStore } from '../../../src/application/ports/workspaceGraphDraft.js';
import { RebindWarehouseSourceUseCase } from '../../../src/application/services/rebindWarehouseSourceUseCase.js';
import { WarehouseConnectionSourceObjectReader } from '../../../src/application/services/WarehouseConnectionSourceObjectReader.js';

const SCOPE = {
  tenantId: 'tenant-a',
  projectId: 'project-a',
  environmentId: 'env-a',
} as const;
const SOURCE_ID = 'dvt_src_01991dc0-0000-7000-8000-000000000301';
const OLD_REF = {
  schemaVersion: 'connected-source-ref.v1' as const,
  connectionRef: {
    schemaVersion: 'connection-ref.v1' as const,
    connectionId: 'warehouse-prod',
    provider: 'postgres' as const,
  },
  sourceObjectId: 'relation/analytics/erp/orders',
};
const TARGET: RelationalSourceObject = {
  objectId: 'relation/analytics/erp/orders_v2',
  displayName: 'orders_v2',
  locator: {
    kind: 'relation',
    catalog: 'analytics',
    schema: 'erp',
    name: 'orders_v2',
    relationType: 'table',
  },
  metricEvidence: {
    observedAt: '2026-09-06T08:00:00.000Z',
    observationScope: { kind: 'snapshot' },
    rowCount: {
      value: 20,
      provenance: 'estimated',
      method: 'provider-statistics',
      confidence: 'medium',
    },
    byteSize: {
      value: 2048,
      provenance: 'measured',
      method: 'provider-storage-metadata',
      confidence: 'exact',
      basis: 'physical-allocation',
    },
  },
  columns: [
    { name: 'customer', type: 'text', nullable: true },
    { name: 'id', type: 'integer', nullable: false },
  ],
};

function draft(): WorkspaceGraphAuthoringDraft {
  const nodes = [
    {
      id: SOURCE_ID,
      name: 'Orders',
      description: 'Imported source for analytics.erp.orders',
      pluginId: 'dvt.warehouse-source',
      kind: 'dvt:source',
      role: 'input' as const,
      status: 'idle' as const,
      tags: ['source', 'erp'],
      path: 'models/sources/src_erp.yml',
      metadata: {
        connectedSourceRef: OLD_REF,
        connectionName: 'Production',
        databaseUser: 'prod_reader',
        database: 'analytics',
        schema: 'erp',
        tableIdentifier: 'orders',
        relationType: 'table',
        sourceName: 'warehouse_prod_analytics_erp',
        tableName: 'orders',
        columns: [
          { name: 'id', type: 'integer', nullable: false },
          { name: 'customer', type: 'text', nullable: true },
        ],
      },
    },
    {
      id: 'transform-orders',
      name: 'Clean orders',
      pluginId: 'dvt',
      kind: 'dvt:transform',
      role: 'transform' as const,
      status: 'idle' as const,
      tags: [],
      metadata: {},
    },
  ];
  const edges = [
    { id: 'edge-source-transform', sourceId: SOURCE_ID, targetId: 'transform-orders', relation: 'lineage' as const },
  ];
  const canvas = { id: 'canvas-a', kind: 'canvas', title: 'Canvas', environmentId: SCOPE.environmentId } as const;
  return {
    canvas,
    activeCanvasId: canvas.id,
    nodeIds: nodes.map((node) => node.id),
    nodePositions: { [SOURCE_ID]: { x: 0, y: 0 }, 'transform-orders': { x: 300, y: 0 } },
    nodes,
    edges,
    canvases: [
      {
        canvas,
        nodeIds: nodes.map((node) => node.id),
        nodePositions: { [SOURCE_ID]: { x: 0, y: 0 }, 'transform-orders': { x: 300, y: 0 } },
        nodes,
        edges,
      },
    ],
  };
}

function yaml(extraTable = false): string {
  return [
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
    '            data_type: integer',
    '          - name: customer',
    '            data_type: text',
    ...(extraTable ? ['      - name: customers'] : []),
    '',
  ].join('\n');
}

function reader(target: RelationalSourceObject): WarehouseConnectionSourceObjectReader {
  const entry: WarehouseConnectionCatalogEntry = {
    id: 'warehouse-dr',
    name: 'Disaster recovery',
    type: 'postgres',
    database: target.locator.catalog,
    credentialRef: 'postgres:warehouse-dr',
    sourceObjects: [target],
  };
  const catalog: IWarehouseConnectionCatalog = {
    listConnections: vi.fn(async () => [entry]),
    listSourceObjects: vi.fn(async () => [target]),
    getConnection: vi.fn(async () => entry),
    createConnection: vi.fn(),
    renameConnection: vi.fn(),
  };
  const probe: IWarehouseConnectionProbe = {
    inspectConnection: vi.fn(async () => ({
      status: 'passed' as const,
      checkedAt: '2026-09-06T08:00:00.000Z',
      databaseUser: 'dr_reader',
      sourceObjects: [target],
    })),
    testConnection: vi.fn(),
  };
  return new WarehouseConnectionSourceObjectReader(catalog, probe);
}

function store(
  initial: WorkspaceGraphAuthoringDraft,
  saveResult: Awaited<ReturnType<IWorkspaceGraphDraftStore['save']>> = {
    kind: 'saved',
    schemaVersion: 'workspace-graph-draft.v1',
    revision: 'source-rebind-revision',
    updatedAt: '2026-09-06T08:00:01.000Z',
    deduplicated: false,
  }
): IWorkspaceGraphDraftStore {
  return {
    migrate: vi.fn(async () => undefined),
    close: vi.fn(async () => undefined),
    read: vi.fn(async () => ({
      scope: SCOPE,
      schemaVersion: 'workspace-graph-draft.v1',
      revision: 'draft-revision-1',
      draftPayload: initial,
      updatedAt: '2026-09-06T08:00:00.000Z',
    })),
    save: vi.fn(async () => saveResult),
  };
}

function batchMutation(): IWorkspaceFileBatchMutationPort {
  return {
    apply: vi.fn(async (_scope: WorkspaceStorageScope, mutation: WorkspaceFileBatchMutation) => ({
      kind: 'applied' as const,
      idempotencyKey: mutation.idempotencyKey,
      requestHash: 'a'.repeat(64),
      deduplicated: false,
      writes: mutation.writes.map((write) => ({
        path: write.path,
        contentSha256: sha256(write.content),
      })),
      deletes: [...mutation.deletes],
    })),
  };
}

function useCase(args: {
  target?: RelationalSourceObject;
  sourceYaml?: string;
  saveResult?: Awaited<ReturnType<IWorkspaceGraphDraftStore['save']>>;
}) {
  const draftStore = store(draft(), args.saveResult);
  const batch = batchMutation();
  const content = args.sourceYaml ?? yaml();
  const service = new RebindWarehouseSourceUseCase({
    draftStore,
    sourceObjectReader: reader(args.target ?? TARGET),
    workspaceFiles: {
      getFileContent: vi.fn(async () => ({
        path: 'models/sources/src_erp.yml',
        name: 'src_erp.yml',
        language: 'yaml',
        content,
        contentSha256: sha256(content),
        lastModified: '2026-09-06T08:00:00.000Z',
      })),
    },
    batchMutation: batch,
    now: () => new Date('2026-09-06T08:00:01.000Z'),
  });
  return { service, draftStore, batch };
}

const REQUEST = {
  scope: SCOPE,
  nodeId: SOURCE_ID,
  schemaVersion: 'source-rebind-request.v1' as const,
  connectionId: 'warehouse-dr',
  sourceObjectId: TARGET.objectId,
  idempotencyKey: 'rebind-orders-dr',
};

describe('RebindWarehouseSourceUseCase', () => {
  it('preserves logical node identity, edges and column order while rebinding compatible physical coordinates', async () => {
    const { service, draftStore, batch } = useCase({});

    const result = await service.execute(REQUEST);

    expect(result).toMatchObject({
      schemaVersion: 'source-rebind-result.v1',
      nodeId: SOURCE_ID,
      draftRevision: 'source-rebind-revision',
      connectedSourceRef: {
        connectionRef: { connectionId: 'warehouse-dr' },
        sourceObjectId: TARGET.objectId,
      },
    });
    const saved = vi.mocked(draftStore.save).mock.calls[0]?.[0].draft;
    const reboundSource = saved?.nodes.find((node) => node.id === SOURCE_ID);
    expect(saved?.nodeIds).toEqual(draft().nodeIds);
    expect(saved?.edges).toEqual(draft().edges);
    expect(reboundSource?.id).toBe(SOURCE_ID);
    expect(reboundSource?.metadata?.columns).toEqual(draft().nodes[0]?.metadata?.columns);
    expect(reboundSource?.metadata?.connectedSourceRef).toEqual(result.connectedSourceRef);
    expect(reboundSource?.metadata?.tableIdentifier).toBe('orders_v2');

    const appliedYaml = vi.mocked(batch.apply).mock.calls[0]?.[1].writes[0]?.content ?? '';
    expect(appliedYaml).toContain('name: warehouse_prod_analytics_erp');
    expect(appliedYaml).toContain('name: orders');
    expect(appliedYaml).toContain('identifier: orders_v2');
    expect(appliedYaml).toContain('connection_id: warehouse-dr');
    expect(appliedYaml).toContain('database_user: dr_reader');
  });

  it('fails closed on field schema drift before mutating files or draft', async () => {
    const target = {
      ...TARGET,
      columns: TARGET.columns?.map((column) =>
        column.name === 'id' ? { ...column, type: 'bigint' } : column
      ),
    } satisfies RelationalSourceObject;
    const { service, draftStore, batch } = useCase({ target });

    await expect(service.execute({ ...REQUEST, sourceObjectId: target.objectId })).rejects.toBeInstanceOf(
      WarehouseSourceRebindSchemaDriftError
    );
    expect(batch.apply).not.toHaveBeenCalled();
    expect(draftStore.save).not.toHaveBeenCalled();
  });

  it('fails closed when changing a shared dbt source-group database or schema', async () => {
    const target = {
      ...TARGET,
      objectId: 'relation/finance/erp/orders_v2',
      locator: { ...TARGET.locator, catalog: 'finance' },
    } satisfies RelationalSourceObject;
    const { service, draftStore, batch } = useCase({ target, sourceYaml: yaml(true) });

    await expect(
      service.execute({ ...REQUEST, sourceObjectId: target.objectId })
    ).rejects.toBeInstanceOf(WarehouseSourceRebindBindingConflictError);
    expect(batch.apply).not.toHaveBeenCalled();
    expect(draftStore.save).not.toHaveBeenCalled();
  });

  it('rolls the dbt artifact back when graph CAS loses the race', async () => {
    const { service, batch } = useCase({
      saveResult: {
        kind: 'conflict',
        currentRevision: 'draft-revision-2',
        storedSchemaVersion: 'workspace-graph-draft.v1',
        updatedAt: '2026-09-06T08:00:02.000Z',
      },
    });

    await expect(service.execute(REQUEST)).rejects.toBeInstanceOf(
      WarehouseSourceRebindBindingConflictError
    );
    expect(batch.apply).toHaveBeenCalledTimes(2);
    expect(vi.mocked(batch.apply).mock.calls[1]?.[1].writes[0]?.content).toBe(yaml());
  });
});

function sha256(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}
