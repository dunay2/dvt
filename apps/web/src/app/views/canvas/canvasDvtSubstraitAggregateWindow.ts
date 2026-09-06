/** Owned concern: compose the admitted grouping/count and row-number capabilities in one Plan. */
import { create, fromBinary, toBinary } from '@bufbuild/protobuf';
import {
  AggregateFunction_AggregationInvocation,
  AggregationPhase,
  ExpressionSchema,
  Expression_FieldReferenceSchema,
  Expression_FieldReference_RootReferenceSchema,
  Expression_ReferenceSegmentSchema,
  Expression_ReferenceSegment_StructFieldSchema,
  Expression_WindowFunctionSchema,
  Expression_WindowFunction_BoundsType,
  ProjectRelSchema,
  RelCommonSchema,
  RelCommon_EmitSchema,
  RelSchema,
  SortFieldSchema,
  SortField_SortDirection,
  type Expression,
} from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import { PlanSchema, type Plan } from '@buf/substrait_substrait.bufbuild_es/substrait/plan_pb.js';
import {
  allocateDvtFieldId,
  allocateDvtRelationId,
  type DvtSubstraitAuthoringSidecarV1,
} from '@dvt/contracts';

import {
  inspectDvtSubstraitPilotAggregationDraft,
  type DvtSubstraitPilotAggregationProjection,
} from './canvasDvtSubstraitAggregation';
import type { DvtSubstraitPilotDraft } from './canvasDvtSubstraitPilot';
import {
  createDvtSubstraitNullableI64Type,
  DVT_SUBSTRAIT_ROW_NUMBER_CAPABILITY_ID,
  ensureDvtSubstraitRowNumberFunction,
  isDvtSubstraitRowNumberFunction,
  removeDvtSubstraitRowNumberExtension,
} from './canvasDvtSubstraitWindow';

type AggregateWindowFieldProjection = Readonly<{
  name: string;
  fieldId: string;
  inputOrdinal: number;
}>;

export type DvtSubstraitPilotAggregateWindowProjection = Readonly<{
  sourceName: string;
  groupField: AggregateWindowFieldProjection;
  measure: AggregateWindowFieldProjection;
  result: Readonly<{
    name: string;
    fieldId: string;
    capabilityId: string;
  }>;
  outputs: readonly Readonly<{
    name: string;
    fieldId: string;
    outputOrdinal: number;
  }>[];
}>;

export type DvtSubstraitPilotAggregateWindowInspection =
  | Readonly<{ ok: true; projection: DvtSubstraitPilotAggregateWindowProjection }>
  | Readonly<{ ok: false }>;

type ValidAggregateWindow = Readonly<{
  baseDraft: DvtSubstraitPilotDraft;
  baseProjection: DvtSubstraitPilotAggregationProjection;
  projection: DvtSubstraitPilotAggregateWindowProjection;
}>;

function clonePlan(plan: Plan): Plan {
  return fromBinary(PlanSchema, toBinary(PlanSchema, plan));
}

function fieldReference(ordinal: number): Expression {
  return create(ExpressionSchema, {
    rexType: {
      case: 'selection',
      value: create(Expression_FieldReferenceSchema, {
        referenceType: {
          case: 'directReference',
          value: create(Expression_ReferenceSegmentSchema, {
            referenceType: {
              case: 'structField',
              value: create(Expression_ReferenceSegment_StructFieldSchema, { field: ordinal }),
            },
          }),
        },
        rootType: {
          case: 'rootReference',
          value: create(Expression_FieldReference_RootReferenceSchema, {}),
        },
      }),
    },
  });
}

function readFieldReferenceOrdinal(expression: Expression | undefined): number | null {
  if (expression?.rexType.case !== 'selection') return null;
  const selection = expression.rexType.value;
  if (
    selection.rootType.case !== 'rootReference' ||
    selection.referenceType.case !== 'directReference'
  ) {
    return null;
  }
  const segment = selection.referenceType.value.referenceType;
  if (segment.case !== 'structField' || segment.value.child != null) return null;
  return segment.value.field;
}

