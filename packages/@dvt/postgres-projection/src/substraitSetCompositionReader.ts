/** Owns fail-closed inspection of admitted Aggregate/Window wrappers over SetRel. */
import {
  AggregateFunction_AggregationInvocation,
  AggregationPhase,
  Expression_WindowFunction_BoundsType,
  SortField_SortDirection,
  type AggregateRel,
  type Expression,
  type Expression_WindowFunction,
} from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import { PlanSchema, type Plan } from '@buf/substrait_substrait.bufbuild_es/substrait/plan_pb.js';
import { Type_Nullability } from '@buf/substrait_substrait.bufbuild_es/substrait/type_pb.js';
import { clone, toBinary } from '@bufbuild/protobuf';
import { sha256Hex } from '@dvt/crypto';

import {
  hasCurrentJoinSemanticHash,
  hasUniqueJoinSidecarIdentity,
} from './substraitJoinInspectionGuards.js';
import { inspectDvtSubstraitSetDraft } from './substraitSetReader.js';
import type { DvtSubstraitSetDraft, DvtSubstraitSetProjection } from './substraitSetReadModel.js';

const COUNT_URN = 'extension:io.substrait:functions_aggregate_generic';
const ROW_NUMBER_URN = 'extension:io.substrait:functions_arithmetic';

type WrapperField = DvtSubstraitSetDraft['sidecar']['fields'][number];

export type DvtSubstraitSetComposition = Readonly<{
  kind: 'set' | 'aggregate' | 'window';
  projection: DvtSubstraitSetProjection;
  baseProjection: DvtSubstraitSetProjection;
  groupFieldName?: string;
  measureName?: string;
  windowName?: string;
}>;

function resolveUrn(plan: Plan, anchor: number): string | null {
  return plan.extensionUrns.find((entry) => entry.extensionUrnAnchor === anchor)?.urn ?? null;
}

function fieldOrdinal(expression: Expression | undefined): number | null {
  if (expression?.rexType.case !== 'selection') return null;
  const reference = expression.rexType.value;
  const segment =
    reference.referenceType.case === 'directReference'
      ? reference.referenceType.value.referenceType
      : undefined;
  return reference.rootType.case === 'rootReference' &&
    segment?.case === 'structField' &&
    segment.value.child == null
    ? segment.value.field
    : null;
}

function isCount(plan: Plan, aggregate: AggregateRel): boolean {
  const measure = aggregate.measures[0];
  const fn = measure?.measure;
  if (
    measure == null ||
    measure.filter != null ||
    fn == null ||
    fn.arguments.length !== 0 ||
    fn.options.length !== 0 ||
    fn.sorts.length !== 0 ||
    fn.phase !== AggregationPhase.INITIAL_TO_RESULT ||
    fn.invocation !== AggregateFunction_AggregationInvocation.ALL ||
    fn.outputType?.kind.case !== 'i64' ||
    fn.outputType.kind.value.nullability !== Type_Nullability.REQUIRED
  ) {
    return false;
  }
  const declarations = plan.extensions.filter(
    (entry) =>
      entry.mappingType.case === 'extensionFunction' &&
      resolveUrn(plan, entry.mappingType.value.extensionUrnReference) === COUNT_URN
  );
  const declaration = declarations[0];
  return (
    declarations.length === 1 &&
    plan.extensionUrns.filter((entry) => entry.urn === COUNT_URN).length === 1 &&
    declaration?.mappingType.case === 'extensionFunction' &&
    declaration.mappingType.value.functionAnchor === fn.functionReference &&
    declaration.mappingType.value.name === 'count'
  );
}

