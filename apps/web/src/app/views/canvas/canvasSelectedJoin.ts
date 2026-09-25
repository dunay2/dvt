/** Query one JoinRel from the existing analysis session, never a shape-specific plan reader. */
import { SubstraitAnalysisError, type RelationAnalysisResult } from '@dvt/substrait-analysis';
import type { DvtSubstraitJoinDataType } from '@dvt/postgres-projection';
import { inspectJoinConditionChain } from './canvasDvtSubstraitJoinConditionInspection';
import { mapDvtSubstraitJoinConditionOperands } from './canvasDvtSubstraitJoinCondition';
import { mapDvtSubstraitJoinOperandFields } from './canvasDvtSubstraitJoinOperand';
import type { CanvasRelationAnalysisSession } from './canvasRelationAnalysisSession';

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
  labels: readonly string[]
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
              label: `${labels[inputIndex]}.${field.displayName}`,
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
  const labels = inputs.map(
    (input, port) =>
      `${session.locate(input.relationId, expectedRevision).binding.displayName} · ${port + 1}`
  );
  const fields = joinConditionFields(inputs, labels);
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
