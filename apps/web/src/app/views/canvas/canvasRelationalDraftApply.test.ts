/** Apply persists the edited document; it never silently authors a replacement. */
import { describe, expect, it, vi } from 'vitest';
import { graphJoin, graphModel } from './canvasRelationGraph.test-support';
import { encodeDvtSubstraitSemanticDocument } from './canvasDvtSubstraitSemanticDocument';
import { useCanvasRelationalTreeApplyCommand } from './useCanvasRelationalTreeApplyCommand';
import type { CanvasInspectorNodeDraft } from './canvasInspectorAuthoring.types';
import {
  areCanvasInspectorNodeDraftsEqual,
  canonicalizeCanvasInspectorNodeDraft,
  createCanvasInspectorNodeDraft,
} from './canvasInspectorAuthoringModel';

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
    const onApplyNodeDraft = vi.fn((_id: string, _draft: CanvasInspectorNodeDraft) => ({
      outcome: 'no_changes' as const,
    }));
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

  it('clears semantic authority when the final producer is explicitly removed', () => {
    const { document } = graphJoin();
    const transformNode = graphModel(document);
    const onApplyNodeDraft = vi.fn(() => ({ outcome: 'no_changes' as const }));
    const apply = useCanvasRelationalTreeApplyCommand({
      editable: true,
      authoring: { canEditNode: true, onApplyNodeDraft },
      transformNode,
      operation: null,
      joinDraft: null,
      relationalAuthoringDraft: null,
      cleared: true,
      reject: vi.fn(),
      reset: vi.fn(),
    });

    expect(apply().outcome).toBe('no_changes');
    expect(onApplyNodeDraft).toHaveBeenCalledWith(
      transformNode.id,
      expect.objectContaining({
        dvt: expect.objectContaining({ mode: 'uninitialized' }),
        relationalAuthoringDraft: null,
      })
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

  it('promotes a configured output operation to the transform semantic authority', () => {
    const { document, session } = graphJoin();
    const transformNode = graphModel();
    const onApplyNodeDraft = vi.fn((_id: string, _draft: CanvasInspectorNodeDraft) => ({
      outcome: 'no_changes' as const,
    }));
    const semanticDocument = encodeDvtSubstraitSemanticDocument(document);
    const relationalAuthoringDraft = {
      version: 'v1' as const,
      sources: [],
      operations: [
        {
          relationId: session.rootId,
          operation: 'inner_join' as const,
          inputs: ['left', 'right'] as [string, string],
          semanticDocument,
        },
      ],
      outputRelationId: session.rootId,
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
    const saved = onApplyNodeDraft.mock.calls[0]?.[1];
    expect(saved?.dvt).toEqual(
      expect.objectContaining({
        mode: 'substrait',
        shape: 'inner_join',
        plan: document.plan,
        sidecar: expect.objectContaining({
          semanticPlanSha256: semanticDocument.semanticPlan.sha256,
        }),
      })
    );
    expect(saved?.relationalAuthoringDraft).toMatchObject({
      sources: [],
      operations: [],
      outputRelationId: session.rootId,
    });
    expect(
      areCanvasInspectorNodeDraftsEqual(
        createCanvasInspectorNodeDraft(transformNode),
        canonicalizeCanvasInspectorNodeDraft(transformNode, saved!)
      )
    ).toBe(false);
  });
});
