/** Owned concern: preserve the surviving occurrence when removing the final JOIN. */
import { describe, expect, it } from 'vitest';
import { removeCanvasRelationalTreeNode } from '../canvasRelationalTreeRemoval';
import {
  createDvtSubstraitStringJoinDraft,
  inspectDvtSubstraitJoinDraft,
} from '../canvasDvtSubstraitJoinComposition';
import { inspectDvtSubstraitProjectionDraft } from '../canvasDvtSubstraitProjection';
import { occurrenceInput, repeatedOccurrenceDraft } from './occurrence.test.fixtures';

describe('retaining a single named occurrence', () => {
  it('rejects a removal that the projection profile cannot express without widening Read nullability', () => {
    const draft = repeatedOccurrenceDraft();
    const before = inspectDvtSubstraitJoinDraft(draft);
    if (!before.ok) throw new Error('Expected a canonical JOIN');
    expect(
      removeCanvasRelationalTreeNode({
        draft,
        relationId: before.projection.joinRelations[0]!.relationId,
        keep: 'left',
        targetNodeId: 'model',
      })
    ).toEqual({ ok: false, reason: 'unsupported-projection-type' });
  });
  it.each(['left', 'right'] as const)(
    'retains %s identity and alias in the resulting projection',
    (keep) => {
      const input = {
        ...occurrenceInput,
        fieldTypes: ['string', 'string'] as const,
        fieldNullabilities: [true, true],
      };
      const draft = createDvtSubstraitStringJoinDraft({
        left: input,
        right: input,
        leftFieldName: 'id',
        rightFieldName: 'parent_id',
        targetNodeId: 'model',
      });
      const before = inspectDvtSubstraitJoinDraft(draft);
      if (!before.ok) throw new Error('Expected a canonical JOIN');
      const survivor = before.projection.inputs[keep === 'left' ? 0 : 1]!;
      const alias = 'Retained places';
      draft.sidecar.relations.find(
        (relation) => relation.relationId === survivor.relationId
      )!.displayName = alias;
      const result = removeCanvasRelationalTreeNode({
        draft,
        relationId: before.projection.joinRelations[0]!.relationId,
        keep,
        targetNodeId: 'model',
      });
      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error('Expected safe JOIN removal');
      expect(inspectDvtSubstraitProjectionDraft(result.draft).ok).toBe(true);
      expect(
        result.draft.sidecar.relations.find((relation) => relation.sourceRef != null)
      ).toMatchObject({
        relationId: survivor.relationId,
        displayName: alias,
        sourceRef: survivor.sourceRef,
      });
      expect(
        result.draft.sidecar.fields
          .filter((field) => field.relationId === survivor.relationId)
          .map((field) => field.fieldId)
      ).toEqual(survivor.fields.map((field) => field.fieldId));
    }
  );
});
