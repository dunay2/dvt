import { describe, expect, it } from 'vitest';
import { createSourceJoin } from './canvasSourceJoin';
import { source } from './canvasRelationalOperator.test-support';
import { CanvasRelationAnalysisSession } from './canvasRelationAnalysisSession';
import { prepareRelationRemoval } from './canvasPrepareRelationRemoval';
import { deriveSubstraitSchemas } from '@dvt/substrait-analysis';
import { renameSourceOccurrence } from './relational-source-occurrence/renameSourceOccurrence';
import { createSourceSet } from './canvasSourceSet';
import { applySelectedRelationSortFetch } from './canvasSelectedRelationSortFetch';
import { inputIdentityMap } from '@dvt/substrait-analysis';

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

  it.each(['left', 'right'] as const)(
    'retains downstream fields when retiring SET to its %s input',
    async (keep) => {
      const session = new CanvasRelationAnalysisSession('retire-set');
      session.receive(
        createSourceSet({
          targetNodeId: 'model',
          inputs: ['west', 'east'].map((name) => ({
            ...source(name),
            fields: [{ name: 'id', type: 'i64' as const }],
          })),
        })
      );
      const setId = session.rootId;
      const set = session.locate(setId, session.revision);
      expect(
        inputIdentityMap(
          set.fields,
          set.inputs.flatMap((id) => session.locate(id, session.revision).fields)
        ).size
      ).toBe(0);
      const inputId = set.inputs[keep === 'left' ? 0 : 1]!;
      const physical = await session.query(inputId);
      await applySelectedRelationSortFetch(session, {
        relationId: setId,
        expectedRevision: session.revision,
        operation: 'fetch',
        intent: 'insert',
        count: 10n,
      });
      const before = await session.query(session.rootId);
      const proposal = await prepareRelationRemoval(session, {
        relationId: setId,
        expectedRevision: session.revision,
        keep,
      });
      expect(proposal.operations).toEqual([]);
      const document = session.apply(proposal.change);
      const output = await session.query(session.rootId);
      expect(output.bindings.map((field) => field.fieldId)).toEqual(
        before.bindings.map((field) => field.fieldId)
      );
      expect(output.bindings.map((field) => field.sourceFieldId)).toEqual(
        physical.bindings.map((field) => field.fieldId)
      );
      expect(document.sidecar.relations).toHaveLength(2);
      expect(session.locate(session.rootId, session.revision).inputs).toEqual([inputId]);
    }
  );
});
