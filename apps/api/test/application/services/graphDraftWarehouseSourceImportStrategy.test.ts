import { createHash } from 'node:crypto';

import type { SourceObject, WorkspaceGraphAuthoringDraft } from '@dvt/contracts';
import { describe, expect, it, vi } from 'vitest';

import {
  WarehouseSourceImportDraftConflictError,
  WarehouseSourceImportIdempotencyMismatchError,
} from '../../../src/application/ports/warehouseSourceImport.js';
import type {
  IWorkspaceFileBatchMutationPort,
  IWorkspaceFileRepository,
  WorkspaceFileBatchMutation,
  WorkspaceStorageScope,
} from '../../../src/application/ports/workspaceFiles.js';
import { WorkspaceFileNotFoundError } from '../../../src/application/ports/workspaceFiles.js';
import type { IWorkspaceGraphDraftStore } from '../../../src/application/ports/workspaceGraphDraft.js';
import {
  GraphDraftWarehouseSourceImportStrategy,
  WarehouseSourceImportCanvasNotFoundError,
} from '../../../src/application/services/graphDraftWarehouseSourceImportStrategy.js';
import type { WarehouseSourceImportCommandContext } from '../../../src/application/services/warehouseSourceImportPlan.js';

const SCOPE = {
  tenantId: 'tenant-source',
  projectId: 'project-source',
  environmentId: 'environment-source',
} as const;

