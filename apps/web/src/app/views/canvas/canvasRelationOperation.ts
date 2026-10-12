/** UI composition label follows the surviving canonical relation, never provider admission. */
import type { CanvasRelationAnalysisSession } from './canvasRelationAnalysisSession';
import type { CanvasRelationalOperation } from './canvasRelationalOperationChoices';
import { canvasJoinOperationForType } from './canvasRelationalTreeJoinType';
import { sourceSetOperations } from './canvasSourceSet';

export function relationOperation(
  session: CanvasRelationAnalysisSession,
  relationId = session.rootId
): CanvasRelationalOperation {
  let entry = session.locate(relationId, session.revision);
  while (entry.inputs.length === 1) entry = session.locate(entry.inputs[0]!, session.revision);
  const variant = entry.relation.relType;
  if (variant.case === 'join') {
    const operation = canvasJoinOperationForType(variant.value.type);
    if (operation !== 'unsupported') return operation;
  }
  if (variant.case === 'set') {
    const operation = (
      Object.keys(sourceSetOperations) as (keyof typeof sourceSetOperations)[]
    ).find((key) => sourceSetOperations[key] === variant.value.op);
    if (operation != null) return operation;
  }
  return variant.case === 'cross' ? 'cross_join' : 'projection';
}