function isRowNumber(plan: Plan, fn: Expression_WindowFunction): boolean {
  if (
    fn.arguments.length !== 0 ||
    fn.options.length !== 0 ||
    fn.outputType?.kind.case !== 'i64' ||
    fn.outputType.kind.value.nullability !== Type_Nullability.NULLABLE ||
    fn.phase !== AggregationPhase.INITIAL_TO_RESULT ||
    fn.invocation !== AggregateFunction_AggregationInvocation.ALL ||
    fn.boundsType !== Expression_WindowFunction_BoundsType.UNSPECIFIED ||
    fn.lowerBound != null ||
    fn.upperBound != null
  ) {
    return false;
  }
  const declarations = plan.extensions.filter(
    (entry) =>
      entry.mappingType.case === 'extensionFunction' &&
      resolveUrn(plan, entry.mappingType.value.extensionUrnReference) === ROW_NUMBER_URN
  );
  const declaration = declarations[0];
  return (
    declarations.length === 1 &&
    plan.extensionUrns.filter((entry) => entry.urn === ROW_NUMBER_URN).length === 1 &&
    declaration?.mappingType.case === 'extensionFunction' &&
    declaration.mappingType.value.functionAnchor === fn.functionReference &&
    declaration.mappingType.value.name === 'row_number'
  );
}

function removeFunction(plan: Plan, urn: string, name: string): void {
  plan.extensions = plan.extensions.filter(
    (entry) =>
      !(
        entry.mappingType.case === 'extensionFunction' &&
        entry.mappingType.value.name === name &&
        resolveUrn(plan, entry.mappingType.value.extensionUrnReference) === urn
      )
  );
  const referencedUrns = new Set(
    plan.extensions.flatMap((entry) =>
      entry.mappingType.case === 'extensionFunction'
        ? [entry.mappingType.value.extensionUrnReference]
        : []
    )
  );
  plan.extensionUrns = plan.extensionUrns.filter(
    (entry) => entry.urn !== urn || referencedUrns.has(entry.extensionUrnAnchor)
  );
}

function sortedFields(draft: DvtSubstraitSetDraft, relationId: string): WrapperField[] {
  return draft.sidecar.fields
    .filter((field) => field.relationId === relationId)
    .sort((left, right) => left.outputOrdinal - right.outputOrdinal);
}

function withCurrentHash(draft: DvtSubstraitSetDraft): DvtSubstraitSetDraft {
  return {
    ...draft,
    sidecar: {
      ...draft.sidecar,
      semanticPlanSha256: sha256Hex(toBinary(PlanSchema, draft.plan)),
    },
  };
}

