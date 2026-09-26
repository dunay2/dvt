import { describe, expect, it } from 'vitest';
import { createSourceJoin } from './canvasSourceJoin';
import { source } from './canvasRelationalOperator.test-support';
import { CanvasRelationAnalysisSession } from './canvasRelationAnalysisSession';
import { prepareRelationRemoval } from './canvasPrepareRelationRemoval';
import { deriveSubstraitSchemas } from '@dvt/substrait-analysis';
import { renameSourceOccurrence } from './relational-source-occurrence/renameSourceOccurrence';

describe('retained operand identity after composition removal', () => {
  it.each([
    { port: 0, projected: 0 },
    { port: 1, projected: 1 },
    { port: 0, projected: 1 },
    { port: 1, projected: 0 },
  ] as const)(
    'keeps operand $port with its own fields even when JOIN output came from operand $projected',
    async ({ port, projected }) => {
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
          { side: projected, fieldName: 'name', name: 'label' },
          { side: projected, fieldName: 'id', name: 'key' },
        ],
      });
      const session = new CanvasRelationAnalysisSession('retire');
      session.receive(document);
      const rootId = session.rootId;
      const inputId = session.locate(rootId, session.revision).inputs[port]!;
      await renameSourceOccurrence(session, {
        relationId: inputId,
        expectedRevision: session.revision,
        alias: 'Retained instance',
      });
      const physical = session.locate(inputId, session.revision);
      const before = await session.query(inputId);
      const proposal = await prepareRelationRemoval(session, {
        relationId: rootId,
        expectedRevision: session.revision,
        keep: port === 0 ? 'left' : 'right',
      });
      const next = session.apply(proposal.change);
      const result = session.locate(session.rootId, session.revision);
      expect(session.rootId).toBe(inputId);
      expect(result.relation.relType.case).toBe('read');
      expect(result.inputs).toEqual([]);
      expect(next.sidecar.relations.map((entry) => entry.relationId)).toEqual([inputId]);
      expect(result.fields).toEqual(before.bindings);
      expect((await session.query(session.rootId)).fields).toEqual(before.fields);
      expect(session.locate(inputId, session.revision).relation).toEqual(physical.relation);
      expect(session.locate(inputId, session.revision).binding).toEqual(physical.binding);
      expect(deriveSubstraitSchemas(next).schemas.get(inputId)).toEqual(before.fields);
    }
  );
});
