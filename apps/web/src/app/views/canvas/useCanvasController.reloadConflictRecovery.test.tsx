import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { WorkspaceGraphSnapshot } from '../../ports/workspace';
import {
  buildDraftReadOkResponse,
  buildProtectedDraftRecord,
  buildDraftSaveConflictResponse,
} from '../../services/workspace/workspaceGraphDraft.test.fixtures';
import {
  buildDraftRecord,
  createTransformationAuthoringHarness,
  type CanvasControllerHarness,
  WORKSPACE_LAYOUT_KEY,
  waitForAutosaveDebounce,
} from './useCanvasController.draftLifecycle.test.support';
import {
  createReloadRecoveryHarness,
  reloadLatestDraft,
} from './useCanvasController.reloadRecovery.test.support';

describe('useCanvasController reload conflict recovery', () => {
  let harness: CanvasControllerHarness;

  beforeEach(async () => {
    harness = await createReloadRecoveryHarness();
  });

  afterEach(() => {
    harness.cleanup();
  });

  it('does not overwrite the remote draft while reloading after a CAS conflict', async () => {
    let saveAttempts = 0;
    harness.cleanup();
    harness = await createTransformationAuthoringHarness();
    harness.state.services.workspaceGraphDraftAuthoringPort.saveGraphDraft = async () => {
      saveAttempts += 1;
      harness.state.graphDraftRecord = buildDraftRecord(
        {
          nodeIds: ['node_1', 'node_2', 'node_3'],
          nodePositions: {
            node_1: { x: 0, y: 0 },
            node_2: { x: 220, y: 120 },
            node_3: { x: 420, y: 120 },
          },
          edges: [
            { sourceId: 'node_1', targetId: 'node_2' },
            { sourceId: 'node_2', targetId: 'node_3' },
          ],
        },
        'rev-remote'
      );
      return buildDraftSaveConflictResponse(
        {
          tenantId: 'tenant-a',
          projectId: 'project-a',
          environmentId: 'dev',
        },
        { currentRevision: 'rev-remote' }
      );
    };

    await harness.renderProbe();
    await waitForAutosaveDebounce();

    expect(harness.getLatestResult()?.hasStaleDraftVersion).toBe(true);

    harness.state.graphDraftRecord = buildDraftRecord(
      {
        nodeIds: ['node_2'],
        nodePositions: {
          node_2: { x: 220, y: 120 },
        },
        edges: [],
      },
      'rev-remote'
    );
    await reloadLatestDraft(harness);

    expect(saveAttempts).toBe(1);
    expect(harness.state.queryClient.cancelQueries).toHaveBeenCalledWith({
      queryKey: ['workspace', 'graph-draft', WORKSPACE_LAYOUT_KEY],
    });
    expect(harness.state.queryClient.cancelQueries).toHaveBeenCalledWith({
      queryKey: ['workspace', 'graph', WORKSPACE_LAYOUT_KEY],
    });
    expect(harness.state.queryClient.fetchQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ['workspace', 'graph-draft', WORKSPACE_LAYOUT_KEY],
      })
    );
    expect(harness.state.queryClient.fetchQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ['workspace', 'graph', WORKSPACE_LAYOUT_KEY],
      })
    );
    expect(harness.getLatestResult()?.hasStaleDraftVersion).toBe(false);
    expect(harness.getLatestResult()?.nodesWithImpact.map((node) => node.id)).toEqual(['node_2']);
  });

  it('reloads from the typed authoring port instead of bypassing through the injected graph-draft cache state', async () => {
    harness.cleanup();
    harness = await createTransformationAuthoringHarness();
    harness.state.graphDraftRecord = buildDraftRecord(
      {
        nodeIds: ['node_2'],
        nodePositions: {
          node_2: { x: 220, y: 120 },
        },
        edges: [],
      },
      'rev-stale'
    );
    harness.state.canonicalNodes = [
      ...harness.state.canonicalNodes,
      {
        id: 'node_4',
        name: 'remote_sink',
        pluginId: 'dvt',
        kind: 'dvt:sink',
        role: 'output',
        status: 'idle',
        tags: [],
        metadata: {
          config: {
            schema: 'analytics',
            table: 'remote_sink',
            materialization: 'table',
            writeMode: 'replace',
          },
        },
      },
    ];
    harness.state.canonicalEdges = [
      ...harness.state.canonicalEdges,
      {
        id: 'edge_remote',
        sourceId: 'node_2',
        targetId: 'node_4',
        relation: 'lineage',
      },
    ];
    harness.state.graphData = {
      nodes: [{ id: 'node_1' }, { id: 'node_2' }, { id: 'node_3' }, { id: 'node_4' }],
      edges: [{ id: 'edge_1' }, { id: 'edge_2' }, { id: 'edge_remote' }],
    };
    harness.state.services.workspaceGraphDraftAuthoringPort.readGraphDraft = vi.fn(async () =>
      buildDraftReadOkResponse(
        {
          tenantId: 'tenant-a',
          projectId: 'project-a',
          environmentId: 'dev',
        },
        {
          record: buildProtectedDraftRecord(
            {
              tenantId: 'tenant-a',
              projectId: 'project-a',
              environmentId: 'dev',
            },
            {
              revision: 'rev-remote',
              draft: {
                context: {
                  tenantId: 'tenant-a',
                  projectId: 'project-a',
                  environmentId: 'dev',
                  executionTarget: 'postgres',
                },
                nodes: [
                  {
                    id: 'node_2',
                    type: 'sql_transform',
                    payload: {
                      dialect: 'postgres',
                      sqlArtifact: {
                        repo: 'dunay2/dvt',
                        path: 'models/transform.sql',
                        ref: 'refs/heads/main',
                        commitSha: 'remote',
                        contentSha256: 'c'.repeat(64),
                      },
                      entrypoint: 'models/transform.sql',
                    },
                  },
                  {
                    id: 'node_4',
                    type: 'sink',
                    payload: {
                      kind: 'postgres_table',
                      schema: 'analytics',
                      table: 'remote_sink',
                      materialization: 'table',
                      writeMode: 'replace',
                    },
                  },
                ],
                edges: [{ fromNodeId: 'node_2', toNodeId: 'node_4' }],
              },
              updatedAt: '2026-04-18T00:00:05Z',
            }
          ),
        }
      )
    );

    await reloadLatestDraft(harness);

    expect(harness.state.services.workspaceGraphDraftAuthoringPort.readGraphDraft).toHaveBeenCalled();
    expect(harness.getLatestResult()?.nodesWithImpact.map((node) => node.id)).toEqual([
      'node_2',
      'node_4',
    ]);
    expect(harness.getLatestResult()?.edges).toEqual([
      { id: 'edge_remote', source: 'node_2', target: 'node_4' },
    ]);
  });

  it('reloads against a fresh graph snapshot so remote draft nodes are not truncated by stale local canon', async () => {
    harness.state.graphDraftRecord = buildDraftRecord(
      {
        nodeIds: ['node_1', 'node_3'],
        nodePositions: {
          node_1: { x: 0, y: 0 },
          node_3: { x: 220, y: 120 },
        },
        edges: [{ sourceId: 'node_1', targetId: 'node_3' }],
      },
      'rev-remote',
      '2026-04-17T00:00:01Z'
    );
    harness.state.services.workspaceService.getGraphSnapshot = vi.fn(async () => {
      harness.state.canonicalNodes = [
        ...harness.state.canonicalNodes,
        {
          id: 'node_3',
          name: 'src_erp_orders',
          pluginId: 'dbt',
          kind: 'dbt:model',
          role: 'transform',
          status: 'idle',
          tags: [],
        },
      ];
      harness.state.canonicalEdges = [
        ...harness.state.canonicalEdges,
        {
          id: 'edge_imported',
          sourceId: 'node_1',
          targetId: 'node_3',
          relation: 'lineage',
        },
      ];

      const graphSnapshot: WorkspaceGraphSnapshot = {
        nodes: [
          {
            id: 'node_1',
            name: 'orders',
            type: 'MODEL',
            package: 'analytics',
            path: 'models/orders.sql',
            tags: [],
            status: 'idle',
            dependencies: [],
          },
          {
            id: 'node_2',
            name: 'customers',
            type: 'MODEL',
            package: 'analytics',
            path: 'models/customers.sql',
            tags: [],
            status: 'idle',
            dependencies: ['node_1'],
          },
          {
            id: 'node_3',
            name: 'src_erp_orders',
            type: 'MODEL',
            package: 'analytics',
            path: 'models/src_erp_orders.sql',
            tags: [],
            status: 'idle',
            dependencies: ['node_1'],
          },
        ],
        edges: [
          {
            id: 'edge_1',
            source: 'node_1',
            target: 'node_2',
            type: 'ref',
          },
          {
            id: 'edge_imported',
            source: 'node_1',
            target: 'node_3',
            type: 'ref',
          },
        ],
      };

      return graphSnapshot;
    });

    await harness.renderProbe();
    await reloadLatestDraft(harness);

    expect(harness.state.services.workspaceService.getGraphSnapshot).toHaveBeenCalledTimes(1);
    expect(harness.getLatestResult()?.nodesWithImpact.map((node) => node.id)).toEqual([
      'node_1',
      'node_3',
    ]);
    expect(harness.getLatestResult()?.edges).toEqual([
      { id: 'edge_imported', source: 'node_1', target: 'node_3' },
    ]);
  });
});