function inspectAggregateWrapper(draft: DvtSubstraitSetDraft): DvtSubstraitSetComposition | null {
  const root = draft.plan.relations[0]?.relType;
  if (
    root?.case !== 'root' ||
    root.value.names.length !== 2 ||
    root.value.names.some((name) => name.length === 0 || name !== name.trim()) ||
    new Set(root.value.names).size !== 2 ||
    root.value.input?.relType.case !== 'aggregate'
  ) {
    return null;
  }
  const aggregate = root.value.input.relType.value;
  const aggregateAnchor = aggregate.common?.relAnchor;
  const setAnchor =
    aggregate.input?.relType.case === 'set'
      ? aggregate.input.relType.value.common?.relAnchor
      : null;
  if (
    aggregateAnchor == null ||
    setAnchor == null ||
    aggregate.common == null ||
    aggregate.common.emitKind.case !== undefined ||
    aggregate.common.hint != null ||
    aggregate.common.advancedExtension != null ||
    aggregate.advancedExtension != null ||
    aggregate.groupings.length !== 1 ||
    aggregate.groupings[0]?.expressionReferences.join(',') !== '0' ||
    aggregate.groupingExpressions.length !== 1 ||
    aggregate.measures.length !== 1 ||
    !isCount(draft.plan, aggregate)
  ) {
    return null;
  }
  const groupOrdinal = fieldOrdinal(aggregate.groupingExpressions[0]);
  const aggregateBinding = draft.sidecar.relations.find(
    (relation) => relation.relAnchor === aggregateAnchor
  );
  const setBinding = draft.sidecar.relations.find((relation) => relation.relAnchor === setAnchor);
  if (
    groupOrdinal == null ||
    groupOrdinal < 0 ||
    aggregateBinding == null ||
    setBinding == null ||
    aggregateBinding.sourceRef != null ||
    aggregateBinding.displayName !== setBinding.displayName
  ) {
    return null;
  }
  const wrapperFields = sortedFields(draft, aggregateBinding.relationId);
  const groupField = wrapperFields[0];
  const countField = wrapperFields[1];
  if (
    wrapperFields.length !== 2 ||
    groupField?.outputOrdinal !== 0 ||
    typeof groupField.displayName !== 'string' ||
    groupField.displayName !== root.value.names[0] ||
    countField?.outputOrdinal !== 1 ||
    typeof countField.displayName !== 'string' ||
    countField.displayName !== root.value.names[1]
  ) {
    return null;
  }

  const plan = clone(PlanSchema, draft.plan);
  const baseRoot = plan.relations[0]?.relType;
  if (baseRoot?.case !== 'root' || baseRoot.value.input?.relType.case !== 'aggregate') return null;
  const setInput = baseRoot.value.input.relType.value.input;
  if (setInput?.relType.case !== 'set') return null;
  baseRoot.value.input = setInput;
  removeFunction(plan, COUNT_URN, 'count');
  const fields = draft.sidecar.fields.flatMap((field) => {
    if (field.fieldId === countField.fieldId) return [];
    return field.fieldId === groupField.fieldId
      ? [{ ...field, relationId: setBinding.relationId, outputOrdinal: groupOrdinal }]
      : [field];
  });
  const baseResultFields = fields
    .filter((field) => field.relationId === setBinding.relationId)
    .sort((left, right) => left.outputOrdinal - right.outputOrdinal);
  if (
    baseResultFields.length === 0 ||
    baseResultFields.some(
      (field, outputOrdinal) => field.outputOrdinal !== outputOrdinal || field.displayName == null
    )
  ) {
    return null;
  }
  baseRoot.value.names = baseResultFields.map((field) => field.displayName!);
  const baseDraft = withCurrentHash({
    plan,
    sidecar: {
      ...draft.sidecar,
      relations: draft.sidecar.relations.filter(
        (relation) => relation.relationId !== aggregateBinding.relationId
      ),
      fields,
    },
  });
  const base = inspectDvtSubstraitSetDraft(baseDraft);
  const baseGroupField = base.ok ? base.projection.outputs[groupOrdinal] : null;
  if (
    !base.ok ||
    baseGroupField == null ||
    baseGroupField.fieldId !== groupField.fieldId ||
    draft.sidecar.relations.length !== baseDraft.sidecar.relations.length + 1 ||
    draft.sidecar.fields.length !== baseDraft.sidecar.fields.length + 1
  ) {
    return null;
  }
  return {
    kind: 'aggregate',
    baseProjection: base.projection,
    groupFieldName: baseGroupField.name,
    measureName: countField.displayName,
    projection: {
      operation: base.projection.operation,
      inputs: base.projection.inputs,
      resultRelationId: aggregateBinding.relationId,
      outputs: [
        { ...baseGroupField, name: groupField.displayName, outputOrdinal: 0 },
        {
          fieldKey: countField.displayName,
          name: countField.displayName,
          fieldId: countField.fieldId,
          outputOrdinal: 1,
          dataType: 'i64',
          nullable: false,
        },
      ],
    },
  };
}

