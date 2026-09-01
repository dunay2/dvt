import { describe, expect, it } from 'vitest';
import type { WorkspaceGraphAuthoringDraft } from '@dvt/contracts';

import { buildNodePropertiesReadModel } from '../../components/inspector/nodePropertiesReadModel';
import { projectWorkspaceGraphAuthoringDraftSemanticGraph } from '../../services/workspace/workspaceGraphDraftProjection';
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import { buildCanvasAuthoringDraft } from './canvasDraftAuthoring';
import { resolveCanvasViewCopy } from './canvasCopyCatalog';
import { buildCanvasNodePresentationCopy } from './canvasNodePresentationCopy';
import type { CanvasAuthoringDraftRecord } from './canvasDraftReadModel';
import { canvasDraftSession } from './canvasDraftSession';
import { buildCurrentDraftPayload } from './canvasDraftLifecycleSnapshot';
import { buildCanvasAuthoringGraphProjection } from './canvasAuthoringGraphProjection';
import { canvasGraphLifecycle } from './canvasGraphLifecycle';
import { createCanvasDraftRepository } from './canvasDraftRepository';
import { buildAuthoringPort } from './canvasDraftRepository.test.fixtures';

function buildRemoteDraftRecord(
  overrides?: Partial<CanvasAuthoringDraftRecord>
): CanvasAuthoringDraftRecord {
  const defaultDraft = buildAuthoringDraft({
    canvas: {
      kind: 'transformation',
      title: 'Main canvas',
    },
    nodeIds: ['node_1', 'node_2'],
    nodePositions: {
      node_1: { x: 0, y: 0 },
      node_2: { x: 100, y: 0 },
    },
    edges: [{ sourceId: 'node_1', targetId: 'node_2' }],
  });

  return {
    revision: 'rev-1',
    savedAt: '2026-04-17T00:00:00Z',
    draft: defaultDraft,
    ...overrides,
  };
}

function buildAuthoringDraft(
  overrides: Pick<WorkspaceGraphAuthoringDraft, 'canvas' | 'nodeIds' | 'nodePositions'> & {
    edges: ReadonlyArray<{ sourceId: string; targetId: string }>;
  }
): WorkspaceGraphAuthoringDraft {
  return {
    ...overrides,
    nodes: overrides.nodeIds.map((nodeId) => ({
      id: nodeId,
      name: nodeId,
      pluginId: 'dvt',
      kind: 'source',
      role: 'input',
      status: 'idle',
      tags: [],
    })),
    edges: overrides.edges.map((edge) => ({
      id: `edge_${edge.sourceId}_${edge.targetId}`,
      sourceId: edge.sourceId,
      targetId: edge.targetId,
      relation: 'lineage',
    })),
  };
}

