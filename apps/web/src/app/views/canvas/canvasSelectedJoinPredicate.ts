/**
 * Owned concern: replace a selected JOIN predicate atomically through the existing authoring command.
 * @baseline GH-3612: simple conditions and scalar formulas share the typed input scope.
 * @decision Validate provider admission and revision before applying a canonical expression.
 * @consequence Rejected edits preserve the JOIN, its inputs and its output selection.
 * @version 1.0.0
 */
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
import { compileJoinPredicateFormula } from './canvasJoinPredicateFormula';

export async function replaceSelectedJoinConditions(
  session: CanvasRelationAnalysisSession,
  request: Readonly<{
    relationId: string;
    expectedRevision: number;
    signal?: AbortSignal;
  }> &
    (
      | Readonly<{ conditions: readonly DvtSubstraitJoinPredicateCondition[]; formula?: never }>
      | Readonly<{ formula: string; conditions?: never }>
    )
) {
  const selected = await querySelectedJoin(
    session,
    request.relationId,
    request.expectedRevision,
    request.signal
  );
  const inputSchemas = selected.inputs.flatMap((input) => input.fields);
  const { plan, expression } =
    request.formula !== undefined
      ? compileJoinPredicateFormula(
          {
            ...selected,
            fields: selected.fields.filter((field) =>
              session.allowsInputSchema(inputSchemas[field.ordinal]!)
            ),
          },
          request.formula,
          session.executionProvider(request.expectedRevision)
        )
      : buildSelectedJoinExpression(
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
