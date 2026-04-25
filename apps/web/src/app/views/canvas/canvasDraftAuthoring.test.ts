import { describe, expect, it } from 'vitest';

import {
  canPersistCanvasDraftAuthoringPayload,
  serializeCanvasDraftAuthoringBaselineSignature,
  serializeCanvasDraftAuthoringSignature,
} from './canvasDraftAuthoring';
import { buildSaveInput } from './canvasDraftRepository.test.fixtures';

describe('canvasDraftAuthoring', () => {
  it('returns false instead of throwing when projected drafts reference unknown canonical nodes', () => {
    const payload = buildSaveInput().draft;
    let result: boolean | undefined;

    expect(() => {
      result = canPersistCanvasDraftAuthoringPayload({
        ...payload,
        canonicalNodes: payload.canonicalNodes.filter((node) => node.id !== 'sink-node'),
      });
    }).not.toThrow();

    expect(result).toBe(false);
  });

  it('changes the persistence signature when canonical node details change', () => {
    const payload = buildSaveInput().draft;
    const editedPayload = {
      ...payload,
      canonicalNodes: payload.canonicalNodes.map((node) =>
        node.id === 'source-node'
          ? {
              ...node,
              name: 'Edited source',
              description: 'Edited through Inspector',
            }
          : node
      ),
    };

    expect(serializeCanvasDraftAuthoringSignature(editedPayload)).not.toBe(
      serializeCanvasDraftAuthoringSignature(payload)
    );
  });

  it('keeps the persistence signature stable for layout-only position changes', () => {
    const payload = buildSaveInput().draft;
    const layoutOnlyPayload = {
      ...payload,
      projectedDraft: {
        ...payload.projectedDraft,
        nodePositions: {
          ...payload.projectedDraft.nodePositions,
          'source-node': { x: 640, y: 480 },
        },
      },
    };

    expect(serializeCanvasDraftAuthoringSignature(layoutOnlyPayload)).toBe(
      serializeCanvasDraftAuthoringSignature(payload)
    );
  });

  it('keeps the persistence signature stable when edge transport order changes only', () => {
    const payload = buildSaveInput().draft;
    const reorderedEdgesPayload = {
      ...payload,
      projectedDraft: {
        ...payload.projectedDraft,
        edges: [...payload.projectedDraft.edges].reverse(),
      },
    };

    expect(serializeCanvasDraftAuthoringSignature(reorderedEdgesPayload)).toBe(
      serializeCanvasDraftAuthoringSignature(payload)
    );
  });

  it('uses the same semantic signature policy for remote draft baselines', () => {
    const payload = buildSaveInput().draft;

    expect(
      serializeCanvasDraftAuthoringBaselineSignature({
        record: {
          revision: 'rev-1',
          savedAt: '2026-04-25T00:00:00Z',
          draft: payload.projectedDraft,
        },
        semanticGraph: {
          canonicalNodes: payload.canonicalNodes,
          canonicalEdges: payload.canonicalEdges,
        },
      })
    ).toBe(serializeCanvasDraftAuthoringSignature(payload));
  });

  it('serializes missing canonical node references without throwing', () => {
    const payload = buildSaveInput().draft;

    expect(() =>
      serializeCanvasDraftAuthoringSignature({
        ...payload,
        canonicalNodes: payload.canonicalNodes.filter((node) => node.id !== 'source-node'),
      })
    ).not.toThrow();
  });

  it('omits non-serializable metadata from semantic signatures without throwing', () => {
    const payload = buildSaveInput().draft;
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
      ...payload,
      canonicalNodes: payload.canonicalNodes.map((node) =>
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
