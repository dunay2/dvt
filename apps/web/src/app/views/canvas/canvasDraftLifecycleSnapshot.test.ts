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
    kind: overrides.kind ?? 'dbt:model',
    role: overrides.role ?? 'transform',
    status: overrides.status ?? 'idle',
    tags: overrides.tags ?? ['authoring'],
    metadata: overrides.metadata,
  };
}

describe('canvas draft lifecycle snapshot', () => {
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
      pluginId: 'dbt',
      kind: 'dbt:model',
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
      [
        { id: 'warehouse-source', position: { x: 120, y: 80 } },
        { id: 'dbt-model-1', position: { x: 420, y: 80 } },
      ],
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
});
