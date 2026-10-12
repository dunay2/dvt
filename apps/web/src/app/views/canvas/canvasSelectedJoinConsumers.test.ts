/** A JOIN edit is local even when consumers form a mixed transformation chain. */
import { describe, expect, it } from 'vitest';
import {
  JoinRel_JoinType,
  SortField_SortDirection,
} from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import type { Rel } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import { selectedUnaryScenario } from './canvasSelectedUnary.test-support';
import { applySelectedRelationAggregate } from './canvasSelectedRelationAggregate';
import { applySelectedRelationWindow } from './canvasSelectedRelationWindow';
import { applySelectedRelationSortFetch } from './canvasSelectedRelationSortFetch';
import { querySelectedJoin } from './canvasSelectedJoin';
import { replaceSelectedJoinConditions } from './canvasSelectedJoinPredicate';
import { changeSelectedJoinType } from './canvasSelectedJoinType';
import { prepareRelationRemoval } from './canvasPrepareRelationRemoval';
import { CanvasRelationAnalysisSession } from './canvasRelationAnalysisSession';
import {
  decodeDvtSubstraitSemanticDocument,
  encodeDvtSubstraitSemanticDocument,
} from './canvasDvtSubstraitSemanticDocument';

function configuration(relation: Rel): Readonly<Record<string, unknown>> {
  const value = relation.relType.value;
  if (value == null || !('input' in value)) throw new Error('Expected a unary consumer');
  const { input: _input, ...local } = value;
  return local;
}

describe('JOIN edits below consumers', () => {
  it('retains grouping, window, sort and fetch configuration through editing and persistence', async () => {
    const { session, root } = selectedUnaryScenario();
    const input = await session.query(session.rootId);
    await applySelectedRelationAggregate(session, {
      intent: 'insert',
      relationId: session.rootId,
      expectedRevision: session.revision,
      fieldId: input.bindings[0]!.fieldId,
      alias: 'total',
    });
    const aggregate = await session.query(session.rootId);
    await applySelectedRelationWindow(session, {
      intent: 'insert',
      relationId: session.rootId,
      expectedRevision: session.revision,
      fieldId: aggregate.bindings[0]!.fieldId,
      alias: 'position',
    });
    const window = await session.query(session.rootId);
    await applySelectedRelationSortFetch(session, {
      intent: 'insert',
      operation: 'sort',
      relationId: session.rootId,
      expectedRevision: session.revision,
      keys: [
        {
          fieldId: window.bindings[0]!.fieldId,
          direction: SortField_SortDirection.DESC_NULLS_LAST,
        },
      ],
    });
    await applySelectedRelationSortFetch(session, {
      intent: 'insert',
      operation: 'fetch',
      relationId: session.rootId,
      expectedRevision: session.revision,
      count: 20n,
      offset: 7n,
    });
    const rootId = session.rootId;
    const consumers = [];
    let id = rootId;
    while (id !== root.binding.relationId) {
      const entry = session.locate(id, session.revision);
      consumers.push({ id, local: configuration(entry.relation), fields: entry.fields });
      id = entry.inputs[0]!;
    }
    const join = await querySelectedJoin(session, id, session.revision);
    const fields = join.fields;
    await replaceSelectedJoinConditions(session, {
      relationId: id,
      expectedRevision: session.revision,
      conditions: [
        {
          left: { kind: 'field', sourceFieldId: fields[0]!.fieldId },
          right: {
            kind: 'field',
            sourceFieldId: fields.find((field) => field.inputIndex === 1)!.fieldId,
          },
          operator: 'not_equal',
        },
      ],
    });
    const document = await changeSelectedJoinType(session, {
      relationId: id,
      expectedRevision: session.revision,
      joinType: JoinRel_JoinType.LEFT,
    });
    const reopened = new CanvasRelationAnalysisSession('reopen');
    reopened.receive(
      decodeDvtSubstraitSemanticDocument(encodeDvtSubstraitSemanticDocument(document))
    );
    expect(reopened.rootId).toBe(rootId);
    for (const consumer of consumers) {
      const current = reopened.locate(consumer.id, reopened.revision);
      expect(configuration(current.relation)).toEqual(consumer.local);
      expect(current.fields).toEqual(consumer.fields);
    }
    expect(await querySelectedJoin(reopened, id, reopened.revision)).toMatchObject({
      type: JoinRel_JoinType.LEFT,
      conditions: [{ operator: 'not_equal' }],
    });
    for (const consumer of consumers) {
      const proposal = await prepareRelationRemoval(reopened, {
        relationId: consumer.id,
        expectedRevision: reopened.revision,
      });
      expect(proposal.operations).toEqual([]);
      reopened.apply(proposal.change);
    }
    expect(reopened.rootId).toBe(root.binding.relationId);
    expect((await querySelectedJoin(reopened, id, reopened.revision)).conditions).toMatchObject([
      { operator: 'not_equal' },
    ]);
  });
});
