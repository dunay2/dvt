import type { WorkspaceGraphAuthoringDraft, WorkspaceGraphAuthoringNode } from '@dvt/contracts';
import { describe, expect, it, vi } from 'vitest';

import { queryKeys } from '../../queries/queryKeys';
import { performCanvasDraftAutosave } from './canvasDraftAutosaveExecution';
import { createCanvasDraftQueryCache } from './canvasDraftQueryCache';
import { hasRemovedImportedWarehouseSource } from './canvasDraftWorkspaceFileRefresh';
import type { CanvasDraftSession } from './canvasDraftSession';
import type { DraftAttemptRefs } from './canvasDraftLifecycle.types';

describe('Canvas draft workspace-file refresh', () => {
  it('detects removal of an imported warehouse source binding', () => {
    expect(
      hasRemovedImportedWarehouseSource(
        buildDraft([buildImportedSourceNode('source-orders', 'orders')]),
        buildDraft([])
      )
    ).toBe(true);
  });

  it('does not refresh files for ordinary graph removals or retained source bindings', () => {
    const sourceNode = buildImportedSourceNode('source-orders', 'orders');
    expect(
      hasRemovedImportedWarehouseSource(buildDraft([sourceNode]), buildDraft([sourceNode]))
    ).toBe(false);
    expect(
      hasRemovedImportedWarehouseSource(
        buildDraft([buildOrdinaryNode('model-orders')]),
        buildDraft([])
      )
    ).toBe(false);
  });

  it('invalidates the active workspace file tree and every cached file content query', async () => {
    const queryClient = {
      cancelQueries: vi.fn(async () => undefined),
      fetchQuery: vi.fn(),
      setQueryData: vi.fn(),
      invalidateQueries: vi.fn(async () => undefined),
    };
    const cache = createCanvasDraftQueryCache(queryClient, 'tenant::project::dev', {
      readGraphDraftState: vi.fn(),
      readGraphDraft: vi.fn(),
      saveGraphDraft: vi.fn(),
    });

    await cache.refreshWorkspaceFilesAfterSourceRemoval();

    expect(queryClient.invalidateQueries).toHaveBeenNthCalledWith(1, {
      queryKey: queryKeys.workspace.fileTree('tenant::project::dev'),
    });
    expect(queryClient.invalidateQueries).toHaveBeenNthCalledWith(2, {
      queryKey: queryKeys.workspace.fileContentRoot('tenant::project::dev'),
    });
  });

  it('refreshes active Code queries only after the source-removal autosave succeeds', async () => {
    const draft = buildDraft([]);
    const remoteDraftState = {
      accessMode: 'writable' as const,
      authoringAuthority: {
        kind: 'resolved' as const,
        binding: {
          schemaVersion: 'canvas-authoring-authority-binding.v1' as const,
          canvasId: 'canvas-source-refresh',
          authority: { kind: 'graph-draft' as const },
        },
      },
      capabilityReason: 'authorized' as const,
      formatError: null,
      formatMeta: null,
      record: {
        revision: 'revision-after-removal',
        draft,
        savedAt: '2026-08-16T10:00:00.000Z',
      },
      semanticGraph: null,
    };
    const refreshWorkspaceFilesAfterSourceRemoval = vi.fn(async () => undefined);
    let session = buildEditingDraftSession();

    performCanvasDraftAutosave({
      refs: buildDraftAttemptRefs(),
      draftRepository: {
        readGraphDraftState: vi.fn(),
        readGraphDraft: vi.fn(),
        saveGraphDraft: vi.fn(async () => ({
          outcome: 'saved' as const,
          record: remoteDraftState.record,
          remoteDraftState,
        })),
      },
      currentDraftPayload: draft,
      draftSession: session,
      createDraftIdempotencyKey: () => 'remove-source-refresh',
      setDraftSession: (updater) => {
        session = typeof updater === 'function' ? updater(session) : updater;
      },
      setDraftSaveStatus: vi.fn(),
      draftQueryCache: {
        fetchLatestRemoteDraftState: vi.fn(),
        fetchLatestRemoteDraft: vi.fn(),
        refreshWorkspaceFilesAfterSourceRemoval,
        replaceRemoteDraftState: vi.fn(),
      },
      currentDraftPayloadSignature: 'source-removed',
      refreshWorkspaceFilesAfterSave: true,
    });

    await vi.waitFor(() => {
      expect(refreshWorkspaceFilesAfterSourceRemoval).toHaveBeenCalledTimes(1);
    });
  });
});

function buildDraftAttemptRefs(): DraftAttemptRefs {
  return {
    saveDebounceTimerRef: { current: null },
    lastSavedSignatureRef: { current: null },
    lastFailedSignatureRef: { current: null },
    saveAttemptGenerationRef: { current: 0 },
    nextSaveAttemptIdRef: { current: 0 },
    activeSaveAttemptRef: { current: null },
  };
}

function buildEditingDraftSession(): CanvasDraftSession {
  return {
    syncState: 'editing',
    baseline: { record: null },
    draftRevision: 'revision-before-removal',
    workingSet: {
      visibleNodeIds: [],
      visibleEdges: [],
      pendingExplicitNodeIds: [],
    },
  };
}

function buildImportedSourceNode(id: string, tableName: string): WorkspaceGraphAuthoringNode {
  return {
    id,
    name: tableName,
    pluginId: 'dvt.warehouse-source',
    kind: 'dvt:source',
    role: 'input',
    status: 'idle',
    tags: ['source', 'raw'],
    path: 'models/sources/src_raw.yml',
    metadata: {
      connectedSourceRef: {
        schemaVersion: 'connected-source-ref.v1',
        connectionRef: {
          schemaVersion: 'connection-ref.v1',
          connectionId: 'postgresql-local',
          provider: 'postgres',
        },
        sourceObjectId: `relation/dvt/raw/${tableName}`,
      },
      sourceName: 'postgresql_local_dvt_raw',
      tableName,
    },
  };
}

function buildOrdinaryNode(id: string): WorkspaceGraphAuthoringNode {
  return {
    id,
    name: 'Orders model',
    pluginId: 'dvt',
    kind: 'dvt:transform',
    role: 'transform',
    status: 'idle',
    tags: ['model'],
  };
}

function buildDraft(nodes: readonly WorkspaceGraphAuthoringNode[]): WorkspaceGraphAuthoringDraft {
  return {
    canvas: { id: 'canvas-source-refresh', kind: 'dbt', title: 'Sources' },
    nodeIds: nodes.map((node) => node.id),
    nodePositions: Object.fromEntries(nodes.map((node) => [node.id, { x: 0, y: 0 }])),
    nodes: [...nodes],
    edges: [],
  };
}
