/** Query replacement admission from cached operand schemas, using the canonical schema rules. */
import { create } from '@bufbuild/protobuf';
import { RelSchema } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import { deriveOperatorSchema, SubstraitAnalysisError } from '@dvt/substrait-analysis';
import type { CanvasRelationAnalysisSession } from './canvasRelationAnalysisSession';
import { conditionDataType } from './canvasSelectedJoin';
import { sourceSetOperations } from './canvasSourceSet';
import {
  isCanvasSetOperation,
  resolveCanvasRelationalOperationChoices,
  type CanvasOperationFacts,
} from './canvasRelationalOperationChoices';

export async function queryCompositionChoices(
  session: CanvasRelationAnalysisSession,
  relationId: string,
  revision: number,
  readOnly: boolean,
  signal?: AbortSignal
) {
  const target = session.locate(relationId, revision);
  const variant = target.relation.relType;
  if (variant.case !== 'join' && variant.case !== 'cross' && variant.case !== 'set') return [];
  const inputs = await Promise.all(target.inputs.map((id) => session.query(id, signal)));
  const schemas = inputs.map((input) => input.fields);
  const sets: CanvasOperationFacts['sets'] = Object.fromEntries(
    Object.entries(sourceSetOperations).map(([operation, op]) => {
      try {
        deriveOperatorSchema(
          { ...target, relation: create(RelSchema, { relType: { case: 'set', value: { op } } }) },
          schemas
        );
        return [operation, true];
      } catch (error) {
        if (!(error instanceof SubstraitAnalysisError)) throw error;
        return [operation, false];
      }
    })
  );
  signal?.throwIfAborted();
  session.locate(relationId, revision);
  const types = schemas.map((fields) =>
    fields.map((field) => conditionDataType(field.type.kind.case))
  );
  return resolveCanvasRelationalOperationChoices({
    readOnly,
    inputCount: inputs.length,
    sameConnection: true,
    completeSchema: schemas.every((fields) => fields.length > 0),
    comparableFields: types[0]!.some((type) => type != null && types[1]!.includes(type)),
    predicateAvailable: variant.case === 'join' && variant.value.expression != null,
    sets,
  }).map((choice) =>
    inputs.length === 2 || isCanvasSetOperation(choice.operation)
      ? choice
      : {
          ...choice,
          selectable: false,
          availability: 'semantically-unavailable' as const,
        }
  );
}
