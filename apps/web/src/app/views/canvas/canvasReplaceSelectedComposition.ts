/** Replace only the selected composition; consumers and operand subtrees remain canonical. */
import {
  cloneLocalRelation,
  readRelationStructure,
  SubstraitAnalysisError,
} from '@dvt/substrait-analysis';
import type { CanvasRelationAnalysisSession } from './canvasRelationAnalysisSession';
import {
  isCanvasSetOperation,
  type CanvasRelationalOperation,
} from './canvasRelationalOperationChoices';
import { isCanvasJoinOperation, toSubstraitJoinType } from './canvasRelationalTreeJoinType';
import { changeSelectedJoinType } from './canvasSelectedJoinType';
import { createCanonicalComposition } from './canvasCanonicalComposition';
import { commitSelectedRelation } from './canvasCommitSelectedRelation';
import { sourceSetOperations } from './canvasSourceSet';
import { joinConditionFields } from './canvasSelectedJoin';
import { resolveCanvasDvtJoinFieldPair } from './canvasDvtJoinTypeAdmission';

export async function replaceSelectedComposition(
  session: CanvasRelationAnalysisSession,
  request: Readonly<{
    relationId: string;
    expectedRevision: number;
    operation: CanvasRelationalOperation;
    signal?: AbortSignal;
  }>
) {
  const target = session.locate(request.relationId, request.expectedRevision);
  const kind = target.relation.relType.case;
  if (kind !== 'join' && kind !== 'cross' && kind !== 'set')
    throw new SubstraitAnalysisError(
      'invalid_binding',
      'Select the composition to replace.',
      request.relationId
    );
  if (kind === 'join' && isCanvasJoinOperation(request.operation))
    return changeSelectedJoinType(session, {
      ...request,
      joinType: toSubstraitJoinType(request.operation),
    });
  if (kind === 'set' && isCanvasSetOperation(request.operation)) {
    const relation = cloneLocalRelation(
      target.relation,
      readRelationStructure(target.relation).inputs
    );
    if (relation.relType.case !== 'set') throw new Error('Expected SET relation.');
    relation.relType.value.op = sourceSetOperations[request.operation];
    return commitSelectedRelation(session, {
      ...request,
      intent: 'edit',
      replacement: {
        relation,
        binding: { ...target.binding, displayName: request.operation },
        fields: target.fields,
      },
    });
  }
  const inputs = target.inputs.map((id) => session.locate(id, request.expectedRevision));
  const schemas = await Promise.all(target.inputs.map((id) => session.query(id, request.signal)));
  const fields = joinConditionFields(
    schemas,
    (field, port) => `${inputs[port]!.binding.displayName}.${field.displayName}`
  );
  const options = (port: number) =>
    fields
      .filter((field) => field.inputIndex === port)
      .map((field) => ({
        name: field.label,
        joinDataType: field.dataType,
        fieldId: field.fieldId,
      }));
  const pair = resolveCanvasDvtJoinFieldPair(options(0), options(1));
  const built = createCanonicalComposition({
    plan: target.plan,
    inputs,
    schemas: schemas.map((schema) => schema.fields),
    binding: { ...target.binding, displayName: request.operation },
    operation: request.operation,
    previousFields: target.fields,
    ...(pair == null
      ? {}
      : { predicate: { leftFieldId: pair.left.fieldId, rightFieldId: pair.right.fieldId } }),
  });
  return commitSelectedRelation(session, {
    ...request,
    intent: 'edit',
    replacement: built,
    extensions: built.extensions,
  });
}