function restoreAggregateDraft(
  draft: DvtSubstraitPilotDraft,
  aggregateRelationId: string,
  aggregateWindowRelationId: string,
  resultFieldId: string
): DvtSubstraitPilotDraft | null {
  const plan = clonePlan(draft.plan);
  const root = plan.relations[0]?.relType;
  if (root?.case !== 'root' || root.value.input?.relType.case !== 'project') return null;
  const aggregateInput = root.value.input.relType.value.input;
  if (aggregateInput?.relType.case !== 'aggregate') return null;
  root.value.input = aggregateInput;
  root.value.names = root.value.names.slice(0, 2);
  removeDvtSubstraitRowNumberExtension(plan);

  const sidecar: DvtSubstraitAuthoringSidecarV1 = {
    ...draft.sidecar,
    relations: draft.sidecar.relations.filter(
      (relation) => relation.relationId !== aggregateWindowRelationId
    ),
    fields: draft.sidecar.fields.flatMap((field) => {
      if (field.fieldId === resultFieldId) return [];
      if (field.relationId !== aggregateWindowRelationId) return [field];
      return [{ ...field, relationId: aggregateRelationId }];
    }),
  };
  return { plan, sidecar };
}

function inspectValidAggregateWindow(draft: DvtSubstraitPilotDraft): ValidAggregateWindow | null {
  if (
    new Set(draft.sidecar.relations.map((relation) => relation.relationId)).size !==
      draft.sidecar.relations.length ||
    new Set(draft.sidecar.relations.map((relation) => relation.relAnchor)).size !==
      draft.sidecar.relations.length ||
    new Set(draft.sidecar.fields.map((field) => field.fieldId)).size !== draft.sidecar.fields.length
  ) {
    return null;
  }
  const rootRelation = draft.plan.relations.length === 1 ? draft.plan.relations[0]?.relType : null;
  if (rootRelation?.case !== 'root') return null;
  const root = rootRelation.value;
  if (
    root.names.length !== 3 ||
    root.names.some((name) => name.trim().length === 0) ||
    new Set(root.names).size !== root.names.length ||
    root.input?.relType.case !== 'project'
  ) {
    return null;
  }
  const project = root.input.relType.value;
  if (
    project.expressions.length !== 1 ||
    project.input?.relType.case !== 'aggregate' ||
    project.common?.relAnchor == null ||
    project.common.relAnchor <= 0 ||
    project.common.emitKind.case !== 'emit' ||
    project.common.emitKind.value.outputMapping.join(',') !== '0,1,2' ||
    project.common.hint != null ||
    project.common.advancedExtension != null ||
    project.advancedExtension != null
  ) {
    return null;
  }
  const expression = project.expressions[0]?.rexType;
  if (expression?.case !== 'windowFunction') return null;
  const windowFunction = expression.value;
  if (
    !isDvtSubstraitRowNumberFunction(draft.plan, windowFunction) ||
    windowFunction.partitions.length !== 0 ||
    windowFunction.sorts.length !== 2 ||
    readFieldReferenceOrdinal(windowFunction.sorts[0]?.expr) !== 1 ||
    windowFunction.sorts[0]?.sortKind.case !== 'direction' ||
    windowFunction.sorts[0].sortKind.value !== SortField_SortDirection.DESC_NULLS_LAST ||
    readFieldReferenceOrdinal(windowFunction.sorts[1]?.expr) !== 0 ||
    windowFunction.sorts[1]?.sortKind.case !== 'direction' ||
    windowFunction.sorts[1].sortKind.value !== SortField_SortDirection.ASC_NULLS_LAST
  ) {
    return null;
  }

  const relationBindings = draft.sidecar.relations.filter(
    (relation) => relation.relAnchor === project.common?.relAnchor
  );
  const relationBinding = relationBindings.length === 1 ? relationBindings[0] : null;
  const aggregateAnchor = project.input.relType.value.common?.relAnchor;
  const aggregateBinding =
    aggregateAnchor == null
      ? null
      : (draft.sidecar.relations.find((relation) => relation.relAnchor === aggregateAnchor) ??
        null);
  if (
    relationBinding == null ||
    aggregateBinding == null ||
    relationBinding.relationId === aggregateBinding.relationId
  ) {
    return null;
  }

  const outerFields = draft.sidecar.fields
    .filter((field) => field.relationId === relationBinding.relationId)
    .sort((left, right) => left.outputOrdinal - right.outputOrdinal);
  const resultField = outerFields[2];
  if (
    outerFields.length !== 3 ||
    resultField == null ||
    resultField.outputOrdinal !== 2 ||
    resultField.displayName !== root.names[2]
  ) {
    return null;
  }
  const resultFieldId = resultField.fieldId;
  const baseDraft = restoreAggregateDraft(
    draft,
    aggregateBinding.relationId,
    relationBinding.relationId,
    resultFieldId
  );
  if (baseDraft == null) return null;
  const baseInspection = inspectDvtSubstraitPilotAggregationDraft(baseDraft);
  if (!baseInspection.ok || relationBinding.displayName !== baseInspection.projection.sourceName) {
    return null;
  }

  const expectedOutputs = [
    {
      name: baseInspection.projection.groupField.name,
      fieldId: baseInspection.projection.groupField.fieldId,
      outputOrdinal: 0,
    },
    {
      name: baseInspection.projection.measure.name,
      fieldId: baseInspection.projection.measure.fieldId,
      outputOrdinal: 1,
    },
    { name: root.names[2]!, fieldId: resultFieldId, outputOrdinal: 2 },
  ];
  if (
    outerFields.some(
      (field, outputOrdinal) =>
        field.fieldId !== expectedOutputs[outputOrdinal]?.fieldId ||
        field.displayName !== expectedOutputs[outputOrdinal]?.name ||
        field.outputOrdinal !== outputOrdinal
    ) ||
    root.names.some((name, outputOrdinal) => name !== expectedOutputs[outputOrdinal]?.name)
  ) {
    return null;
  }

  return {
    baseDraft,
    baseProjection: baseInspection.projection,
    projection: {
      sourceName: baseInspection.projection.sourceName,
      groupField: {
        name: expectedOutputs[0]!.name,
        fieldId: expectedOutputs[0]!.fieldId,
        inputOrdinal: 0,
      },
      measure: {
        name: expectedOutputs[1]!.name,
        fieldId: expectedOutputs[1]!.fieldId,
        inputOrdinal: 1,
      },
      result: {
        name: expectedOutputs[2]!.name,
        fieldId: resultFieldId,
        capabilityId: DVT_SUBSTRAIT_ROW_NUMBER_CAPABILITY_ID,
      },
      outputs: expectedOutputs,
    },
  };
}

