/** Owned concern: prove protected selection resolves source instances from the saved definition. */
import type { WorkspaceGraphAuthoringDraft } from '@dvt/contracts';
import { describe, expect, it } from 'vitest';

import { selectProtectedDvtTransforms } from '../../../src/application/services/dvtProtectedTransformSelection.js';
import { distinctDvtSourceDefinitions } from '../../../src/application/services/dvtSourceCoverage.js';

describe('protected source instance selection', () => {
  it('retains both selected identities while reading one protected configuration', () => {
    const definition = {
      id: 'source',
      name: 'Orders',
      kind: 'dvt:source',
      pluginId: 'dvt',
      role: 'input' as const,
      status: 'idle' as const,
      tags: [],
      metadata: { schema: 'raw', tableName: 'orders' },
    };
    const instances = ['first', 'second'].map((id) => ({
      ...definition,
      id,
      sourceDefinitionId: definition.id,
      metadata: undefined,
    }));
    const model = {
      id: 'model',
      name: 'Model',
      pluginId: 'dvt',
      kind: 'transform',
      role: 'transform' as const,
      status: 'idle' as const,
      tags: [],
    };
    const draft: WorkspaceGraphAuthoringDraft = {
      canvas: { kind: 'dvt', title: 'Canvas' },
      nodes: [definition, ...instances, model],
      nodeIds: ['first', 'second', 'model'],
      nodePositions: { first: { x: 0, y: 0 }, second: { x: 10, y: 0 }, model: { x: 20, y: 0 } },
      edges: instances.map((n) => ({
        id: n.id,
        sourceId: n.id,
        targetId: model.id,
        relation: 'lineage',
      })),
    };
    const selection = selectProtectedDvtTransforms({
      draft,
      selectedNodeIds: draft.nodeIds,
      selectedEdgeIds: ['first', 'second'],
    });
    expect(selection.sources.map((n) => n.id)).toEqual(['first', 'second']);
    expect(selection.sources.every((n) => n.metadata?.['schema'] === 'raw')).toBe(true);
    expect(distinctDvtSourceDefinitions(selection.sources.map((node) => ({ node })))).toHaveLength(
      1
    );
    expect(instances[0]?.metadata).toBeUndefined();
    expect(() =>
      selectProtectedDvtTransforms({
        draft: { ...draft, nodes: [...instances, model] },
        selectedNodeIds: draft.nodeIds,
        selectedEdgeIds: ['first', 'second'],
      })
    ).toThrow();
  });
});
