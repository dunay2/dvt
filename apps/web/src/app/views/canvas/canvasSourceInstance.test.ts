/** Owned concern: prove source identity, shared configuration and persisted placement semantics. */
import { describe, expect, it } from 'vitest';
import { WorkspaceGraphAuthoringDraftSchema } from '@dvt/contracts';
import type { CanonicalNode } from '../../types/canonical';
import { createCanvasSourceInstance } from './canvasSourceInstance';
import { buildCanvasAuthoringDraft } from './canvasDraftAuthoring';
import { projectWorkspaceGraphAuthoringDraftSemanticGraph } from '../../services/workspace/workspaceGraphDraftProjection';
import { buildCanvasAuthoringGraphProjection } from './canvasAuthoringGraphProjection';

const source: CanonicalNode = {
  id: 'source',
  name: 'orders',
  pluginId: 'dvt.warehouse-source',
  kind: 'dvt:source',
  role: 'input',
  status: 'idle',
  tags: [],
  metadata: { config: { schema: 'raw', table: 'orders' } },
};
describe('Canvas source instances', () => {
  it('persists two independent placements but one configuration, then resolves latest edits after reload', () => {
    const first = createCanvasSourceInstance(source, new Set(), 'first');
    const second = createCanvasSourceInstance(source, new Set([first.name]), 'second');
    expect([first.name, second.name]).toEqual(['orders', 'orders 2']);
    const draft = buildCanvasAuthoringDraft({
      canvas: { kind: 'dvt', title: 'Canvas' },
      nodeIds: ['first', 'second'],
      nodePositions: { first: { x: 0, y: 0 }, second: { x: 100, y: 100 } },
      visibleEdges: [],
      canonicalNodes: [source, first, second],
      canonicalEdges: [],
    });
    expect(WorkspaceGraphAuthoringDraftSchema.safeParse(draft).success).toBe(true);
    expect(draft.nodes.filter((n) => n.metadata != null)).toHaveLength(1);
    const graph = projectWorkspaceGraphAuthoringDraftSemanticGraph(
      JSON.parse(JSON.stringify(draft))
    );
    expect(graph.canonicalNodes.find((n) => n.id === 'second')?.metadata).toEqual(source.metadata);
    const changed = { ...source, metadata: { config: { schema: 'new', table: 'orders' } } };
    const projection = buildCanvasAuthoringGraphProjection({
      visibleNodeIds: ['first', 'second'],
      visibleEdges: [],
      draftSemanticGraph: graph,
      localCanonicalNodes: [changed],
    });
    expect(projection.canonicalNodesById.get('first')?.metadata).toBe(changed.metadata);
    expect(projection.canonicalNodesById.get('second')?.metadata).toBe(changed.metadata);
    const removed = buildCanvasAuthoringGraphProjection({
      visibleNodeIds: ['second'],
      visibleEdges: [],
      draftSemanticGraph: graph,
      localCanonicalNodes: [],
    });
    expect(removed.canonicalNodes.map((n) => n.id)).toEqual(['second', 'source']);
  });
});
