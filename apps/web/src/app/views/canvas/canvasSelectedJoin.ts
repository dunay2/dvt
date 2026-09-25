/** Query one JoinRel from the existing analysis session, never a shape-specific plan reader. */
import { SubstraitAnalysisError, type RelationAnalysisResult } from '@dvt/substrait-analysis';
import type { DvtSubstraitJoinDataType } from '@dvt/postgres-projection';
import { inspectJoinConditionChain } from './canvasDvtSubstraitJoinConditionInspection';
import { mapDvtSubstraitJoinConditionOperands } from './canvasDvtSubstraitJoinCondition';
import { mapDvtSubstraitJoinOperandFields } from './canvasDvtSubstraitJoinOperand';
import type { CanvasRelationAnalysisSession } from './canvasRelationAnalysisSession';
import { createCanvasFieldAliasLabels } from './canvasFieldAliasLabels';
import type { DvtSubstraitFieldBindingV1 } from '@dvt/contracts';

export type JoinConditionField = Readonly<{
  fieldId: string;
  label: string;
  dataType: DvtSubstraitJoinDataType;
  inputIndex: number;
  ordinal: number;
}>;

export function conditionDataType(kind: string | undefined): DvtSubstraitJoinDataType | null {
  return kind === 'string' ||
    kind === 'bool' ||
    kind === 'i64' ||
    kind === 'fp64' ||
    kind === 'precisionTimestampTz'
    ? kind
    : null;
}

export function joinConditionFields(
  inputs: readonly Pick<RelationAnalysisResult, 'bindings' | 'fields'>[],
  label: (field: DvtSubstraitFieldBindingV1, inputIndex: number) => string
): readonly JoinConditionField[] {
  let offset = 0;
  return inputs.flatMap((input, inputIndex) => {
    const fields = input.bindings.flatMap((field) => {
      if (field.parentFieldId != null) return [];
      const dataType = conditionDataType(input.fields[field.outputOrdinal]?.type.kind.case);
      return dataType == null
        ? []
        : [
            {
              fieldId: field.fieldId,
              label: label(field, inputIndex),
              dataType,
              inputIndex,
              ordinal: offset + field.outputOrdinal,
            },
          ];
    });
    offset += input.fields.length;
    return fields;
  });
}

export async function querySelectedJoin(
  session: CanvasRelationAnalysisSession,
  relationId: string,
  expectedRevision: number,
  signal?: AbortSignal
) {
  const target = session.locate(relationId, expectedRevision);
  if (target.relation.relType.case !== 'join')
    throw new SubstraitAnalysisError(
      'invalid_binding',
      'The selection is not a JoinRel.',
      relationId
    );
  const [output, ...inputs] = await Promise.all(
    [relationId, ...target.inputs].map((id) => session.query(id, signal))
  );
  session.locate(relationId, expectedRevision);
  signal?.throwIfAborted();
  const locations = new Map([[relationId, target]]);
  const locate = (id: string) => {
    if (!locations.has(id)) locations.set(id, session.locate(id, expectedRevision));
    return locations.get(id)!;
  };
  const label = createCanvasFieldAliasLabels(
    (field) =>
      field.sourceFieldId == null
        ? undefined
        : locate(field.relationId)
            .inputs.flatMap((id) => locate(id).fields)
            .find((source) => source.fieldId === field.sourceFieldId),
    (id) => locate(id).binding.displayName
  );
  const fields = joinConditionFields(inputs, label);
  const byOrdinal = new Map(fields.map((field) => [field.ordinal, field]));
  const inspected = inspectJoinConditionChain(
    target.plan,
    target.relation.relType.value.expression
  );
  const mapped = inspected?.map((condition) =>
    mapDvtSubstraitJoinConditionOperands(condition, (operand) =>
      mapDvtSubstraitJoinOperandFields(operand, (field) => {
        const binding = byOrdinal.get(field.ordinal);
        return binding == null ? null : { kind: 'field' as const, sourceFieldId: binding.fieldId };
      })
    )
  );
  return {
    relationId,
    revision: expectedRevision,
    target,
    output: output!,
    inputs,
    fields,
    type: target.relation.relType.value.type,
    conditions:
      mapped == null || mapped.some((condition) => condition == null)
        ? null
        : mapped.filter((condition) => condition != null),
  };
}

export type SelectedJoin = Awaited<ReturnType<typeof querySelectedJoin>>;
