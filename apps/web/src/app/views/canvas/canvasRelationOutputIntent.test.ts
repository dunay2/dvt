import { describe, expect, it } from 'vitest';
import { deriveSubstraitSchemas } from '@dvt/substrait-analysis';
import { graphJoin, appendGraphSource } from './canvasRelationGraph.test-support';
import { relationOutputSlots } from './canvasRelationOutputSchema';
import { relationOutputIntent, type RelationOutputIntent } from './canvasRelationOutputIntent';
import { changeSelectedRelationOutputs } from './canvasSelectedRelationOutputs';
import {
  decodeDvtSubstraitSemanticDocument,
  encodeDvtSubstraitSemanticDocument,
} from './canvasDvtSubstraitSemanticDocument';

describe('output command identities across persistence', () => {
  it.each([2, 3])(
    'excludes, restores and moves a field before the first output with %i operands',
    async (count) => {
      const { session } = graphJoin();
      await changeSelectedRelationOutputs(session, {
        relationId: session.rootId,
        expectedRevision: session.revision,
        outputs: [{ slot: 0 }, { slot: 1 }, { slot: 3 }],
      });
      if (count === 3) await appendGraphSource(session, 'additional');
      const available = async () => {
        const root = session.locate(session.rootId, session.revision);
        return relationOutputSlots(
          root,
          await Promise.all(root.inputs.map((id) => session.query(id)))
        );
      };
      const apply = async (intent: RelationOutputIntent) => {
        const outputs = relationOutputIntent(await available(), intent);
        const changed = await changeSelectedRelationOutputs(session, {
          relationId: session.rootId,
          expectedRevision: session.revision,
          outputs,
        });
        const saved = decodeDvtSubstraitSemanticDocument(
          encodeDvtSubstraitSemanticDocument(changed)
        );
        session.receive(saved);
        const { index } = deriveSubstraitSchemas(saved);
        return index.relations.get(index.rootId)!.fields;
      };
      const initial = (await available()).filter((slot) => slot.output != null);
      const moved = initial[2]!;
      await apply({ nodeId: 'model', columnId: moved.key, columnType: 'string', output: false });
      const hidden = (await available()).find((slot) => slot.slot === moved.slot)!;
      await apply({
        nodeId: 'model',
        columnId: hidden.key,
        columnType: 'string',
        output: true,
        placement: { targetColumnId: initial[1]!.key, placement: 'after' },
      });
      const restored = (await available()).find((slot) => slot.slot === moved.slot)!;
      const fields = await apply({
        nodeId: 'model',
        columnId: restored.key,
        targetColumnId: initial[0]!.key,
        placement: 'before',
      });
      expect(fields.map((field) => field.fieldId)).toEqual([
        restored.key,
        ...initial.filter((slot) => slot !== moved).map((slot) => slot.key),
      ]);
      session.dispose();
    }
  );
});
