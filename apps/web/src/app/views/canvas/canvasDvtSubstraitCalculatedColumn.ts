/** Owned concern: create one derived output in an admitted connected-source projection. */
import { fromBinary, toBinary } from '@bufbuild/protobuf';
import { PlanSchema } from '@buf/substrait_substrait.bufbuild_es/substrait/plan_pb.js';
import { allocateDvtFieldId } from '@dvt/contracts';

import {
  buildDvtSubstraitCalculatedExpression,
  type DvtSubstraitCalculatedExpression,
} from './canvasDvtSubstraitCalculatedExpression';
import {
  applyDvtSubstraitProjectionFunction,
  inspectDvtSubstraitProjectionDraft,
  resolveDvtSubstraitColumnFunctions,
  type DvtSubstraitProjectionDraft,
} from './canvasDvtSubstraitProjection';

export type DvtSubstraitOutputExpressionCandidate =
  | Readonly<{ kind: 'field-ref'; inputFieldId: string }>
  | Readonly<{ kind: 'string-literal'; value: string }>
  | Readonly<{ kind: 'timestamp-literal'; value: string }>
  | Readonly<{
      kind: 'scalar-function';
      operandFieldIds: readonly [string, ...string[]];
      capabilityId: string;
    }>
  | Readonly<{ kind: 'row-number'; orderFieldId: string }>;

export type DvtSubstraitCreateOutputRequest = Readonly<{
  alias: string;
  expression: DvtSubstraitOutputExpressionCandidate;
}>;

export type DvtSubstraitCreateOutputResult =
  | Readonly<{
      outcome: 'applied';
      draft: DvtSubstraitProjectionDraft;
      createdFieldId: string;
    }>
  | Readonly<{ outcome: 'rejected' }>;

function directCalculation(
  expression: Exclude<
    DvtSubstraitOutputExpressionCandidate,
    { kind: 'scalar-function' } | { kind: 'field-ref' }
  >,
  sourceOrdinal: number | null
): DvtSubstraitCalculatedExpression | null {
  if (expression.kind === 'string-literal') {
    return { kind: 'string-literal', value: expression.value };
  }
  if (expression.kind === 'timestamp-literal') {
    const milliseconds = Date.parse(expression.value);
    return Number.isFinite(milliseconds)
      ? { kind: 'timestamp-literal', value: new Date(milliseconds).toISOString() }
      : null;
  }
  return sourceOrdinal == null ? null : { kind: 'row-number', orderSourceOrdinal: sourceOrdinal };
}

export function createDvtSubstraitProjectionOutput(
  draft: DvtSubstraitProjectionDraft,
  request: DvtSubstraitCreateOutputRequest,
  context?: Readonly<{ inputDataTypes: readonly string[]; provider: string }>
): DvtSubstraitCreateOutputResult {
  const inspection = inspectDvtSubstraitProjectionDraft(draft);
  const alias = request.alias.trim();
  if (
    !inspection.ok ||
    alias.length === 0 ||
    inspection.projection.outputs.some((output) => output.name === alias) ||
    inspection.projection.source.fields.some((field) => field.name === alias)
  ) {
    return { outcome: 'rejected' };
  }

  const expression = request.expression;
  const operandFieldIds =
    expression.kind === 'scalar-function'
      ? expression.operandFieldIds
      : expression.kind === 'field-ref'
        ? [expression.inputFieldId]
        : expression.kind === 'row-number'
          ? [expression.orderFieldId]
          : [];
  const operands = operandFieldIds.map((fieldId) =>
    inspection.projection.outputs.find((output) => output.fieldId === fieldId)
  );
  if (
    operands.some((operand) => operand == null) ||
    new Set(operandFieldIds).size !== operandFieldIds.length
  ) {
    return { outcome: 'rejected' };
  }
  const firstOperand = operands[0];
  if (expression.kind === 'row-number' && firstOperand?.sourceFieldName == null) {
    return { outcome: 'rejected' };
  }

  if (
    expression.kind === 'scalar-function' &&
    (context == null ||
      !resolveDvtSubstraitColumnFunctions({
        dataTypes: context.inputDataTypes,
        provider: context.provider,
      }).some((capability) => capability.capabilityId === expression.capabilityId))
  ) {
    return { outcome: 'rejected' };
  }

  const plan = fromBinary(PlanSchema, toBinary(PlanSchema, draft.plan));
  const root = plan.relations[0]?.relType;
  const project = root?.case === 'root' ? root.value.input?.relType : undefined;
  if (root?.case !== 'root' || project?.case !== 'project') return { outcome: 'rejected' };
  const emit = project.value.common?.emitKind;
  if (emit?.case !== 'emit') return { outcome: 'rejected' };
  const targetBinding = draft.sidecar.relations.find(
    (relation) => relation.relAnchor === project.value.common?.relAnchor
  );
  if (targetBinding == null) return { outcome: 'rejected' };

  if (expression.kind !== 'scalar-function' && expression.kind !== 'field-ref') {
    const sourceOrdinal =
      firstOperand?.sourceFieldName == null
        ? null
        : inspection.projection.source.fields.findIndex(
            (field) => field.name === firstOperand.sourceFieldName
          );
    const calculation = directCalculation(expression, sourceOrdinal === -1 ? null : sourceOrdinal);
    if (calculation == null) return { outcome: 'rejected' };
    try {
      project.value.expressions.push(buildDvtSubstraitCalculatedExpression(plan, calculation));
    } catch {
      return { outcome: 'rejected' };
    }
  }

  const fieldId = allocateDvtFieldId();
  const outputOrdinal = inspection.projection.outputs.length;
  const sidecar = {
    ...draft.sidecar,
    fields: [
      ...draft.sidecar.fields,
      {
        fieldId,
        relationId: targetBinding.relationId,
        outputOrdinal,
        displayName: alias,
      },
    ],
  };
  root.value.names.push(alias);

  if (expression.kind === 'field-ref') {
    const inputMapping = emit.value.outputMapping[firstOperand!.outputOrdinal];
    if (inputMapping == null) return { outcome: 'rejected' };
    emit.value.outputMapping.push(inputMapping);
    const appended = { plan, sidecar };
    return inspectDvtSubstraitProjectionDraft(appended).ok
      ? { outcome: 'applied', draft: appended, createdFieldId: fieldId }
      : { outcome: 'rejected' };
  }

  if (expression.kind === 'scalar-function') {
    const inputMapping = emit.value.outputMapping[firstOperand!.outputOrdinal];
    if (inputMapping == null) return { outcome: 'rejected' };
    emit.value.outputMapping.push(inputMapping);
    const appended = { plan, sidecar };
    const applied = applyDvtSubstraitProjectionFunction(appended, {
      fieldId,
      operandFieldIds: expression.operandFieldIds,
      capabilityId: expression.capabilityId,
      alias,
      dataTypes: context!.inputDataTypes,
      provider: context!.provider,
    });
    return applied === appended
      ? { outcome: 'rejected' }
      : { outcome: 'applied', draft: applied, createdFieldId: fieldId };
  }

  emit.value.outputMapping.push(
    inspection.projection.source.fields.length + project.value.expressions.length - 1
  );
  const appended = { plan, sidecar };
  return inspectDvtSubstraitProjectionDraft(appended).ok
    ? { outcome: 'applied', draft: appended, createdFieldId: fieldId }
    : { outcome: 'rejected' };
}
