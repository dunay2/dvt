import { describe, expect, it } from 'vitest';
import { source } from './canvasRelationalOperator.test-support';
import {
  appendDvtSubstraitUnionAllInput,
  createDvtSubstraitSetDraft,
  inspectDvtSubstraitUnionAllAcceptedDraft,
} from './canvasDvtSubstraitSetComposition';

describe('canvasSetInputAppend', () => {
  it.each([
    'union_all',
    'intersect_distinct',
    'except_distinct',
    'intersect_all',
    'except_all',
  ] as const)(
    'appends a third %s source without replacing semantics, relations, or fields',
    (operation) => {
      const draft = createDvtSubstraitSetDraft({
        inputs: [source('north'), source('south')],
        targetNodeId: 'model',
        operation,
      });
      const next = appendDvtSubstraitUnionAllInput(draft, source('west'));
      const inspection = inspectDvtSubstraitUnionAllAcceptedDraft(next);
      expect(inspection.ok).toBe(true);
      if (inspection.ok) {
        expect(inspection.projection.inputs).toHaveLength(3);
        expect(inspection.projection.operation).toBe(operation);
      }
      for (const field of draft.sidecar.fields) expect(next.sidecar.fields).toContainEqual(field);
      for (const relation of draft.sidecar.relations)
        expect(next.sidecar.relations).toContainEqual(
          expect.objectContaining({ relationId: relation.relationId })
        );
      expect(appendDvtSubstraitUnionAllInput(next, source('west'))).toBe(next);
      expect(
        appendDvtSubstraitUnionAllInput(next, {
          ...source('bad'),
          fields: [{ name: 'wrong', type: 'string' }],
        })
      ).toBe(next);
    }
  );
});