describe('canvasDraftSession', () => {
  it('bootstraps to the canonical snapshot when no remote draft exists', () => {
    const session = canvasDraftSession.machine.bootstrap({
      remoteDraft: null,
      canonicalNodeIds: ['node_1', 'node_2'],
      canonicalEdges: [{ sourceId: 'node_1', targetId: 'node_2' }],
    });

    expect(session.syncState).toBe('editing');
    expect(session.draftRevision).toBeNull();
    expect(session.workingSet).toEqual({
      visibleNodeIds: ['node_1', 'node_2'],
      visibleEdges: [{ sourceId: 'node_1', targetId: 'node_2' }],
      pendingExplicitNodeIds: [],
    });
  });

  it('bootstraps to the persisted draft subset when a remote draft exists', () => {
    const session = canvasDraftSession.machine.bootstrap({
      remoteDraft: buildRemoteDraftRecord({
        draft: buildAuthoringDraft({
          canvas: {
            kind: 'transformation',
            title: 'Main canvas',
          },
          nodeIds: ['node_2', 'node_remote_only'],
          nodePositions: {
            node_2: { x: 220, y: 120 },
            node_remote_only: { x: 320, y: 160 },
          },
          edges: [{ sourceId: 'node_2', targetId: 'node_remote_only' }],
        }),
      }),
      canonicalNodeIds: ['node_1', 'node_2'],
      canonicalEdges: [{ sourceId: 'node_1', targetId: 'node_2' }],
    });

    expect(session.syncState).toBe('editing');
    expect(session.draftRevision).toBe('rev-1');
    expect(session.workingSet.visibleNodeIds).toEqual(['node_2', 'node_remote_only']);
    expect(session.workingSet.visibleEdges).toEqual([
      { sourceId: 'node_2', targetId: 'node_remote_only' },
    ]);
  });

  it('promotes queued explicit nodes and their canonical edges when they appear in a refreshed snapshot', () => {
    const queuedSession = canvasDraftSession.workingSet.queueExplicitNodeIds(
      canvasDraftSession.machine.bootstrap({
        remoteDraft: buildRemoteDraftRecord({
          draft: buildAuthoringDraft({
            canvas: {
              kind: 'transformation',
              title: 'Main canvas',
            },
            nodeIds: ['node_1'],
            nodePositions: {
              node_1: { x: 0, y: 0 },
            },
            edges: [],
          }),
        }),
        canonicalNodeIds: ['node_1'],
        canonicalEdges: [],
      }),
      ['node_imported']
    );

    const reconciledSession = canvasDraftSession.workingSet.reconcileSnapshot(queuedSession, {
      canonicalNodeIds: ['node_1', 'node_imported'],
      canonicalEdges: [{ sourceId: 'node_1', targetId: 'node_imported' }],
    });

    expect(reconciledSession.workingSet.visibleNodeIds).toEqual(['node_1', 'node_imported']);
    expect(reconciledSession.workingSet.visibleEdges).toEqual([
      { sourceId: 'node_1', targetId: 'node_imported' },
    ]);
    expect(reconciledSession.workingSet.pendingExplicitNodeIds).toEqual([]);
  });

  it('does not auto-merge unrelated new snapshot nodes into an active draft', () => {
    const session = canvasDraftSession.machine.bootstrap({
      remoteDraft: buildRemoteDraftRecord({
        draft: buildAuthoringDraft({
          canvas: {
            kind: 'transformation',
            title: 'Main canvas',
          },
          nodeIds: ['node_1'],
          nodePositions: {
            node_1: { x: 0, y: 0 },
          },
          edges: [],
        }),
      }),
      canonicalNodeIds: ['node_1'],
      canonicalEdges: [],
    });

    const reconciledSession = canvasDraftSession.workingSet.reconcileSnapshot(session, {
      canonicalNodeIds: ['node_1', 'node_new'],
      canonicalEdges: [],
    });

    expect(reconciledSession.workingSet.visibleNodeIds).toEqual(['node_1']);
    expect(reconciledSession.workingSet.pendingExplicitNodeIds).toEqual([]);
  });

  it('returns the same session reference when reconciliation produces no working-set change', () => {
    const session = canvasDraftSession.machine.bootstrap({
      remoteDraft: null,
      canonicalNodeIds: ['node_1', 'node_2'],
      canonicalEdges: [{ sourceId: 'node_1', targetId: 'node_2' }],
    });

    expect(
      canvasDraftSession.workingSet.reconcileSnapshot(session, {
        canonicalNodeIds: ['node_1', 'node_2'],
        canonicalEdges: [{ sourceId: 'node_1', targetId: 'node_2' }],
      })
    ).toBe(session);
  });

  it('preserves authoritative remote members when the current snapshot is behind', () => {
    const session = canvasDraftSession.machine.bootstrap({
      remoteDraft: buildRemoteDraftRecord({
        draft: buildAuthoringDraft({
          canvas: {
            kind: 'transformation',
            title: 'Main canvas',
          },
          nodeIds: ['node_1', 'node_remote_only'],
          nodePositions: {
            node_1: { x: 0, y: 0 },
            node_remote_only: { x: 220, y: 140 },
          },
          edges: [{ sourceId: 'node_1', targetId: 'node_remote_only' }],
        }),
      }),
      canonicalNodeIds: ['node_1', 'node_remote_only'],
      canonicalEdges: [{ sourceId: 'node_1', targetId: 'node_remote_only' }],
    });

    const reconciledSession = canvasDraftSession.workingSet.reconcileSnapshot(session, {
      canonicalNodeIds: ['node_1'],
      canonicalEdges: [],
    });

    expect(reconciledSession.workingSet.visibleNodeIds).toEqual(['node_1', 'node_remote_only']);
    expect(reconciledSession.workingSet.visibleEdges).toEqual([
      { sourceId: 'node_1', targetId: 'node_remote_only' },
    ]);
  });

  it('stores local overrides for visible persisted nodes without changing the working set', () => {
    const session = canvasDraftSession.machine.bootstrap({
      remoteDraft: buildRemoteDraftRecord({
        draft: buildAuthoringDraft({
          canvas: {
            kind: 'transformation',
            title: 'Main canvas',
          },
          nodeIds: ['node_1'],
          nodePositions: {
            node_1: { x: 0, y: 0 },
          },
          edges: [],
        }),
      }),
      canonicalNodeIds: ['node_1'],
      canonicalEdges: [],
    });

    const updatedSession = canvasDraftSession.workingSet.upsertNode(session, {
      id: 'node_1',
      name: 'orders_renamed',
      description: 'Inspector-authored description',
      pluginId: 'dvt',
      kind: 'dvt:source',
      role: 'input',
      status: 'idle',
      tags: [],
    });

    expect(updatedSession.workingSet).toEqual(session.workingSet);
    expect(updatedSession.localNodeCatalog).toEqual({
      node_1: expect.objectContaining({
        id: 'node_1',
        name: 'orders_renamed',
        description: 'Inspector-authored description',
      }),
    });
  });

  it('transitions to conflict while retaining the new remote baseline', () => {
    const session = canvasDraftSession.machine.applyConflict(
      canvasDraftSession.machine.bootstrap({
        remoteDraft: null,
        canonicalNodeIds: ['node_1'],
        canonicalEdges: [],
      }),
      buildRemoteDraftRecord({ revision: 'rev-conflict' })
    );

    expect(session.syncState).toBe('conflict');
    expect(session.draftRevision).toBe('rev-conflict');
    expect(session.baseline.record?.revision).toBe('rev-conflict');
  });

  it('adopts an external command revision without keeping stale saving state', () => {
    const session = canvasDraftSession.machine.adoptExternalRevision(
      {
        ...canvasDraftSession.machine.applyConflict(
          canvasDraftSession.machine.bootstrap({
            remoteDraft: null,
            canonicalNodeIds: ['node_1'],
            canonicalEdges: [],
          }),
          buildRemoteDraftRecord({ revision: 'rev-stale' })
        ),
        savingWorkingSet: {
          visibleNodeIds: ['node_1'],
          visibleEdges: [],
          pendingExplicitNodeIds: [],
        },
      },
      'rev-imported'
    );

    expect(session.syncState).toBe('editing');
    expect(session.draftRevision).toBe('rev-imported');
    expect(session.savingWorkingSet).toBeUndefined();
  });

  it('adopts an external revision as editing state while preserving the imported working set', () => {
    const savingSession = canvasDraftSession.machine.markSaving(
      canvasDraftSession.machine.bootstrap({
        remoteDraft: buildRemoteDraftRecord({
          revision: 'rev-before-import',
          draft: buildAuthoringDraft({
            canvas: {
              kind: 'transformation',
              title: 'Main canvas',
            },
            nodeIds: ['node_1'],
            nodePositions: {
              node_1: { x: 0, y: 0 },
            },
            edges: [],
          }),
        }),
        canonicalNodeIds: ['node_1'],
        canonicalEdges: [],
      })
    );
    const importedSession = canvasDraftSession.workingSet.queueExplicitNodeIds(savingSession, [
      'node_imported',
    ]);
    const adoptedSession = canvasDraftSession.machine.adoptExternalRevision(
      importedSession,
      'rev-imported'
    );

    expect(adoptedSession.syncState).toBe('editing');
    expect(adoptedSession.draftRevision).toBe('rev-imported');
    expect(adoptedSession.workingSet).toEqual({
      visibleNodeIds: ['node_1'],
      visibleEdges: [],
      pendingExplicitNodeIds: ['node_imported'],
    });
    expect(adoptedSession.savingBaseRevision).toBeUndefined();
    expect(adoptedSession.savingWorkingSet).toBeUndefined();
  });

  it('promotes a successful save into the new editing baseline', () => {
    const session = canvasDraftSession.machine.applySaveSuccess(
      canvasDraftSession.machine.markSaving(
        canvasDraftSession.machine.bootstrap({
          remoteDraft: null,
          canonicalNodeIds: ['node_1'],
          canonicalEdges: [],
        })
      ),
      buildRemoteDraftRecord({ revision: 'rev-saved' })
    );

    expect(session.syncState).toBe('editing');
    expect(session.draftRevision).toBe('rev-saved');
    expect(session.baseline.record?.revision).toBe('rev-saved');
    expect(session.workingSet.visibleNodeIds).toEqual(['node_1', 'node_2']);
    expect(session.workingSet.visibleEdges).toEqual([{ sourceId: 'node_1', targetId: 'node_2' }]);
    expect(session.savingWorkingSet).toBeUndefined();
  });

  it('preserves local edits made while a save request is in flight', () => {
    const savingSession = canvasDraftSession.machine.markSaving(
      canvasDraftSession.machine.bootstrap({
        remoteDraft: null,
        canonicalNodeIds: ['node_1'],
        canonicalEdges: [],
      })
    );
    const editedWhileSavingSession = canvasDraftSession.workingSet.queueExplicitNodeIds(
      savingSession,
      ['node_local']
    );

    const session = canvasDraftSession.machine.applySaveSuccess(
      editedWhileSavingSession,
      buildRemoteDraftRecord({ revision: 'rev-saved' })
    );

    expect(session.syncState).toBe('editing');
    expect(session.draftRevision).toBe('rev-saved');
    expect(session.baseline.record?.revision).toBe('rev-saved');
    expect(session.workingSet).toEqual({
      visibleNodeIds: ['node_1'],
      visibleEdges: [],
      pendingExplicitNodeIds: ['node_local'],
    });
    expect(session.savingWorkingSet).toBeUndefined();
  });

  it('preserves local node catalog entries created while a save request is in flight', () => {
    const localModelNode: CanonicalNode = {
      id: 'node_local',
      name: 'Model 1',
      pluginId: 'dbt',
      kind: 'dbt:model',
      role: 'transform',
      status: 'idle',
      tags: ['authoring'],
    };
    const savingSession = canvasDraftSession.machine.markSaving(
      canvasDraftSession.machine.bootstrap({
        remoteDraft: null,
        canonicalNodeIds: ['node_1'],
        canonicalEdges: [],
      })
    );
    const editedWhileSavingSession = canvasDraftSession.workingSet.addExplicitNode(
      savingSession,
      localModelNode
    );

    const session = canvasDraftSession.machine.applySaveSuccess(
      editedWhileSavingSession,
      buildRemoteDraftRecord({ revision: 'rev-saved' })
    );

    expect(session.syncState).toBe('editing');
    expect(session.draftRevision).toBe('rev-saved');
    expect(session.workingSet.visibleNodeIds).toEqual(['node_1', 'node_local']);
    expect(session.localNodeCatalog).toEqual({
      node_local: localModelNode,
    });
    expect(session.savingWorkingSet).toBeUndefined();
  });

  it('preserves a newer local node edit when an older save resolves with the same graph scope', () => {
    const submittedNode: CanonicalNode = {
      id: 'node_2',
      name: 'Orders model',
      pluginId: 'dbt',
      kind: 'dbt:model',
      role: 'transform',
      status: 'idle',
      tags: ['authoring'],
      metadata: { config: { sql: 'select 1' } },
    };
    const newerLocalNode: CanonicalNode = {
      ...submittedNode,
      metadata: { config: { sql: 'select 2' } },
    };
    const savingSession = canvasDraftSession.machine.markSaving(
      canvasDraftSession.workingSet.upsertNode(
        canvasDraftSession.machine.bootstrap({
          remoteDraft: buildRemoteDraftRecord({ revision: 'rev-before-save' }),
          canonicalNodeIds: ['node_1', 'node_2'],
          canonicalEdges: [{ sourceId: 'node_1', targetId: 'node_2' }],
        }),
        submittedNode
      )
    );
    const editedWhileSavingSession = canvasDraftSession.workingSet.upsertNode(
      savingSession,
      newerLocalNode
    );

    const session = canvasDraftSession.machine.applySaveSuccess(
      editedWhileSavingSession,
      buildRemoteDraftRecord({ revision: 'rev-saved' })
    );

    expect(session.syncState).toBe('editing');
    expect(session.draftRevision).toBe('rev-saved');
    expect(session.localNodeCatalog).toEqual({ node_2: newerLocalNode });
  });

  it('preserves dirty local authoring when a remote source-import revision reloads', () => {
    const sourceImportDraft = buildAuthoringDraft({
      canvas: {
        kind: 'dbt',
        title: 'dbt canvas',
      },
      nodeIds: ['warehouse_source'],
      nodePositions: {
        warehouse_source: { x: 120, y: 80 },
      },
      edges: [],
    });
    const localModelNode: CanonicalNode = {
      id: 'dbt_model_1',
      name: 'Model 1',
      pluginId: 'dbt',
      kind: 'dbt:model',
      role: 'transform',
      status: 'idle',
      tags: ['authoring'],
    };
    const dirtySession = canvasDraftSession.workingSet.replaceEdges(
      canvasDraftSession.workingSet.upsertNode(
        canvasDraftSession.machine.bootstrap({
          remoteDraft: buildRemoteDraftRecord({
            revision: 'rev-imported-source',
            draft: sourceImportDraft,
          }),
          canonicalNodeIds: ['warehouse_source'],
          canonicalEdges: [],
        }),
        localModelNode
      ),
      [{ sourceId: 'warehouse_source', targetId: 'dbt_model_1' }]
    );

    const reloadedSession = canvasDraftSession.machine.reloadFromRemote(
      dirtySession,
      buildRemoteDraftRecord({
        revision: 'rev-imported-source-refetched',
        draft: sourceImportDraft,
      })
    );

    expect(reloadedSession.draftRevision).toBe('rev-imported-source-refetched');
    expect(reloadedSession.baseline.record?.revision).toBe('rev-imported-source-refetched');
    expect(reloadedSession.workingSet.visibleNodeIds).toEqual(['warehouse_source', 'dbt_model_1']);
    expect(reloadedSession.workingSet.visibleEdges).toEqual([
      { sourceId: 'warehouse_source', targetId: 'dbt_model_1' },
    ]);
    expect(reloadedSession.localNodeCatalog).toEqual({
      dbt_model_1: localModelNode,
    });
  });

  it('projects the reloaded persisted edge as the same Input and Output relationship', () => {
    const persistedDraft = buildAuthoringDraft({
      canvas: {
        kind: 'transformation',
        title: 'Main canvas',
      },
      nodeIds: ['source_node', 'transform_node'],
      nodePositions: {
        source_node: { x: 0, y: 0 },
        transform_node: { x: 100, y: 0 },
      },
      edges: [{ sourceId: 'source_node', targetId: 'transform_node' }],
    });
    const initialSession = canvasDraftSession.machine.bootstrap({
      remoteDraft: buildRemoteDraftRecord({
        revision: 'rev-edge-1',
        draft: persistedDraft,
      }),
      canonicalNodeIds: ['source_node', 'transform_node'],
      canonicalEdges: [{ sourceId: 'source_node', targetId: 'transform_node' }],
    });

    const reloadedSession = canvasDraftSession.machine.reloadFromRemote(
      initialSession,
      buildRemoteDraftRecord({
        revision: 'rev-edge-2',
        draft: persistedDraft,
      })
    );
    const reloadedDraft = reloadedSession.baseline.record?.draft;
    expect(reloadedDraft).toBeDefined();
    const semanticGraph = projectWorkspaceGraphAuthoringDraftSemanticGraph(reloadedDraft!);
    const projection = buildCanvasAuthoringGraphProjection({
      visibleNodeIds: reloadedSession.workingSet.visibleNodeIds,
      visibleEdges: reloadedSession.workingSet.visibleEdges,
      draftSemanticGraph: semanticGraph,
      localCanonicalNodes: [],
    });
    const sourceNode = projection.canonicalNodesById.get('source_node');
    const transformNode = projection.canonicalNodesById.get('transform_node');
    expect(sourceNode).toBeDefined();
    expect(transformNode).toBeDefined();
    const presentationCopy = buildCanvasNodePresentationCopy(resolveCanvasViewCopy('en'), 'en');
    const sourceInputsOutputs = buildNodePropertiesReadModel({
      node: sourceNode!,
      nodes: projection.canonicalNodes,
      edges: projection.canonicalEdges,
      presentationCopy,
    }).sections.find((section) => section.id === 'inputs-outputs');
    const transformInputsOutputs = buildNodePropertiesReadModel({
      node: transformNode!,
      nodes: projection.canonicalNodes,
      edges: projection.canonicalEdges,
      presentationCopy,
    }).sections.find((section) => section.id === 'inputs-outputs');

    expect(reloadedSession.workingSet.visibleEdges).toEqual([
      { sourceId: 'source_node', targetId: 'transform_node' },
    ]);
    expect(projection.canonicalEdges).toEqual([
      {
        id: 'edge_source_node_transform_node',
        sourceId: 'source_node',
        targetId: 'transform_node',
        relation: 'lineage',
      },
    ]);
    expect(sourceInputsOutputs?.tableRows).toEqual([
      {
        id: 'output:edge_source_node_transform_node',
        cells: {
          direction: 'Output',
          node: 'transform_node',
          nodeId: 'transform_node',
          relation: 'lineage',
        },
      },
    ]);
    expect(transformInputsOutputs?.tableRows).toEqual([
      {
        id: 'input:edge_source_node_transform_node',
        cells: {
          direction: 'Input',
          node: 'source_node',
          nodeId: 'source_node',
          relation: 'lineage',
        },
      },
    ]);
  });

  it('keeps a removed edge absent from persistence, reload, and Inputs/Outputs', async () => {
    const canonicalNodes = [
      {
        id: 'source_node',
        name: 'Orders source',
        pluginId: 'dvt',
        kind: 'dvt:source',
        role: 'input',
        status: 'idle',
        tags: [],
      },
      {
        id: 'transform_node',
        name: 'Orders transform',
        pluginId: 'dvt',
        kind: 'dvt:transform',
        role: 'transform',
        status: 'idle',
        tags: [],
      },
    ] satisfies CanonicalNode[];
    const canonicalEdges = [
      {
        id: 'edge_source_node_transform_node',
        sourceId: 'source_node',
        targetId: 'transform_node',
        relation: 'lineage',
      },
    ] satisfies CanonicalEdge[];
    const persistedDraft = buildCanvasAuthoringDraft({
      canvas: { kind: 'transformation', title: 'Main canvas' },
      nodeIds: canonicalNodes.map((node) => node.id),
      nodePositions: {
        source_node: { x: 0, y: 0 },
        transform_node: { x: 100, y: 0 },
      },
      visibleEdges: canonicalEdges,
      canonicalNodes,
      canonicalEdges,
    });
    const initialSession = canvasDraftSession.machine.bootstrap({
      remoteDraft: buildRemoteDraftRecord({
        revision: 'rev-before-removal',
        draft: persistedDraft,
      }),
      canonicalNodeIds: canonicalNodes.map((node) => node.id),
      canonicalEdges,
    });

    const removedState = canvasGraphLifecycle.edge.applyChanges(
      {
        draftSession: initialSession,
        nodes: canonicalNodes.map((node) => ({
          id: node.id,
          data: { name: node.name },
          position: persistedDraft.nodePositions[node.id]!,
        })),
        edges: [
          {
            id: canonicalEdges[0]!.id,
            source: canonicalEdges[0]!.sourceId,
            target: canonicalEdges[0]!.targetId,
          },
        ],
        selectedNodeIds: [],
        inspectorNodeId: null,
      },
      [{ id: canonicalEdges[0]!.id, type: 'remove' }]
    );
    const persistedAfterRemoval = buildCurrentDraftPayload(
      removedState.nodes,
      removedState.draftSession,
      persistedDraft.canvas,
      persistedDraft,
      canonicalNodes,
      canonicalEdges
    );
    const authoringPort = buildAuthoringPort();
    const draftRepository = createCanvasDraftRepository(authoringPort);
    const saveResult = await draftRepository.saveGraphDraft({
      expectedRevision: initialSession.draftRevision,
      idempotencyKey: 'remove-edge-1',
      draft: persistedAfterRemoval,
    });
    expect(saveResult.outcome).toBe('saved');
    if (saveResult.outcome !== 'saved') {
      throw new Error('Expected removed-edge draft to persist.');
    }
    const reloadedRemoteState = await draftRepository.readGraphDraftState();
    const reloadedRemoteRecord = reloadedRemoteState.record;
    expect(reloadedRemoteRecord).toBeDefined();
    const savedSession = canvasDraftSession.machine.applySaveSuccess(
      canvasDraftSession.machine.markSaving(removedState.draftSession),
      saveResult.record
    );
    const reloadedSession = canvasDraftSession.machine.reloadFromRemote(
      savedSession,
      reloadedRemoteRecord!
    );
    const reloadedDraft = reloadedSession.baseline.record?.draft;
    expect(reloadedDraft).toBeDefined();
    const semanticGraph = projectWorkspaceGraphAuthoringDraftSemanticGraph(reloadedDraft!);
    const projection = buildCanvasAuthoringGraphProjection({
      visibleNodeIds: reloadedSession.workingSet.visibleNodeIds,
      visibleEdges: reloadedSession.workingSet.visibleEdges,
      draftSemanticGraph: semanticGraph,
      localCanonicalNodes: [],
    });
    const presentationCopy = buildCanvasNodePresentationCopy(resolveCanvasViewCopy('en'), 'en');
    const readInputsOutputs = (
      nodeId: string
    ): ReturnType<typeof buildNodePropertiesReadModel>['sections'][number] | undefined => {
      const node = projection.canonicalNodesById.get(nodeId);
      expect(node).toBeDefined();
      return buildNodePropertiesReadModel({
        node: node!,
        nodes: projection.canonicalNodes,
        edges: projection.canonicalEdges,
        presentationCopy,
      }).sections.find((section) => section.id === 'inputs-outputs');
    };

    expect(removedState.nodes).toHaveLength(2);
    expect(removedState.edges).toEqual([]);
    expect(removedState.draftSession.workingSet.visibleEdges).toEqual([]);
    expect(persistedAfterRemoval.nodeIds).toEqual(['source_node', 'transform_node']);
    expect(persistedAfterRemoval.edges).toEqual([]);
    expect(authoringPort.saveGraphDraft).toHaveBeenCalledWith(
      expect.objectContaining({ draft: expect.objectContaining({ edges: [] }) })
    );
    expect(authoringPort.readGraphDraft).toHaveBeenCalledTimes(2);
    expect(reloadedRemoteRecord?.draft.edges).toEqual([]);
    expect(reloadedSession.workingSet.visibleEdges).toEqual([]);
    expect(projection.canonicalEdges).toEqual([]);
    expect(readInputsOutputs('source_node')?.tableRows ?? []).toEqual([]);
    expect(readInputsOutputs('transform_node')?.tableRows ?? []).toEqual([]);
  });

  it('preserves local removals while accepting remote additions during reload', () => {
    const baselineDraft = buildAuthoringDraft({
      canvas: {
        kind: 'transformation',
        title: 'Main canvas',
      },
      nodeIds: ['node_1', 'node_2'],
      nodePositions: {
        node_1: { x: 0, y: 0 },
        node_2: { x: 100, y: 0 },
      },
      edges: [{ sourceId: 'node_1', targetId: 'node_2' }],
    });
    const dirtySession = canvasDraftSession.workingSet.removeNode(
      canvasDraftSession.machine.bootstrap({
        remoteDraft: buildRemoteDraftRecord({
          revision: 'rev-before-reload',
          draft: baselineDraft,
        }),
        canonicalNodeIds: ['node_1', 'node_2'],
        canonicalEdges: [{ sourceId: 'node_1', targetId: 'node_2' }],
      }),
      'node_2'
    );

    const reloadedSession = canvasDraftSession.machine.reloadFromRemote(
      dirtySession,
      buildRemoteDraftRecord({
        revision: 'rev-after-reload',
        draft: buildAuthoringDraft({
          canvas: {
            kind: 'transformation',
            title: 'Main canvas',
          },
          nodeIds: ['node_1', 'node_2', 'node_3'],
          nodePositions: {
            node_1: { x: 0, y: 0 },
            node_2: { x: 100, y: 0 },
            node_3: { x: 200, y: 0 },
          },
          edges: [
            { sourceId: 'node_1', targetId: 'node_2' },
            { sourceId: 'node_1', targetId: 'node_3' },
          ],
        }),
      })
    );

    expect(reloadedSession.workingSet.visibleNodeIds).toEqual(['node_1', 'node_3']);
    expect(reloadedSession.workingSet.visibleEdges).toEqual([
      { sourceId: 'node_1', targetId: 'node_3' },
    ]);
  });

  it('transitions to missing_remote when the persisted draft disappears', () => {
    const session = canvasDraftSession.machine.markRemoteDraftMissing(
      canvasDraftSession.machine.reloadFromRemote(
        canvasDraftSession.machine.createBootstrapping(),
        buildRemoteDraftRecord()
      )
    );

    expect(session.syncState).toBe('missing_remote');
    expect(session.draftRevision).toBeNull();
    expect(session.baseline.record).toBeNull();
  });

  it('preserves last authoritative visible canonical nodes when the persisted draft disappears', () => {
    const session = canvasDraftSession.machine.markRemoteDraftMissing(
      canvasDraftSession.machine.reloadFromRemote(
        canvasDraftSession.machine.createBootstrapping(),
        buildRemoteDraftRecord()
      ),
      {
        node_1: {
          id: 'node_1',
          name: 'orders',
          pluginId: 'dvt',
          kind: 'dvt:source',
          role: 'input',
          status: 'idle',
          tags: [],
        },
      }
    );

    expect(session.syncState).toBe('missing_remote');
    expect(session.localNodeCatalog).toEqual({
      node_1: expect.objectContaining({
        id: 'node_1',
        kind: 'dvt:source',
      }),
    });
  });

  it('adopts a reappeared persisted draft instead of merging remembered missing-remote nodes', () => {
    const missingRemoteSession = canvasDraftSession.machine.markRemoteDraftMissing(
      canvasDraftSession.machine.reloadFromRemote(
        canvasDraftSession.machine.createBootstrapping(),
        buildRemoteDraftRecord({
          draft: buildAuthoringDraft({
            canvas: {
              kind: 'transformation',
              title: 'Main canvas',
            },
            nodeIds: ['node_1'],
            nodePositions: {
              node_1: { x: 0, y: 0 },
            },
            edges: [],
          }),
        })
      ),
      {
        node_1: {
          id: 'node_1',
          name: 'orders',
          pluginId: 'dvt',
          kind: 'dvt:source',
          role: 'input',
          status: 'idle',
          tags: [],
        },
      }
    );

    const reloadedSession = canvasDraftSession.machine.reloadFromRemote(
      missingRemoteSession,
      buildRemoteDraftRecord({
        revision: 'rev-restored',
        draft: buildAuthoringDraft({
          canvas: {
            kind: 'transformation',
            title: 'Main canvas',
          },
          nodeIds: ['node_2'],
          nodePositions: {
            node_2: { x: 220, y: 120 },
          },
          edges: [],
        }),
      })
    );

    expect(reloadedSession.syncState).toBe('editing');
    expect(reloadedSession.draftRevision).toBe('rev-restored');
    expect(reloadedSession.workingSet.visibleNodeIds).toEqual(['node_2']);
    expect(reloadedSession.localNodeCatalog).toBeUndefined();
  });
});