const DVT_SOURCE_NODE_ID_PATTERN =
  /^dvt_src_[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u;

const SOURCE_OBJECT: SourceObject = {
  objectId: 'relation/analytics/erp/orders',
  displayName: 'orders',
  locator: {
    kind: 'relation',
    catalog: 'analytics',
    schema: 'erp',
    name: 'orders',
    relationType: 'table',
  },
  columns: [{ name: 'order_id', type: 'integer', nullable: false }],
  metricEvidence: {
    observedAt: '2026-07-14T00:00:00.000Z',
    observationScope: { kind: 'snapshot' },
    rowCount: {
      value: 42,
      provenance: 'measured',
      method: 'data-scan',
      confidence: 'exact',
    },
    byteSize: {
      value: 2048,
      provenance: 'measured',
      method: 'provider-storage-metadata',
      confidence: 'exact',
      basis: 'physical-allocation',
    },
  },
};

describe('GraphDraftWarehouseSourceImportStrategy', () => {
  it('publishes YAML and appends a metadata-rich source with opaque logical identity', async () => {
    const draftStore = createDraftStore(createDraft('orders-canvas'));
    const batchMutation = createBatchMutation();
    const strategy = createStrategy(draftStore, batchMutation);

    const result = await strategy.execute(CONTEXT, {
      schemaVersion: 'canvas-authoring-authority-binding.v1',
      canvasId: 'orders-canvas',
      authority: { kind: 'graph-draft' },
    });

    expect(batchMutation.apply).toHaveBeenCalledWith(
      SCOPE,
      expect.objectContaining({
        idempotencyKey: 'source-import-1:apply',
        writes: [
          expect.objectContaining({
            path: 'models/sources/src_erp.yml',
            content: expect.stringContaining('name: orders'),
          }),
        ],
      })
    );
    expect(draftStore.save).toHaveBeenCalledWith(
      expect.objectContaining({
        idempotencyKey: 'source-import-1',
        canvasIds: ['orders-canvas'],
        draft: expect.objectContaining({
          activeCanvasId: 'orders-canvas',
          nodes: [
            expect.objectContaining({
              metadata: expect.objectContaining({
                connectedSourceRef: {
                  schemaVersion: 'connected-source-ref.v1',
                  connectionRef: {
                    schemaVersion: 'connection-ref.v1',
                    connectionId: 'warehouse-prod',
                    provider: 'postgres',
                  },
                  sourceObjectId: SOURCE_OBJECT.objectId,
                },
                sourceMetricEvidence: SOURCE_OBJECT.metricEvidence,
                columns: SOURCE_OBJECT.columns,
                databaseUser: 'warehouse_reader',
              }),
            }),
          ],
        }),
      })
    );
    expect(result).toMatchObject({
      sourcesCreated: 1,
      yamlFiles: ['models/sources/src_erp.yml'],
      outcome: {
        kind: 'graph-draft',
        draftRevision: 'draft-revision-2',
      },
    });
    const savedNode = vi.mocked(draftStore.save).mock.calls[0]?.[0].draft.nodes[0];
    expect(savedNode?.id).toMatch(DVT_SOURCE_NODE_ID_PATTERN);
    expect(savedNode?.id).not.toContain('warehouse');
    expect(savedNode?.id).not.toContain('analytics');
    expect(savedNode?.id).not.toContain('erp');
    expect(savedNode?.id).not.toContain('orders');
    if (result.outcome.kind !== 'graph-draft') throw new Error('Expected graph-draft outcome.');
    expect(result.outcome.importedNodeIds).toEqual([savedNode?.id]);
    expect(savedNode?.metadata).not.toHaveProperty('sourceObjectId');
    expect(savedNode?.metadata).not.toHaveProperty('connectionType');
    expect(savedNode?.metadata).not.toHaveProperty('credentialRef');
  });

  it('rejects a missing Graph Draft before publishing files', async () => {
    const draftStore = createDraftStore(null);
    const batchMutation = createBatchMutation();
    const strategy = createStrategy(draftStore, batchMutation);

    await expect(
      strategy.execute(CONTEXT, {
        schemaVersion: 'canvas-authoring-authority-binding.v1',
        canvasId: 'orders-canvas',
        authority: { kind: 'graph-draft' },
      })
    ).rejects.toBeInstanceOf(WarehouseSourceImportCanvasNotFoundError);

    expect(batchMutation.apply).not.toHaveBeenCalled();
    expect(draftStore.save).not.toHaveBeenCalled();
  });

  it('keeps the same physical object distinct across two connections without binding-derived IDs', async () => {
    const existingNodeId = 'dvt_src_01991dc0-0000-7000-8000-000000000001';
    const draftStore = createDraftStore(createDraftWithSourceNode('orders-canvas', existingNodeId));
    const batchMutation = createBatchMutation();
    const strategy = createStrategy(draftStore, batchMutation);
    const secondConnectionContext: WarehouseSourceImportCommandContext = {
      ...CONTEXT,
      idempotencyKey: 'source-import-2',
      connection: {
        ...CONTEXT.connection,
        id: 'warehouse-backup',
        name: 'Backup warehouse',
      },
      sourceObjects: CONTEXT.sourceObjects.map((sourceObject) => ({
        ...sourceObject,
        connectionId: 'warehouse-backup',
      })),
    };

    await strategy.execute(secondConnectionContext, {
      schemaVersion: 'canvas-authoring-authority-binding.v1',
      canvasId: 'orders-canvas',
      authority: { kind: 'graph-draft' },
    });

    const savedNodes = vi.mocked(draftStore.save).mock.calls[0]?.[0].draft.nodes ?? [];
    expect(savedNodes).toHaveLength(2);
    expect(savedNodes[0]?.id).toBe(existingNodeId);
    expect(savedNodes[1]?.id).toMatch(DVT_SOURCE_NODE_ID_PATTERN);
    expect(savedNodes[1]?.id).not.toBe(existingNodeId);
    expect(savedNodes.map((node) => node.metadata?.connectedSourceRef)).toEqual([
      expect.objectContaining({
        connectionRef: expect.objectContaining({ connectionId: 'warehouse-prod' }),
      }),
      expect.objectContaining({
        connectionRef: expect.objectContaining({ connectionId: 'warehouse-backup' }),
      }),
    ]);
    const savedPositions = vi.mocked(draftStore.save).mock.calls[0]?.[0].draft.nodePositions ?? {};
    expect(new Set(savedNodes.map((node) => JSON.stringify(savedPositions[node.id]))).size).toBe(2);
  });

  it('keeps graph bindings aligned with collision-resistant YAML identities', async () => {
    const sourceObjects = ['erp-data', 'erp_data'].map((schema) => ({
      ...SOURCE_OBJECT,
      objectId: `relation/analytics/${schema}/orders`,
      displayName: `orders from ${schema}`,
      locator: {
        ...SOURCE_OBJECT.locator,
        schema,
      } as Extract<SourceObject['locator'], { kind: 'relation' }>,
      connectionId: 'warehouse-prod',
    }));
    const context: WarehouseSourceImportCommandContext = {
      ...CONTEXT,
      sourceObjects,
    };
    const draftStore = createDraftStore(createDraft('orders-canvas'));
    const batchMutation = createBatchMutation();
    const strategy = createStrategy(draftStore, batchMutation);

    await strategy.execute(context, {
      schemaVersion: 'canvas-authoring-authority-binding.v1',
      canvasId: 'orders-canvas',
      authority: { kind: 'graph-draft' },
    });

    const appliedMutation = vi.mocked(batchMutation.apply).mock.calls[0]?.[1];
    const yamlPaths = appliedMutation?.writes.map((write) => write.path).sort() ?? [];
    const savedNodes = vi.mocked(draftStore.save).mock.calls[0]?.[0].draft.nodes ?? [];
    const graphPaths = savedNodes.map((node) => node.path).sort();
    const graphSourceNames = savedNodes.map((node) => node.metadata?.sourceName);

    expect(yamlPaths).toHaveLength(2);
    expect(new Set(yamlPaths)).toHaveLength(2);
    expect(graphPaths).toEqual(yamlPaths);
    expect(new Set(graphSourceNames)).toHaveLength(2);
    expect(savedNodes.every((node) => DVT_SOURCE_NODE_ID_PATTERN.test(node.id))).toBe(true);
  });

  it('fails closed when persisted nodes repeat one connected-source binding', async () => {
    const draftStore = createDraftStore(
      createDraftWithSourceNodes('orders-canvas', [
        {
          nodeId: 'dvt_src_01991dc0-0000-7000-8000-000000000002',
          connectionId: 'warehouse-prod',
          sourceObjectId: SOURCE_OBJECT.objectId,
        },
        {
          nodeId: 'dvt_src_01991dc0-0000-7000-8000-000000000003',
          connectionId: 'warehouse-prod',
          sourceObjectId: SOURCE_OBJECT.objectId,
        },
      ])
    );
    const batchMutation = createBatchMutation();
    const strategy = createStrategy(draftStore, batchMutation);

    await expect(
      strategy.execute(CONTEXT, {
        schemaVersion: 'canvas-authoring-authority-binding.v1',
        canvasId: 'orders-canvas',
        authority: { kind: 'graph-draft' },
      })
    ).rejects.toBeInstanceOf(WarehouseSourceImportDraftConflictError);

    expect(batchMutation.apply).not.toHaveBeenCalled();
    expect(draftStore.save).not.toHaveBeenCalled();
  });

  it('fails closed on legacy source binding metadata before publishing files', async () => {
    const draftStore = createDraftStore(
      createDraftWithLegacySourceNode(
        'orders-canvas',
        'dvt_src_01991dc0-0000-7000-8000-000000000004'
      )
    );
    const batchMutation = createBatchMutation();
    const strategy = createStrategy(draftStore, batchMutation);

    await expect(
      strategy.execute(CONTEXT, {
        schemaVersion: 'canvas-authoring-authority-binding.v1',
        canvasId: 'orders-canvas',
        authority: { kind: 'graph-draft' },
      })
    ).rejects.toBeInstanceOf(WarehouseSourceImportDraftConflictError);

    expect(batchMutation.apply).not.toHaveBeenCalled();
    expect(draftStore.save).not.toHaveBeenCalled();
  });

  it('rolls back every YAML write when the graph draft compare-and-swap fails', async () => {
    const draftStore = createDraftStore(createDraft('orders-canvas'), {
      kind: 'conflict',
      currentRevision: 'draft-revision-3',
      storedSchemaVersion: 'workspace-graph-draft.v1',
      updatedAt: '2026-07-14T00:00:01.000Z',
    });
    const batchMutation = createBatchMutation();
    const strategy = createStrategy(draftStore, batchMutation);

    await expect(
      strategy.execute(CONTEXT, {
        schemaVersion: 'canvas-authoring-authority-binding.v1',
        canvasId: 'orders-canvas',
        authority: { kind: 'graph-draft' },
      })
    ).rejects.toThrow('changed before the warehouse sources could be imported');

    expect(batchMutation.apply).toHaveBeenCalledTimes(2);
    expect(batchMutation.apply).toHaveBeenLastCalledWith(
      SCOPE,
      expect.objectContaining({
        idempotencyKey: 'source-import-1:rollback',
        writes: [],
        deletes: ['models/sources/src_erp.yml'],
      })
    );
  });

  it('rejects a missing target Canvas before publishing files', async () => {
    const draftStore = createDraftStore(createDraft('existing-canvas'));
    const batchMutation = createBatchMutation();
    const strategy = createStrategy(draftStore, batchMutation);

    await expect(
      strategy.execute(CONTEXT, {
        schemaVersion: 'canvas-authoring-authority-binding.v1',
        canvasId: 'orders-canvas',
        authority: { kind: 'graph-draft' },
      })
    ).rejects.toBeInstanceOf(WarehouseSourceImportCanvasNotFoundError);
    expect(batchMutation.apply).not.toHaveBeenCalled();
  });

  it('distinguishes idempotency reuse from a concurrent draft revision conflict', async () => {
    const draftStore = createDraftStore(createDraft('orders-canvas'), {
      kind: 'idempotency_mismatch',
    });
    const batchMutation = createBatchMutation();
    const strategy = createStrategy(draftStore, batchMutation);

    await expect(
      strategy.execute(CONTEXT, {
        schemaVersion: 'canvas-authoring-authority-binding.v1',
        canvasId: 'orders-canvas',
        authority: { kind: 'graph-draft' },
      })
    ).rejects.toBeInstanceOf(WarehouseSourceImportIdempotencyMismatchError);
    expect(batchMutation.apply).toHaveBeenCalledTimes(2);
  });

  it('fails closed when a deduplicated save no longer has the imported nodes', async () => {
    const draftStore = createDraftStore(createDraft('orders-canvas'), {
      kind: 'saved',
      schemaVersion: 'workspace-graph-draft.v1',
      revision: 'source-import-original-revision',
      updatedAt: '2026-07-14T00:00:00.000Z',
      deduplicated: true,
    });
    const batchMutation = createBatchMutation(true);
    const strategy = createStrategy(draftStore, batchMutation);

    await expect(
      strategy.execute(CONTEXT, {
        schemaVersion: 'canvas-authoring-authority-binding.v1',
        canvasId: 'orders-canvas',
        authority: { kind: 'graph-draft' },
      })
    ).rejects.toBeInstanceOf(WarehouseSourceImportDraftConflictError);

    expect(draftStore.read).toHaveBeenCalledTimes(2);
    expect(batchMutation.apply).toHaveBeenCalledTimes(1);
  });

  it('reports the persisted logical node identity for a deduplicated save', async () => {
    const persistedNodeId = 'dvt_src_01991dc0-0000-7000-8000-000000000005';
    const draftStore = createDraftStore(
      createDraft('orders-canvas'),
      {
        kind: 'saved',
        schemaVersion: 'workspace-graph-draft.v1',
        revision: 'source-import-original-revision',
        updatedAt: '2026-07-14T00:00:00.000Z',
        deduplicated: true,
      },
      createDraftWithSourceNode('orders-canvas', persistedNodeId)
    );
    const batchMutation = createBatchMutation(true);
    const strategy = createStrategy(draftStore, batchMutation);

    await expect(
      strategy.execute(CONTEXT, {
        schemaVersion: 'canvas-authoring-authority-binding.v1',
        canvasId: 'orders-canvas',
        authority: { kind: 'graph-draft' },
      })
    ).resolves.toMatchObject({
      outcome: {
        kind: 'graph-draft',
        draftRevision: 'source-import-original-revision',
        importedNodeIds: [persistedNodeId],
      },
    });

    expect(draftStore.read).toHaveBeenCalledTimes(2);
    expect(batchMutation.apply).toHaveBeenCalledTimes(1);
  });
});

const CONTEXT: WarehouseSourceImportCommandContext = {
  scope: SCOPE,
  canvasId: 'orders-canvas',
  idempotencyKey: 'source-import-1',
  connection: {
    id: 'warehouse-prod',
    name: 'Production warehouse',
    type: 'postgres',
    database: 'analytics',
  },
  databaseUser: 'warehouse_reader',
  sourceObjects: [
    {
      ...SOURCE_OBJECT,
      locator: SOURCE_OBJECT.locator as Extract<SourceObject['locator'], { kind: 'relation' }>,
      connectionId: 'warehouse-prod',
    },
  ],
  catalogSourceObjects: [
    {
      ...SOURCE_OBJECT,
      locator: SOURCE_OBJECT.locator as Extract<SourceObject['locator'], { kind: 'relation' }>,
      connectionId: 'warehouse-prod',
    },
  ],
  groupingStrategy: 'schema',
  includeColumns: true,
  addTests: false,
  addFreshness: false,
};

function createStrategy(
  draftStore: IWorkspaceGraphDraftStore,
  batchMutation: IWorkspaceFileBatchMutationPort
): GraphDraftWarehouseSourceImportStrategy {
  return new GraphDraftWarehouseSourceImportStrategy({
    draftStore,
    workspaceFiles: createWorkspaceFiles(),
    batchMutation,
    now: () => new Date('2026-07-14T00:00:00.000Z'),
  });
}

function createWorkspaceFiles(): IWorkspaceFileRepository {
  return {
    listFiles: vi.fn(async () => []),
    getFileContent: vi.fn(async (_scope, filePath) => {
      throw new WorkspaceFileNotFoundError(filePath);
    }),
    saveFileContent: vi.fn(),
    deleteFileContent: vi.fn(),
  };
}

function createBatchMutation(deduplicated = false): IWorkspaceFileBatchMutationPort {
  return {
    apply: vi.fn(async (_scope: WorkspaceStorageScope, mutation: WorkspaceFileBatchMutation) => ({
      kind: 'applied' as const,
      idempotencyKey: mutation.idempotencyKey,
      requestHash: 'a'.repeat(64),
      deduplicated,
      writes: mutation.writes.map((write) => ({
        path: write.path,
        contentSha256: sha256(write.content),
      })),
      deletes: [...mutation.deletes],
    })),
  };
}

function createDraftStore(
  draft: WorkspaceGraphAuthoringDraft | null,
  saveResult: Awaited<ReturnType<IWorkspaceGraphDraftStore['save']>> = {
    kind: 'saved',
    schemaVersion: 'workspace-graph-draft.v1',
    revision: 'draft-revision-2',
    updatedAt: '2026-07-14T00:00:00.000Z',
    deduplicated: false,
  },
  replayDraft: WorkspaceGraphAuthoringDraft | null = draft
): IWorkspaceGraphDraftStore {
  let readCount = 0;
  return {
    migrate: vi.fn(async () => undefined),
    close: vi.fn(async () => undefined),
    read: vi.fn(async () => {
      const currentDraft = readCount++ === 0 ? draft : replayDraft;
      return currentDraft === null
        ? null
        : {
            scope: SCOPE,
            schemaVersion: 'workspace-graph-draft.v1',
            revision: 'draft-revision-1',
            draftPayload: currentDraft,
            updatedAt: '2026-07-14T00:00:00.000Z',
          };
    }),
    save: vi.fn(async () => saveResult),
  };
}

function createDraft(canvasId: string): WorkspaceGraphAuthoringDraft {
  return {
    canvas: { id: canvasId, kind: 'canvas', title: 'Canvas', environmentId: SCOPE.environmentId },
    activeCanvasId: canvasId,
    nodeIds: [],
    nodePositions: {},
    nodes: [],
    edges: [],
    canvases: [
      {
        canvas: {
          id: canvasId,
          kind: 'canvas',
          title: 'Canvas',
          environmentId: SCOPE.environmentId,
        },
        nodeIds: [],
        nodePositions: {},
        nodes: [],
        edges: [],
      },
    ],
  };
}

function createDraftWithSourceNode(canvasId: string, nodeId: string): WorkspaceGraphAuthoringDraft {
  return createDraftWithSourceNodes(canvasId, [
    {
      nodeId,
      connectionId: 'warehouse-prod',
      sourceObjectId: SOURCE_OBJECT.objectId,
    },
  ]);
}

function createDraftWithSourceNodes(
  canvasId: string,
  identities: ReadonlyArray<{
    nodeId: string;
    connectionId: string;
    sourceObjectId: string;
  }>
): WorkspaceGraphAuthoringDraft {
  const draft = createDraft(canvasId);
  const nodes = identities.map((identity) => ({
    id: identity.nodeId,
    name: SOURCE_OBJECT.displayName,
    pluginId: 'dvt.warehouse-source',
    kind: 'dvt:source',
    role: 'input' as const,
    status: 'idle' as const,
    tags: ['source', 'erp'],
    metadata: {
      connectedSourceRef: {
        schemaVersion: 'connected-source-ref.v1',
        connectionRef: {
          schemaVersion: 'connection-ref.v1',
          connectionId: identity.connectionId,
          provider: 'postgres',
        },
        sourceObjectId: identity.sourceObjectId,
      },
    },
  }));
  const nodeIds = identities.map((identity) => identity.nodeId);
  const nodePositions = Object.fromEntries(
    identities.map((identity, index) => [identity.nodeId, { x: 120 + index * 320, y: 120 }])
  );
  return {
    ...draft,
    nodeIds,
    nodePositions,
    nodes,
    canvases: draft.canvases?.map((canvas) => ({
      ...canvas,
      nodeIds,
      nodePositions,
      nodes,
    })),
  };
}

function createDraftWithLegacySourceNode(
  canvasId: string,
  nodeId: string
): WorkspaceGraphAuthoringDraft {
  const draft = createDraftWithSourceNode(canvasId, nodeId);
  const nodes = draft.nodes.map((node) => ({
    ...node,
    metadata: { sourceObjectId: SOURCE_OBJECT.objectId },
  }));
  return {
    ...draft,
    nodes,
    canvases: draft.canvases?.map((canvas) => ({ ...canvas, nodes })),
  };
}

function sha256(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}