function inspectWindowWrapper(draft: DvtSubstraitSetDraft): DvtSubstraitSetComposition | null {
  const root = draft.plan.relations[0]?.relType;
  if (
    root?.case !== 'root' ||
    root.value.names.length !== 3 ||
    root.value.names.some((name) => name.length === 0 || name !== name.trim()) ||
    new Set(root.value.names).size !== 3 ||
    root.value.input?.relType.case !== 'project'
  ) {
    return null;
  }
  const project = root.value.input.relType.value;
  const projectAnchor = project.common?.relAnchor;
  const aggregateAnchor =
    project.input?.relType.case === 'aggregate'
      ? project.input.relType.value.common?.relAnchor
      : null;
  const expression = project.expressions[0]?.rexType;
  if (
    projectAnchor == null ||
    aggregateAnchor == null ||
    project.common?.emitKind.case !== 'emit' ||
    project.common.emitKind.value.outputMapping.join(',') !== '0,1,2' ||
    project.common.hint != null ||
    project.common.advancedExtension != null ||
    project.advancedExtension != null ||
    project.expressions.length !== 1 ||
    expression?.case !== 'windowFunction'
  ) {
    return null;
  }
  const window = expression.value;
  if (
    !isRowNumber(draft.plan, window) ||
    window.partitions.length !== 0 ||
    window.sorts.length !== 2 ||
    fieldOrdinal(window.sorts[0]?.expr) !== 1 ||
    window.sorts[0]?.sortKind.case !== 'direction' ||
    window.sorts[0].sortKind.value !== SortField_SortDirection.DESC_NULLS_LAST ||
    fieldOrdinal(window.sorts[1]?.expr) !== 0 ||
    window.sorts[1]?.sortKind.case !== 'direction' ||
    window.sorts[1].sortKind.value !== SortField_SortDirection.ASC_NULLS_LAST
  ) {
    return null;
  }
  const projectBinding = draft.sidecar.relations.find(
    (relation) => relation.relAnchor === projectAnchor
  );
  const aggregateBinding = draft.sidecar.relations.find(
    (relation) => relation.relAnchor === aggregateAnchor
  );
  if (
    projectBinding == null ||
    aggregateBinding == null ||
    projectBinding.sourceRef != null ||
    projectBinding.displayName !== aggregateBinding.displayName
  ) {
    return null;
  }
  const wrapperFields = sortedFields(draft, projectBinding.relationId);
  const rowNumberField = wrapperFields[2];
  if (
    wrapperFields.length !== 3 ||
    wrapperFields.some(
      (field, outputOrdinal) =>
        field.outputOrdinal !== outputOrdinal ||
        field.displayName !== root.value.names[outputOrdinal]
    ) ||
    rowNumberField == null ||
    typeof rowNumberField.displayName !== 'string'
  ) {
    return null;
  }

  const plan = clone(PlanSchema, draft.plan);
  const aggregateRoot = plan.relations[0]?.relType;
  if (aggregateRoot?.case !== 'root' || aggregateRoot.value.input?.relType.case !== 'project') {
    return null;
  }
  const aggregateInput = aggregateRoot.value.input.relType.value.input;
  if (aggregateInput?.relType.case !== 'aggregate') return null;
  aggregateRoot.value.input = aggregateInput;
  aggregateRoot.value.names = aggregateRoot.value.names.slice(0, 2);
  removeFunction(plan, ROW_NUMBER_URN, 'row_number');
  const aggregateDraft = withCurrentHash({
    plan,
    sidecar: {
      ...draft.sidecar,
      relations: draft.sidecar.relations.filter(
        (relation) => relation.relationId !== projectBinding.relationId
      ),
      fields: draft.sidecar.fields.flatMap((field) => {
        if (field.fieldId === rowNumberField.fieldId) return [];
        return field.relationId === projectBinding.relationId
          ? [{ ...field, relationId: aggregateBinding.relationId }]
          : [field];
      }),
    },
  });
  const aggregate = inspectAggregateWrapper(aggregateDraft);
  if (
    aggregate == null ||
    wrapperFields[0]?.fieldId !== aggregate.projection.outputs[0]?.fieldId ||
    wrapperFields[1]?.fieldId !== aggregate.projection.outputs[1]?.fieldId ||
    draft.sidecar.relations.length !== aggregateDraft.sidecar.relations.length + 1 ||
    draft.sidecar.fields.length !== aggregateDraft.sidecar.fields.length + 1
  ) {
    return null;
  }
  return {
    ...aggregate,
    kind: 'window',
    windowName: rowNumberField.displayName,
    projection: {
      operation: aggregate.projection.operation,
      inputs: aggregate.projection.inputs,
      resultRelationId: projectBinding.relationId,
      outputs: [
        ...aggregate.projection.outputs,
        {
          fieldKey: rowNumberField.displayName,
          name: rowNumberField.displayName,
          fieldId: rowNumberField.fieldId,
          outputOrdinal: 2,
          dataType: 'i64',
          nullable: false,
        },
      ],
    },
  };
}

export function inspectDvtSubstraitSetComposition(
  draft: DvtSubstraitSetDraft
): DvtSubstraitSetComposition | null {
  if (!hasUniqueJoinSidecarIdentity(draft) || !hasCurrentJoinSemanticHash(draft)) return null;
  const base = inspectDvtSubstraitSetDraft(draft);
  if (base.ok) {
    return { kind: 'set', projection: base.projection, baseProjection: base.projection };
  }
  return inspectWindowWrapper(draft) ?? inspectAggregateWrapper(draft);
}
