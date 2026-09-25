import { describe, expect, it } from 'vitest';
import { createSourceJoin } from './canvasSourceJoin';
import { source } from './canvasRelationalOperator.test-support';
import { CanvasRelationAnalysisSession } from './canvasRelationAnalysisSession';
import { prepareRelationRemoval } from './canvasPrepareRelationRemoval';
import { deriveSubstraitSchemas } from '@dvt/substrait-analysis';
import { renameSourceOccurrence } from './relational-source-occurrence/renameSourceOccurrence';

describe('retained composition output contract', () => {
  it.each([0, 1] as const)(
    'preserves aliases, order, types and FieldIds of operand %s',
    async (port) => {
      const input = {
        source: source('shared'),
        fields: ['id', 'name'],
        fieldTypes: ['i64', 'string'] as const,
        fieldNullabilities: [false, true],
      };
      const document = createSourceJoin({
        left: input,
        right: input,
        leftFieldName: 'id',
        rightFieldName: 'id',
        targetNodeId: 'model',
        outputs: [
          { side: port, fieldName: 'name', name: 'label' },
          { side: port, fieldName: 'id', name: 'key' },
        ],
      });
      const session = new CanvasRelationAnalysisSession('retire');
      session.receive(document);
      const rootId = session.rootId;
      const before = await session.query(rootId);
      const inputId = session.locate(rootId, session.revision).inputs[port]!;
      await renameSourceOccurrence(session, {
        relationId: inputId,
        expectedRevision: session.revision,
        alias: 'Retained instance',
      });
      const physical = session.locate(inputId, session.revision);
      const proposal = await prepareRelationRemoval(session, {
        relationId: rootId,
        expectedRevision: session.revision,
        keep: port === 0 ? 'left' : 'right',
      });
      const next = session.apply(proposal.change);
      const result = session.locate(session.rootId, session.revision);
      expect(result.relation.relType.case).toBe('project');
      expect(result.inputs).toEqual([inputId]);
      expect(result.fields).toEqual(before.bindings);
      expect((await session.query(session.rootId)).fields).toEqual(before.fields);
      expect(session.locate(inputId, session.revision).relation).toEqual(physical.relation);
      expect(session.locate(inputId, session.revision).binding).toEqual(physical.binding);
      expect(deriveSubstraitSchemas(next).schemas.get(rootId)).toEqual(before.fields);
    }
  );
});
