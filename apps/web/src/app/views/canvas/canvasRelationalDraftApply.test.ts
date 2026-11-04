/** Apply persists the edited document; it never silently authors a replacement. */
import { DVT_RELATIONAL_AUTHORING_DRAFT_METADATA_KEY } from '@dvt/contracts';
import { describe, expect, it, vi } from 'vitest';
import { graphJoin, graphModel } from './canvasRelationGraph.test-support';
import { encodeDvtSubstraitSemanticDocument } from './canvasDvtSubstraitSemanticDocument';
import { createCanvasRelationalTreeApplyCommand } from './canvasRelationalTreeApplyCommand';
import { prepareCanvasRelationalTreeApply } from './canvasRelationalTreeApplyDraft';
import type { CanvasInspectorNodeDraft } from './canvasInspectorAuthoring.types';
import {
  areCanvasInspectorNodeDraftsEqual,
  canonicalizeCanvasInspectorNodeDraft,
  createCanvasInspectorNodeDraft,
} from './canvasInspectorAuthoringModel';
import { createCanvasRelationalAuthoringDraft } from './canvasRelationalAuthoringDraft';
import { createPendingSourceOccurrence } from './relational-source-occurrence/pendingSourceOccurrence';
import { occurrenceInput } from './relational-source-occurrence/occurrence.test.fixtures';

describe('canonical draft apply', () => {
  it.each(['moved', 'retained'] as const)(
    'does not treat %s layout as an unapplied semantic edit after restoration',
    (layout) => {
      const { document, session } = graphJoin();
      const source = createPendingSourceOccurrence({
        ...occurrenceInput.source,
        fields: occurrenceInput.fields.map((name) => ({
          name,
          dataType: 'bigint',
          joinDataType: 'i64',
        })),
      });
      const positions = new Map([[source.read.binding.relationId, { x: 80, y: 120 }]]);
      const pending = {
        sources: [source],
        operations: [],
        outputRelationId: session.rootId,
        positions,
      };
      const model = graphModel(document);
      const transformNode = {
        ...model,
        metadata: {
          ...model.metadata,
          [DVT_RELATIONAL_AUTHORING_DRAFT_METADATA_KEY]:
            createCanvasRelationalAuthoringDraft(pending),
        },
      };
      const before = JSON.stringify(transformNode);
      const args = {
        transformNode,
        active: true,
        joinDraft: document,
        operation: 'inner_join' as const,
        hasSelectedInputs: true,
        pending,
        baselineOutputId: session.rootId,
        semanticRootId: session.rootId,
      };
      expect(prepareCanvasRelationalTreeApply(args).hasDraftChanges).toBe(false);
      const retainedPositions = new Map(positions);
      retainedPositions.set(
        layout === 'moved' ? source.read.binding.relationId : 'discarded-edit-position',
        { x: 240, y: 360 }
      );
      const prepared = prepareCanvasRelationalTreeApply({
        ...args,
        pending: { ...pending, positions: retainedPositions },
      });
      expect(prepared.hasDraftChanges).toBe(false);
      expect(prepared.request.relationalAuthoringDraft?.positions).toEqual(
        Object.fromEntries(retainedPositions)
      );
      expect(
        prepareCanvasRelationalTreeApply({
          ...args,
          pending: { ...pending, sources: [{ ...source, initialOutputFieldIds: [] }] },
        }).hasDraftChanges
      ).toBe(true);
      expect(
        prepareCanvasRelationalTreeApply({
          ...args,
          pending: { ...pending, outputRelationId: null },
        }).hasDraftChanges
      ).toBe(true);
      expect(JSON.stringify(transformNode)).toBe(before);
    }
  );

  it('does not clear an untouched session but detects an explicitly cleared model', () => {
    const { document, session } = graphJoin();
    const args = {
      transformNode: graphModel(document),
      active: false,
      joinDraft: null,
      operation: null,
      hasSelectedInputs: false,
      pending: { sources: [], operations: [], outputRelationId: null, positions: new Map() },
      baselineOutputId: session.rootId,
      semanticRootId: session.rootId,
    };
    const untouched = prepareCanvasRelationalTreeApply({
      ...args,
      pending: { ...args.pending, outputRelationId: session.rootId },
    });
    expect(untouched).toMatchObject({
      cleared: false,
      hasIncompleteGraph: false,
      hasDraftChanges: false,
    });
    const cleared = prepareCanvasRelationalTreeApply({ ...args, active: true });
    expect(cleared.cleared).toBe(true);
    expect(cleared.hasDraftChanges).toBe(true);
    expect(cleared.request.relationalAuthoringDraft).toBeNull();
  });

  it('retains an explicit output disconnection without clearing its canonical producer', () => {
    const { document, session } = graphJoin();
    const prepared = prepareCanvasRelationalTreeApply({
      transformNode: graphModel(document),
      active: true,
      joinDraft: document,
      operation: 'inner_join',
      hasSelectedInputs: true,
      pending: { sources: [], operations: [], outputRelationId: null, positions: new Map() },
      baselineOutputId: session.rootId,
      semanticRootId: session.rootId,
    });
    expect(prepared).toMatchObject({
      cleared: false,
      hasIncompleteGraph: true,
      hasDraftChanges: true,
    });
    expect(prepared.request.relationalAuthoringDraft).toMatchObject({
      outputRelationId: null,
      sources: [],
      operations: [],
    });
    expect(prepared.request.joinDraft).toBe(document);
  });

  it('prepares an incomplete operation through the same request dispatched by Apply', () => {
    const prepared = prepareCanvasRelationalTreeApply({
      transformNode: graphModel(),
      active: true,
      joinDraft: null,
      operation: null,
      hasSelectedInputs: false,
      pending: {
        sources: [],
        operations: [{ id: 'pending:filter', operation: 'filter', inputs: [null] }],
        outputRelationId: 'pending:filter',
        positions: new Map(),
      },
      baselineOutputId: null,
      semanticRootId: null,
    });
    expect(prepared).toMatchObject({
      cleared: false,
      hasIncompleteGraph: true,
      hasDraftChanges: true,
    });
    const onApplyNodeDraft = vi.fn(() => ({ outcome: 'no_changes' as const }));
    const apply = createCanvasRelationalTreeApplyCommand({
      ...prepared.request,
      editable: true,
      authoring: { canEditNode: true, onApplyNodeDraft },
      reject: vi.fn(),
      reset: vi.fn(),
    });
    expect(apply().outcome).toBe('no_changes');
    expect(onApplyNodeDraft).toHaveBeenCalledWith(
      'model',
      expect.objectContaining({
        relationalAuthoringDraft: prepared.request.relationalAuthoringDraft,
      })
    );
  });

  it.each(['projection', 'union_all'] as const)(
    'rejects missing %s documents instead of inventing one',
    (operation) => {
      const transformNode = graphModel();
      const onApplyNodeDraft = vi.fn();
      const apply = createCanvasRelationalTreeApplyCommand({
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
    const apply = createCanvasRelationalTreeApplyCommand({
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
    const apply = createCanvasRelationalTreeApplyCommand({
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
    const apply = createCanvasRelationalTreeApplyCommand({
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
    const apply = createCanvasRelationalTreeApplyCommand({
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
    expect(saved?.relationalAuthoringDraft).toBeNull();
    expect(
      areCanvasInspectorNodeDraftsEqual(
        createCanvasInspectorNodeDraft(transformNode),
        canonicalizeCanvasInspectorNodeDraft(transformNode, saved!)
      )
    ).toBe(false);
  });
});
