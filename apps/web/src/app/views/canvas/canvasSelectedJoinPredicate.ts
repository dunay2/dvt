/** Replace a selected JOIN predicate atomically; both operands use the same typed field scope. */
import {
  cloneLocalRelation,
  readRelationStructure,
  SubstraitAnalysisError,
} from '@dvt/substrait-analysis';
import type { CanvasRelationAnalysisSession } from './canvasRelationAnalysisSession';
import { querySelectedJoin } from './canvasSelectedJoin';
import { validateRelationChanges } from './canvasRelationChangeValidation';
import type { DvtSubstraitJoinPredicateCondition } from './canvasDvtSubstraitJoinCondition';
import { buildSelectedJoinExpression } from './canvasSelectedJoinExpression';

export async function replaceSelectedJoinConditions(
  session: CanvasRelationAnalysisSession,
  request: Readonly<{
    relationId: string;
    expectedRevision: number;
    conditions: readonly DvtSubstraitJoinPredicateCondition[];
    signal?: AbortSignal;
  }>
) {
  const selected = await querySelectedJoin(
    session,
    request.relationId,
    request.expectedRevision,
    request.signal
  );
  const { plan, expression } = buildSelectedJoinExpression(
    { ...selected, plan: selected.target.plan },
    request.conditions
  );
  const relation = cloneLocalRelation(
    selected.target.relation,
    readRelationStructure(selected.target.relation).inputs
  );
  if (relation.relType.case !== 'join')
    throw new SubstraitAnalysisError('invalid_structure', 'Expected selected JOIN.');
  relation.relType.value.expression = expression;
  const change = {
    expectedRevision: request.expectedRevision,
    removed: [],
    upserts: [{ relation, binding: selected.target.binding, fields: selected.target.fields }],
    extensions: { extensionUrns: plan.extensionUrns, extensions: plan.extensions },
  };
  await validateRelationChanges(session, change, new Map(), request.signal);
  request.signal?.throwIfAborted();
  return session.apply(change);
}