export function inspectDvtSubstraitPilotAggregateWindowDraft(
  draft: DvtSubstraitPilotDraft
): DvtSubstraitPilotAggregateWindowInspection {
  const valid = inspectValidAggregateWindow(draft);
  return valid == null ? { ok: false } : { ok: true, projection: valid.projection };
}

export function applyDvtSubstraitPilotAggregateRowNumber(
  draft: DvtSubstraitPilotDraft,
  args: Readonly<{ outputName: string }>
): DvtSubstraitPilotDraft {
  const aggregateInspection = inspectDvtSubstraitPilotAggregationDraft(draft);
  const outputName = args.outputName.trim();
  if (
    !aggregateInspection.ok ||
    outputName.length === 0 ||
    aggregateInspection.projection.outputs.some((output) => output.name === outputName)
  ) {
    return draft;
  }

  const plan = clonePlan(draft.plan);
  const root = plan.relations[0]?.relType;
  if (root?.case !== 'root' || root.value.input?.relType.case !== 'aggregate') return draft;
  const aggregateRelation = root.value.input.relType;
  if (aggregateRelation.case !== 'aggregate') return draft;
  const aggregate = root.value.input;
  const aggregateAnchor = aggregateRelation.value.common?.relAnchor;
  const aggregateBinding =
    aggregateAnchor == null
      ? null
      : (draft.sidecar.relations.find((relation) => relation.relAnchor === aggregateAnchor) ??
        null);
  if (aggregateBinding == null) return draft;
  const relationAnchor =
    Math.max(0, ...draft.sidecar.relations.map((relation) => relation.relAnchor)) + 1;
  const functionReference = ensureDvtSubstraitRowNumberFunction(plan);
  root.value.input = create(RelSchema, {
    relType: {
      case: 'project',
      value: create(ProjectRelSchema, {
        common: create(RelCommonSchema, {
          relAnchor: relationAnchor,
          emitKind: {
            case: 'emit',
            value: create(RelCommon_EmitSchema, { outputMapping: [0, 1, 2] }),
          },
        }),
        input: aggregate,
        expressions: [
          create(ExpressionSchema, {
            rexType: {
              case: 'windowFunction',
              value: create(Expression_WindowFunctionSchema, {
                functionReference,
                outputType: createDvtSubstraitNullableI64Type(),
                phase: AggregationPhase.INITIAL_TO_RESULT,
                invocation: AggregateFunction_AggregationInvocation.ALL,
                sorts: [
                  create(SortFieldSchema, {
                    expr: fieldReference(1),
                    sortKind: {
                      case: 'direction',
                      value: SortField_SortDirection.DESC_NULLS_LAST,
                    },
                  }),
                  create(SortFieldSchema, {
                    expr: fieldReference(0),
                    sortKind: {
                      case: 'direction',
                      value: SortField_SortDirection.ASC_NULLS_LAST,
                    },
                  }),
                ],
                boundsType: Expression_WindowFunction_BoundsType.UNSPECIFIED,
              }),
            },
          }),
        ],
      }),
    },
  });
  root.value.names.push(outputName);

  const relationId = allocateDvtRelationId();
  const resultFieldId = allocateDvtFieldId();
  const sidecar: DvtSubstraitAuthoringSidecarV1 = {
    ...draft.sidecar,
    relations: [
      ...draft.sidecar.relations,
      {
        relationId,
        relAnchor: relationAnchor,
        displayName: aggregateInspection.projection.sourceName,
      },
    ],
    fields: [
      ...draft.sidecar.fields.map((field) =>
        field.relationId === aggregateBinding.relationId ? { ...field, relationId } : field
      ),
      { fieldId: resultFieldId, relationId, outputOrdinal: 2, displayName: outputName },
    ],
  };
  const composed = { plan, sidecar };
  return inspectValidAggregateWindow(composed) == null ? draft : composed;
}

export function renameDvtSubstraitPilotAggregateRowNumberOutput(
  draft: DvtSubstraitPilotDraft,
  outputName: string
): DvtSubstraitPilotDraft {
  const valid = inspectValidAggregateWindow(draft);
  const normalized = outputName.trim();
  if (
    valid == null ||
    normalized.length === 0 ||
    valid.projection.outputs.slice(0, 2).some((output) => output.name === normalized)
  ) {
    return draft;
  }
  const plan = clonePlan(draft.plan);
  const root = plan.relations[0]?.relType;
  if (root?.case !== 'root') return draft;
  root.value.names[2] = normalized;
  const sidecar: DvtSubstraitAuthoringSidecarV1 = {
    ...draft.sidecar,
    fields: draft.sidecar.fields.map((field) =>
      field.fieldId === valid.projection.result.fieldId
        ? { ...field, displayName: normalized }
        : field
    ),
  };
  const renamed = { plan, sidecar };
  return inspectValidAggregateWindow(renamed) == null ? draft : renamed;
}

export function removeDvtSubstraitPilotAggregateRowNumber(
  draft: DvtSubstraitPilotDraft
): DvtSubstraitPilotDraft {
  return inspectValidAggregateWindow(draft)?.baseDraft ?? draft;
}
