import { describe, expect, it } from 'vitest';

import { SOURCE, EDGE, buildCanonicalTransform } from './canvasOutputProjection.test-support';
import {
  readDvtTransformAuthoringAuthority,
  applyDvtSubstraitSemanticDocument,
} from './canvasDvtTransformAuthoringAuthority';
import {
  decodeDvtSubstraitSemanticDocument,
  encodeDvtSubstraitSemanticDocument,
} from './canvasDvtSubstraitSemanticDocument';
import { CanvasRelationAnalysisSession } from './canvasRelationAnalysisSession';
import { applySelectedRelationFilter } from './canvasSelectedRelationFilter';
import { dvtSubstraitTextComparison } from './canvasDvtSubstraitTextComparison';
import { projectCanvasNodePresentationTruth } from './canvasNodePresentationProjection';

describe('Composed relation card schema', () => {
  it('preserves the output identity and schema when filtering a projected result', async () => {
    const original = buildCanonicalTransform();
    const authority = readDvtTransformAuthoringAuthority(original)!;
    const session = new CanvasRelationAnalysisSession(original.id);
    session.receive(decodeDvtSubstraitSemanticDocument(authority.semanticDocument));
    try {
      const schema = await session.query(session.rootId);
      const selected = schema.bindings.find(
        (field) => schema.fields[field.outputOrdinal]?.type.kind.case === 'string'
      )!;
      const filtered = await applySelectedRelationFilter(session, {
        intent: 'insert',
        relationId: session.rootId,
        expectedRevision: session.revision,
        fieldId: selected.fieldId,
        capabilityId: dvtSubstraitTextComparison.capabilities[0]!.capabilityId,
        value: 'Ada',
      });
      const changed = applyDvtSubstraitSemanticDocument(
        original,
        encodeDvtSubstraitSemanticDocument(filtered)
      );
      const before = await projectCanvasNodePresentationTruth({
        node: original,
        nodes: [SOURCE, original],
        edges: [EDGE],
      });
      const after = await projectCanvasNodePresentationTruth({
        node: changed,
        nodes: [SOURCE, changed],
        edges: [EDGE],
      });
      const identity = (
        truth: typeof before
      ): readonly { name: string; type: string; nullable?: boolean }[] =>
        truth.columns.declared.map(({ name, type, nullable }) => ({ name, type, nullable }));
      expect(before.columns.declared).toHaveLength(schema.fields.length);
      expect(identity(after)).toEqual(identity(before));
      const filteredSchema = await session.query(session.rootId);
      expect(after.columns.declared.map((column) => column.reference)).toEqual(
        filteredSchema.bindings
          .filter((field) => field.parentFieldId == null)
          .map((field) => field.fieldId)
      );
      expect(after.columns.declared.map((field) => field.name)).toEqual([
        'order_id',
        'customer_name',
      ]);
    } finally {
      session.dispose();
    }
  });
});
