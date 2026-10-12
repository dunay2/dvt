import { describe, expect, it } from 'vitest';
import { deriveSubstraitSchemas } from '@dvt/substrait-analysis';
import { connectedNamesProjectionDraft } from './canvasProjectionCommand.test-support';
import { CanvasRelationAnalysisSession } from './canvasRelationAnalysisSession';
import { applySelectedRelationFilter } from './canvasSelectedRelationFilter';
import { prepareRelationRemoval } from './canvasPrepareRelationRemoval';
import { dvtSubstraitTextComparison } from './canvasDvtSubstraitTextComparison';
import { encodeDvtSubstraitSemanticDocument } from './canvasDvtSubstraitSemanticDocument';

describe('selected Filter comparison semantics', () => {
  it.each(dvtSubstraitTextComparison.capabilities)(
    'roundtrips $operator without changing input identities',
    async (comparison) => {
      const draft = connectedNamesProjectionDraft();
      const baseline = encodeDvtSubstraitSemanticDocument(draft);
      const session = new CanvasRelationAnalysisSession('model');
      session.receive(draft);
      try {
        const field = (await session.query(session.rootId)).bindings[0]!;
        const next = await applySelectedRelationFilter(session, {
          intent: 'insert',
          relationId: session.rootId,
          expectedRevision: session.revision,
          fieldId: field.fieldId,
          capabilityId: comparison.capabilityId,
          value: "O'Reilly",
        });
        const relation = session.locate(session.rootId, session.revision).relation.relType;
        if (relation.case !== 'filter') throw new Error('Expected Filter');
        expect(
          dvtSubstraitTextComparison.inspect(next.plan, relation.value.condition)
        ).toMatchObject({
          operator: comparison.operator,
          sourceOrdinal: field.outputOrdinal,
          value: "O'Reilly",
        });
        const removed = session.apply(
          (
            await prepareRelationRemoval(session, {
              relationId: session.rootId,
              expectedRevision: session.revision,
            })
          ).change
        );
        expect(deriveSubstraitSchemas(removed).schemas.get(session.rootId)).toEqual(
          deriveSubstraitSchemas(draft).schemas.get(session.rootId)
        );
        expect(
          new Map(removed.sidecar.fields.map((binding) => [binding.fieldId, binding]))
        ).toEqual(new Map(draft.sidecar.fields.map((binding) => [binding.fieldId, binding])));
        expect(encodeDvtSubstraitSemanticDocument(draft)).toEqual(baseline);
      } finally {
        session.dispose();
      }
    }
  );
});
