import { describe, expect, it } from 'vitest';

import {
  buildCanvasAuthoringDraft,
  canPersistWorkspaceGraphAuthoringDraft,
  serializeCanvasDraftAuthoringBaselineSignature,
  serializeCanvasDraftAuthoringSignature,
} from './canvasDraftAuthoring';
import { buildAuthoringDraft, buildSaveInput } from './canvasDraftRepository.test.fixtures';
import type { CanonicalNode } from '../../types/canonical';

function toCanonicalNodes(draft: ReturnType<typeof buildAuthoringDraft>): CanonicalNode[] {
  return draft.nodes.map((node) => ({
    ...node,
    kind: `${node.pluginId}:${node.kind}`,
  })) as CanonicalNode[];
}

describe('canvasDraftAuthoring', () => {
  it('rejects authoring draft builds that reference unknown canonical nodes', () => {
    const draft = buildAuthoringDraft();
    expect(() => {
      buildCanvasAuthoringDraft({
        canvas: draft.canvas,
        nodeIds: draft.nodeIds,
        nodePositions: draft.nodePositions,
        visibleEdges: draft.edges,
        canonicalNodes: toCanonicalNodes(draft).filter((node) => node.id !== 'sink-node'),
        canonicalEdges: draft.edges,
      });
    }).toThrow('Workspace graph draft references unknown node sink-node.');
  });

  it('changes the persistence signature when canonical node details change', () => {
    const draft = buildSaveInput().draft;
    const editedDraft = {
      ...draft,
      nodes: draft.nodes.map((node) =>
        node.id === 'source-node'
          ? {
              ...node,
              name: 'Edited source',
              description: 'Edited through Inspector',
            }
          : node
      ),
    };

    expect(serializeCanvasDraftAuthoringSignature(editedDraft)).not.toBe(
      serializeCanvasDraftAuthoringSignature(draft)
    );
  });

  it('stores authoring node kinds as plugin-local kinds', () => {
    const draft = buildAuthoringDraft();

    const result = buildCanvasAuthoringDraft({
      canvas: draft.canvas,
      nodeIds: draft.nodeIds,
      nodePositions: draft.nodePositions,
      visibleEdges: draft.edges,
      canonicalNodes: toCanonicalNodes(draft),
      canonicalEdges: draft.edges,
    });

    expect(result.nodes.map((node) => node.kind)).toEqual(['source', 'sql_transform', 'sink']);
  });

  it('keeps the persistence signature stable for layout-only position changes', () => {
    const draft = buildSaveInput().draft;
    const layoutOnlyDraft = {
      ...draft,
      nodePositions: {
        ...draft.nodePositions,
        'source-node': { x: 640, y: 480 },
      },
    };

    expect(serializeCanvasDraftAuthoringSignature(layoutOnlyDraft)).toBe(
      serializeCanvasDraftAuthoringSignature(draft)
    );
  });

  it('keeps the persistence signature stable when edge transport order changes only', () => {
    const draft = buildSaveInput().draft;
    const reorderedEdgesDraft = {
      ...draft,
      edges: [...draft.edges].reverse(),
    };

    expect(serializeCanvasDraftAuthoringSignature(reorderedEdgesDraft)).toBe(
      serializeCanvasDraftAuthoringSignature(draft)
    );
  });

  it('uses the same semantic signature policy for remote draft baselines', () => {
    const draft = buildSaveInput().draft;

    expect(
      serializeCanvasDraftAuthoringBaselineSignature({
        record: {
          revision: 'rev-1',
          savedAt: '2026-04-25T00:00:00Z',
          draft,
        },
      })
    ).toBe(serializeCanvasDraftAuthoringSignature(draft));
  });

  it('returns false for structurally invalid authoring drafts without throwing', () => {
    const draft = buildSaveInput().draft;
    let result: boolean | undefined;

    expect(
      () =>
        (result = canPersistWorkspaceGraphAuthoringDraft({
          ...draft,
          nodePositions: {},
        }))
    ).not.toThrow();
    expect(result).toBe(false);
  });

  it('omits non-serializable metadata from semantic signatures without throwing', () => {
    const draft = buildSaveInput().draft;
    const metadata: Record<string, unknown> = {
      config: {
        schema: 'raw',
      },
      onInspect: () => 'not serializable',
      token: Symbol('not serializable'),
      amount: BigInt(1),
    };
    metadata.self = metadata;

    const signature = serializeCanvasDraftAuthoringSignature({
      ...draft,
      nodes: draft.nodes.map((node) =>
        node.id === 'source-node'
          ? {
              ...node,
              metadata,
            }
          : node
      ),
    });

    expect(signature).toContain('"config":{"schema":"raw"}');
    expect(signature).not.toContain('onInspect');
    expect(signature).not.toContain('token');
    expect(signature).not.toContain('amount');
    expect(signature).not.toContain('self');
  });
});
