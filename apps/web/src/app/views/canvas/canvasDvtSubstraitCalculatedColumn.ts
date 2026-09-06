/** Owned concern: append one calculated output to an admitted connected-source projection. */
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
  type DvtSubstraitProjectionDraft,
} from './canvasDvtSubstraitProjection';

export type DvtSubstraitCalculatedColumnRequest =
  | Readonly<{ kind: 'string-literal'; alias: string; value: string }>
  | Readonly<{ kind: 'timestamp-literal'; alias: string; value: string }>
  | Readonly<{
      kind: 'scalar-function';
      alias: string;
      inputFieldId: string;
      capabilityId: string;
    }>
  | Readonly<{ kind: 'row-number'; alias: string; orderFieldId: string }>;

function directCalculation(
  request: Exclude<DvtSubstraitCalculatedColumnRequest, { kind: 'scalar-function' }>,
  sourceOrdinal: number | null
): DvtSubstraitCalculatedExpression | null {
  if (request.kind === 'string-literal') {
    return { kind: 'string-literal', value: request.value };
  }
  if (request.kind === 'timestamp-literal') {
    const milliseconds = Date.parse(request.value);
    return Number.isFinite(milliseconds)
      ? { kind: 'timestamp-literal', value: new Date(milliseconds).toISOString() }
      : null;
  }
  return sourceOrdinal == null ? null : { kind: 'row-number', orderSourceOrdinal: sourceOrdinal };
}

export function appendDvtSubstraitCalculatedColumn(
  draft: DvtSubstraitProjectionDraft,
  request: DvtSubstraitCalculatedColumnRequest,
  context?: Readonly<{ inputDataType: string; provider: string }>
): DvtSubstraitProjectionDraft {
  const inspection = inspectDvtSubstraitProjectionDraft(draft);
  const alias = request.alias.trim();
  if (
    !inspection.ok ||
    alias.length === 0 ||
    inspection.projection.outputs.some((output) => output.name === alias) ||
    inspection.projection.source.fields.some((field) => field.name === alias)
  ) {
    return draft;
  }
  const inputFieldId =
    request.kind === 'scalar-function'
      ? request.inputFieldId
      : request.kind === 'row-number'
        ? request.orderFieldId
        : undefined;
  const input =
    inputFieldId == null
      ? undefined
      : inspection.projection.outputs.find((output) => output.fieldId === inputFieldId);
  if (inputFieldId != null && (input == null || input.sourceFieldName == null)) return draft;

  const plan = fromBinary(PlanSchema, toBinary(PlanSchema, draft.plan));
  const root = plan.relations[0]?.relType;
  const project = root?.case === 'root' ? root.value.input?.relType : undefined;
  if (root?.case !== 'root' || project?.case !== 'project') return draft;
  const emit = project.value.common?.emitKind;
  if (emit?.case !== 'emit') return draft;
  const targetBinding = draft.sidecar.relations.find(
    (relation) => relation.relAnchor === project.value.common?.relAnchor
  );
  if (targetBinding == null) return draft;
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

  if (request.kind === 'scalar-function') {
    if (context == null) return draft;
    const inputMapping = emit.value.outputMapping[input!.outputOrdinal];
    if (inputMapping == null) return draft;
    emit.value.outputMapping.push(inputMapping);
    const appended = { plan, sidecar };
    const applied = applyDvtSubstraitProjectionFunction(appended, {
      fieldId,
      inputFieldId: input!.fieldId,
      capabilityId: request.capabilityId,
      alias,
      dataType: context.inputDataType,
      provider: context.provider,
    });
    return applied === appended ? draft : applied;
  }

  const sourceOrdinal =
    input?.sourceFieldName == null
      ? null
      : inspection.projection.source.fields.findIndex(
          (field) => field.name === input.sourceFieldName
        );
  const calculation = directCalculation(request, sourceOrdinal === -1 ? null : sourceOrdinal);
  if (calculation == null) return draft;
  try {
    project.value.expressions.push(buildDvtSubstraitCalculatedExpression(plan, calculation));
  } catch {
    return draft;
  }
  emit.value.outputMapping.push(
    inspection.projection.source.fields.length + project.value.expressions.length - 1
  );
  const appended = { plan, sidecar };
  return inspectDvtSubstraitProjectionDraft(appended).ok ? appended : draft;
}
