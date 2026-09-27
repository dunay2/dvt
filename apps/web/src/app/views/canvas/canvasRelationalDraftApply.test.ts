/** Apply persists the edited document; it never silently authors a replacement. */
import { describe, expect, it, vi } from 'vitest';
import { graphJoin, graphModel } from './canvasRelationGraph.test-support';
import { useCanvasRelationalTreeApplyCommand } from './useCanvasRelationalTreeApplyCommand';

describe('canonical draft apply', () => {
  it.each(['projection', 'union_all'] as const)(
    'rejects missing %s documents instead of inventing one',
    (operation) => {
      const transformNode = graphModel();
      const onApplyNodeDraft = vi.fn();
      const apply = useCanvasRelationalTreeApplyCommand({
        editable: true,
        authoring: { canEditNode: true, onApplyNodeDraft },
        transformNode,
        operation,
        joinDraft: null,
        reject: vi.fn(),
        reset: vi.fn(),
      });
      expect(apply().outcome).toBe('rejected');
      expect(onApplyNodeDraft).not.toHaveBeenCalled();
    }
  );

  it('persists an incomplete graph DTO without inventing semantic authority', () => {
    const transformNode = graphModel();
    const onApplyNodeDraft = vi.fn(() => ({ outcome: 'no_changes' as const }));
    const relationalAuthoringDraft = {
      version: 'v1' as const,
      sources: [],
      operations: [
        {
          relationId: 'pending-operation:join',
          operation: 'inner_join' as const,
          inputs: [null, null],
        },
      ],
      outputRelationId: null,
      positions: {},
    };
    const apply = useCanvasRelationalTreeApplyCommand({
      editable: true,
      authoring: { canEditNode: true, onApplyNodeDraft },
      transformNode,
      operation: null,
      joinDraft: null,
      relationalAuthoringDraft,
      reject: vi.fn(),
      reset: vi.fn(),
    });

    expect(apply().outcome).toBe('no_changes');
    expect(onApplyNodeDraft).toHaveBeenCalledWith(
      transformNode.id,
      expect.objectContaining({ relationalAuthoringDraft })
    );
  });

  it('preserves an existing semantic producer with its incomplete consumer graph', () => {
    const { document, session } = graphJoin();
    const transformNode = graphModel(document);
    const onApplyNodeDraft = vi.fn(() => ({ outcome: 'no_changes' as const }));
    const relationalAuthoringDraft = {
      version: 'v1' as const,
      sources: [],
      operations: [
        {
          relationId: 'pending-operation:aggregate',
          operation: 'aggregate' as const,
          inputs: [session.rootId],
        },
      ],
      outputRelationId: 'pending-operation:aggregate',
      positions: {},
    };
    const apply = useCanvasRelationalTreeApplyCommand({
      editable: true,
      authoring: { canEditNode: true, onApplyNodeDraft },
      transformNode,
      operation: 'inner_join',
      joinDraft: document,
      relationalAuthoringDraft,
      reject: vi.fn(),
      reset: vi.fn(),
    });

    expect(apply().outcome).toBe('no_changes');
    expect(onApplyNodeDraft).toHaveBeenCalledWith(
      transformNode.id,
      expect.objectContaining({
        dvt: expect.objectContaining({ mode: 'substrait', shape: 'inner_join' }),
        relationalAuthoringDraft,
      })
    );
  });
});
