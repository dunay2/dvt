import { describe, expect, it } from 'vitest';

import type { CanonicalNode } from '../../types/canonical';
import type { CanvasDraftSession } from './canvasDraftSession';
import {
  buildCurrentDraftPayload,
  isCurrentDraftProjectable,
} from './canvasDraftLifecycleSnapshot';

function buildNode(overrides: Partial<CanonicalNode> & Pick<CanonicalNode, 'id'>): CanonicalNode {
  return {
    id: overrides.id,
    name: overrides.name ?? overrides.id,
    pluginId: overrides.pluginId ?? 'dbt',
    kind: overrides.kind ?? 'dvt:transform',
    role: overrides.role ?? 'transform',
    status: overrides.status ?? 'idle',
    tags: overrides.tags ?? ['authoring'],
    metadata: overrides.metadata,
  };
}

describe('canvas draft lifecycle snapshot', () => {
  it('persists an unplaced model definition referenced by visible instances', () => {
    const definition = buildNode({ id: 'definition' });
    const instances = ['first', 'second'].map((id) => ({
      ...buildNode({ id }),
      definitionId: definition.id,
    }));
    const draftSession: CanvasDraftSession = {
      syncState: 'editing',
      baseline: { record: null },
      draftRevision: 'rev-1',
      workingSet: {
        visibleNodeIds: ['first', 'second'],
        visibleEdges: [],
        pendingExplicitNodeIds: [],
      },
      localNodeCatalog: Object.fromEntries(
        [definition, ...instances].map((node) => [node.id, node])
      ),
    };
    const payload = buildCurrentDraftPayload(
      { first: { x: 100, y: 100 }, second: { x: 300, y: 100 } },
      draftSession,
      { kind: 'transformation', title: 'Canvas' },
      null,
      [],
      []
    );
    expect(payload.nodes.map((node) => node.id)).toEqual(
      expect.arrayContaining(['definition', 'first', 'second'])
    );
    expect(payload.nodeIds).toEqual(['first', 'second']);
    expect(payload.edges).toEqual([]);
    expect(isCurrentDraftProjectable(payload, draftSession)).toBe(true);
    expect(
      isCurrentDraftProjectable(
        { ...payload, nodes: [...payload.nodes, buildNode({ id: 'unrelated-hidden-model' })] },
        draftSession
      )
    ).toBe(false);
  });

  it.each([
    { kind: 'dvt:source', role: 'input' },
    { kind: 'dvt:transform', role: 'transform' },
  ] as const)('persists a registered $role without a placed card', ({ kind, role }) => {
    const definition = buildNode({ id: 'registered', pluginId: 'dvt', kind, role });
    const draftSession: CanvasDraftSession = {
      syncState: 'editing',
      baseline: { record: null },
      draftRevision: 'rev-1',
      workingSet: { visibleNodeIds: [], visibleEdges: [], pendingExplicitNodeIds: [] },
      localNodeCatalog: { [definition.id]: { ...definition, name: 'Configured definition' } },
    };
    const payload = buildCurrentDraftPayload(
      {},
      draftSession,
      { kind: 'transformation', title: 'Canvas' },
      null,
      [definition],
      []
    );
    expect(payload.nodeIds).toEqual([]);
    expect(payload.nodePositions).toEqual({});
    expect(payload.nodes).toEqual([
      expect.objectContaining({ id: definition.id, name: 'Configured definition' }),
    ]);
    expect(isCurrentDraftProjectable(payload, draftSession)).toBe(true);
    expect(
      isCurrentDraftProjectable(payload, {
        ...draftSession,
        localNodeCatalog: undefined,
        baseline: {
          record: { draft: payload, revision: 'confirmed', savedAt: '2026-11-04T00:00:00Z' },
        },
      })
    ).toBe(true);
  });

  it('projects locally authored catalog nodes into the persisted graph draft payload', () => {
    const sourceNode = buildNode({
      id: 'warehouse-source',
      name: 'Postgres public',
      pluginId: 'dvt.warehouse-source',
      kind: 'dvt:source',
      role: 'input',
      tags: ['source', 'public'],
    });
    const localModelNode = buildNode({
      id: 'dbt-model-1',
      name: 'Model 1',
      pluginId: 'dvt',
      kind: 'dvt:transform',
      role: 'transform',
    });
    const draftSession: CanvasDraftSession = {
      syncState: 'editing',
      baseline: { record: null },
      draftRevision: 'rev-1',
      workingSet: {
        visibleNodeIds: ['warehouse-source', 'dbt-model-1'],
        visibleEdges: [{ sourceId: 'warehouse-source', targetId: 'dbt-model-1' }],
        pendingExplicitNodeIds: [],
      },
      localNodeCatalog: {
        'dbt-model-1': localModelNode,
      },
    };

    const payload = buildCurrentDraftPayload(
      {
        'warehouse-source': { x: 120, y: 80 },
        'dbt-model-1': { x: 420, y: 80 },
      },
      draftSession,
      { kind: 'dbt', title: 'dbt canvas' },
      null,
      [sourceNode],
      []
    );

    expect(payload.nodeIds).toEqual(['warehouse-source', 'dbt-model-1']);
    expect(payload.nodes.map((node) => node.id)).toEqual(['warehouse-source', 'dbt-model-1']);
    expect(payload.edges).toEqual([
      expect.objectContaining({ sourceId: 'warehouse-source', targetId: 'dbt-model-1' }),
    ]);
    expect(isCurrentDraftProjectable(payload, draftSession)).toBe(true);
  });

  it('persists a local replacement instead of the stale canonical node with the same identity', () => {
    const canonical = buildNode({ id: 'transform-1', name: 'Before' });
    const replacement = buildNode({
      id: canonical.id,
      name: 'After',
      metadata: { transformAuthoring: { mode: 'substrait' } },
    });
    const draftSession: CanvasDraftSession = {
      syncState: 'editing',
      baseline: { record: null },
      draftRevision: 'rev-1',
      workingSet: {
        visibleNodeIds: [canonical.id],
        visibleEdges: [],
        pendingExplicitNodeIds: [],
      },
      localNodeCatalog: { [canonical.id]: replacement },
    };

    const payload = buildCurrentDraftPayload(
      { [canonical.id]: { x: 120, y: 80 } },
      draftSession,
      { kind: 'transformation', title: 'Transform canvas' },
      null,
      [canonical],
      []
    );

    expect(payload.nodes).toEqual([expect.objectContaining({ name: 'After' })]);
    expect(payload.nodes[0]?.metadata).toEqual(replacement.metadata);
  });
});
