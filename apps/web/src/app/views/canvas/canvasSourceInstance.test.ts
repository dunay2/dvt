/** Owned concern: prove source identity, shared configuration and persisted placement semantics. */
import { afterEach, describe, expect, it, vi } from 'vitest';
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
  afterEach(() => vi.unstubAllGlobals());

  it('allocates a secure placement identity when the browser has no randomUUID API', () => {
    vi.stubGlobal('crypto', {
      getRandomValues: (bytes: Uint8Array): Uint8Array => bytes.fill(0),
    });
    const instance = createCanvasSourceInstance(source, new Set());
    expect(instance.id).toBe('00000000-0000-4000-8000-000000000000');
    expect(instance.sourceDefinitionId).toBe(source.id);
    expect(instance.metadata).toBe(source.metadata);
  });

  it('rejects placement creation when secure entropy is unavailable', () => {
    vi.stubGlobal('crypto', undefined);
    expect(() => createCanvasSourceInstance(source, new Set())).toThrow(
      'CRYPTO_SECURE_RANDOM_UNAVAILABLE'
    );
  });

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
