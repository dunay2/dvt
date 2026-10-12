import { describe, expect, it } from 'vitest';
import { source } from './canvasRelationalOperator.test-support';
import { createSourceSet, sourceSetOperations } from './canvasSourceSet';
import { CanvasRelationAnalysisSession } from './canvasRelationAnalysisSession';
import { composeSourceRelation } from './canvasComposeSourceRelation';
import { deriveSubstraitSchemas } from '@dvt/substrait-analysis';

describe('SET result composition', () => {
  it.each(Object.entries(sourceSetOperations))(
    'composes %s with fresh occurrences without flattening its operands',
    async (operation, selector) => {
      const session = new CanvasRelationAnalysisSession('set-append');
      const document = createSourceSet({
        inputs: [source('north'), source('south')],
        targetNodeId: 'model',
        operation: operation as keyof typeof sourceSetOperations,
      });
      session.receive(document);
      const previous = session.locate(session.rootId, session.revision);
      const input = {
        ...source('west'),
        fields: source('west').fields.map((field) => ({
          name: field.name,
          dataType: field.type,
          joinDataType: field.type,
          nullable: true,
        })),
      };
      for (let occurrence = 0; occurrence < 2; occurrence += 1) {
        const priorId = session.rootId;
        const next = await composeSourceRelation(session, {
          relationId: priorId,
          expectedRevision: session.revision,
          input,
          operation: operation as keyof typeof sourceSetOperations,
        });
        const root = session.locate(session.rootId, session.revision);
        expect(root.inputs[0]).toBe(priorId);
        expect(root.relation.relType.case === 'set' && root.relation.relType.value.op).toBe(
          selector
        );
        expect(session.locate(previous.binding.relationId, session.revision).relation).toEqual(
          previous.relation
        );
        expect(deriveSubstraitSchemas(next).schemas.get(session.rootId)).toEqual(
          (await session.query(session.rootId)).fields
        );
      }
      expect(session.matchingSources(input.sourceRef, session.revision)).toHaveLength(2);
      for (const binding of document.sidecar.relations)
        expect(session.locate(binding.relationId, session.revision).binding).toEqual(binding);
    }
  );
});
