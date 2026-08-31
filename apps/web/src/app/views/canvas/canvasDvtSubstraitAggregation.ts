/** Owned concern: author and inspect only the first admitted Substrait grouping/count shape. */
import { create, fromBinary, toBinary } from '@bufbuild/protobuf';
import {
  AggregateFunctionSchema,
  AggregateFunction_AggregationInvocation,
  AggregateRelSchema,
  AggregateRel_GroupingSchema,
  AggregateRel_MeasureSchema,
  AggregationPhase,
  ExpressionSchema,
  Expression_FieldReferenceSchema,
  Expression_FieldReference_RootReferenceSchema,
  Expression_ReferenceSegmentSchema,
  Expression_ReferenceSegment_StructFieldSchema,
  RelCommonSchema,
  RelSchema,
  type AggregateRel,
  type Expression,
} from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import {
  SimpleExtensionDeclarationSchema,
  SimpleExtensionDeclaration_ExtensionFunctionSchema,
  SimpleExtensionURNSchema,
} from '@buf/substrait_substrait.bufbuild_es/substrait/extensions/extensions_pb.js';
import { PlanSchema, type Plan } from '@buf/substrait_substrait.bufbuild_es/substrait/plan_pb.js';
import {
  TypeSchema,
  Type_I64Schema,
  Type_Nullability,
} from '@buf/substrait_substrait.bufbuild_es/substrait/type_pb.js';
import {
  DVT_SUBSTRAIT_CAPABILITY_CATALOG_V1,
  buildDvtSubstraitStandardCapabilityId,
  type DvtSubstraitAuthoringSidecarV1,
} from '@dvt/contracts';

import {
  inspectDvtSubstraitPilotDraft,
  type DvtSubstraitPilotDraft,
} from './canvasDvtSubstraitPilot';

const COUNT_URN = 'extension:io.substrait:functions_aggregate_generic';
const COUNT_NAME = 'count';
export const DVT_SUBSTRAIT_COUNT_CAPABILITY_ID = buildDvtSubstraitStandardCapabilityId(
  'aggregate-function',
  {
    sourceKind: 'simple-extension',
    urn: COUNT_URN,
    name: COUNT_NAME,
  }
);

export type DvtSubstraitPilotAggregationProjection = Readonly<{
  sourceName: string;
  groupField: Readonly<{
    name: string;
    fieldId: string;
    inputOrdinal: number;
  }>;
  measure: Readonly<{
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

export type DvtSubstraitPilotAggregationInspection =
  | Readonly<{ ok: true; projection: DvtSubstraitPilotAggregationProjection }>
  | Readonly<{ ok: false }>;

type ValidAggregation = Readonly<{
  projection: DvtSubstraitPilotAggregationProjection;
  baseDraft: DvtSubstraitPilotDraft;
}>;

function clonePlan(plan: Plan): Plan {
  return fromBinary(PlanSchema, toBinary(PlanSchema, plan));
}

export function createDvtSubstraitFieldReference(ordinal: number): Expression {
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

export function readDvtSubstraitFieldReferenceOrdinal(
  expression: Expression | undefined
): number | null {
  if (expression?.rexType.case !== 'selection') return null;
  const selection = expression.rexType.value;
  if (selection.rootType.case !== 'rootReference') return null;
  if (selection.referenceType.case !== 'directReference') return null;
  const segment = selection.referenceType.value.referenceType;
  if (segment.case !== 'structField' || segment.value.child != null) return null;
  return segment.value.field;
}

export function createDvtSubstraitRequiredI64Type() {
  return create(TypeSchema, {
    kind: {
      case: 'i64',
      value: create(Type_I64Schema, { nullability: Type_Nullability.REQUIRED }),
    },
  });
}

function resolveExtensionUrn(plan: Plan, extensionUrnReference: number): string | null {
  return (
    plan.extensionUrns.find((entry) => entry.extensionUrnAnchor === extensionUrnReference)?.urn ??
    null
  );
}

function requireAggregateCapabilities(): void {
  const requiredIds = [
    buildDvtSubstraitStandardCapabilityId('relation', {
      sourceKind: 'core',
      message: 'substrait.AggregateRel',
    }),
    DVT_SUBSTRAIT_COUNT_CAPABILITY_ID,
    buildDvtSubstraitStandardCapabilityId('type', {
      sourceKind: 'core',
      message: 'substrait.Type',
      selector: 'kind.i64',
    }),
  ];
  const supportedIds = new Set(
    DVT_SUBSTRAIT_CAPABILITY_CATALOG_V1.entries.flatMap((entry) =>
      entry.kind === 'standard' && entry.profileStatus === 'supported-profile'
        ? [entry.entryId]
        : []
    )
  );
  if (!requiredIds.every((entryId) => supportedIds.has(entryId))) {
    throw new Error('Substrait grouping/count capabilities are not admitted.');
  }
}

export function ensureDvtSubstraitCountFunction(plan: Plan): number {
  requireAggregateCapabilities();
  const existing = plan.extensions.find(
    (entry) =>
      entry.mappingType.case === 'extensionFunction' &&
      entry.mappingType.value.name === COUNT_NAME &&
      resolveExtensionUrn(plan, entry.mappingType.value.extensionUrnReference) === COUNT_URN
  );
  if (existing?.mappingType.case === 'extensionFunction') {
    return existing.mappingType.value.functionAnchor;
  }

  let urn = plan.extensionUrns.find((entry) => entry.urn === COUNT_URN);
  if (urn == null) {
    urn = create(SimpleExtensionURNSchema, {
      extensionUrnAnchor:
        Math.max(0, ...plan.extensionUrns.map((entry) => entry.extensionUrnAnchor)) + 1,
      urn: COUNT_URN,
    });
    plan.extensionUrns.push(urn);
  }
  const functionAnchor =
    Math.max(
      0,
      ...plan.extensions.flatMap((entry) =>
        entry.mappingType.case === 'extensionFunction'
          ? [entry.mappingType.value.functionAnchor]
          : []
      )
    ) + 1;
  plan.extensions.push(
    create(SimpleExtensionDeclarationSchema, {
      mappingType: {
        case: 'extensionFunction',
        value: create(SimpleExtensionDeclaration_ExtensionFunctionSchema, {
          extensionUrnReference: urn.extensionUrnAnchor,
          functionAnchor,
          name: COUNT_NAME,
        }),
      },
    })
  );
  return functionAnchor;
}

export function isDvtSubstraitCountFunction(plan: Plan, aggregate: AggregateRel): boolean {
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
  const declaration = plan.extensions.find(
    (entry) =>
      entry.mappingType.case === 'extensionFunction' &&
      entry.mappingType.value.functionAnchor === fn.functionReference
  );
  return (
    declaration?.mappingType.case === 'extensionFunction' &&
    declaration.mappingType.value.name === COUNT_NAME &&
    resolveExtensionUrn(plan, declaration.mappingType.value.extensionUrnReference) === COUNT_URN
  );
}

export function removeDvtSubstraitCountExtension(plan: Plan): void {
  plan.extensions = plan.extensions.filter(
    (entry) =>
      !(
        entry.mappingType.case === 'extensionFunction' &&
        entry.mappingType.value.name === COUNT_NAME &&
        resolveExtensionUrn(plan, entry.mappingType.value.extensionUrnReference) === COUNT_URN
      )
  );
  const referencedUrnAnchors = new Set(
    plan.extensions.flatMap((entry) =>
      entry.mappingType.case === 'extensionFunction'
        ? [entry.mappingType.value.extensionUrnReference]
        : []
    )
  );
  plan.extensionUrns = plan.extensionUrns.filter(
    (entry) => entry.urn !== COUNT_URN || referencedUrnAnchors.has(entry.extensionUrnAnchor)
  );
}

function parseTargetId(projectRelationId: string): string | null {
  const match = /^relation:(.+):project$/.exec(projectRelationId);
  return match?.[1] ?? null;
}

function inspectValidAggregation(draft: DvtSubstraitPilotDraft): ValidAggregation | null {
  const rootRelation = draft.plan.relations.length === 1 ? draft.plan.relations[0]?.relType : null;
  if (rootRelation?.case !== 'root') return null;
  const root = rootRelation.value;
  if (
    root.names.length !== 2 ||
    root.names.some((name) => name.trim().length === 0) ||
    root.names[0] === root.names[1] ||
    root.input?.relType.case !== 'aggregate'
  ) {
    return null;
  }
  const aggregate = root.input.relType.value;
  const aggregateAnchor = aggregate.common?.relAnchor;
  if (
    aggregateAnchor == null ||
    aggregateAnchor <= 0 ||
    aggregate.common?.emitKind.case !== undefined ||
    aggregate.common?.hint != null ||
    aggregate.common?.advancedExtension != null ||
    aggregate.advancedExtension != null ||
    aggregate.groupings.length !== 1 ||
    aggregate.groupings[0]?.expressionReferences.join(',') !== '0' ||
    aggregate.groupingExpressions.length !== 1 ||
    aggregate.measures.length !== 1 ||
    aggregate.input?.relType.case !== 'project' ||
    !isDvtSubstraitCountFunction(draft.plan, aggregate)
  ) {
    return null;
  }
  const groupInputOrdinal = readDvtSubstraitFieldReferenceOrdinal(aggregate.groupingExpressions[0]);
  if (groupInputOrdinal == null || groupInputOrdinal < 0 || groupInputOrdinal > 2) return null;
  const projectAnchor = aggregate.input.relType.value.common?.relAnchor;
  if (projectAnchor == null || projectAnchor <= 0) return null;
  const projectBinding = draft.sidecar.relations.find(
    (relation) => relation.relAnchor === projectAnchor
  );
  const aggregateBinding = draft.sidecar.relations.find(
    (relation) => relation.relAnchor === aggregateAnchor
  );
  if (projectBinding == null || aggregateBinding == null) return null;
  const targetId = parseTargetId(projectBinding.relationId);
  if (targetId == null || aggregateBinding.relationId !== `relation:${targetId}:aggregate`) {
    return null;
  }
  const aggregateFields = draft.sidecar.fields
    .filter((field) => field.relationId === aggregateBinding.relationId)
    .sort((left, right) => left.outputOrdinal - right.outputOrdinal);
  const groupField = aggregateFields[0];
  const countField = aggregateFields[1];
  if (
    aggregateFields.length !== 2 ||
    groupField?.outputOrdinal !== 0 ||
    groupField.displayName !== root.names[0] ||
    countField?.outputOrdinal !== 1 ||
    countField.fieldId !== `field:${targetId}:count` ||
    countField.displayName !== root.names[1]
  ) {
    return null;
  }

  const baseNames = Array.from({ length: 3 }, (_, outputOrdinal) => {
    if (outputOrdinal === groupInputOrdinal) return root.names[0];
    return draft.sidecar.fields.find(
      (field) =>
        field.relationId === projectBinding.relationId && field.outputOrdinal === outputOrdinal
    )?.displayName;
  });
  if (baseNames.some((name) => name == null)) return null;
  const basePlan = clonePlan(draft.plan);
  const baseRoot = basePlan.relations[0]?.relType;
  if (baseRoot?.case !== 'root' || baseRoot.value.input?.relType.case !== 'aggregate') return null;
  baseRoot.value.input = baseRoot.value.input.relType.value.input;
  baseRoot.value.names = baseNames.filter((name): name is string => name != null);
  removeDvtSubstraitCountExtension(basePlan);
  const baseSidecar: DvtSubstraitAuthoringSidecarV1 = {
    ...draft.sidecar,
    relations: draft.sidecar.relations.filter(
      (relation) => relation.relationId !== aggregateBinding.relationId
    ),
    fields: draft.sidecar.fields.flatMap((field) => {
      if (field.fieldId === countField.fieldId) return [];
      if (field.fieldId !== groupField.fieldId) return [field];
      return [
        {
          ...field,
          relationId: projectBinding.relationId,
          outputOrdinal: groupInputOrdinal,
          displayName: root.names[0],
        },
      ];
    }),
  };
  const baseDraft = { plan: basePlan, sidecar: baseSidecar };
  const baseInspection = inspectDvtSubstraitPilotDraft(baseDraft);
  if (!baseInspection.ok) return null;
  return {
    baseDraft,
    projection: {
      sourceName: baseInspection.projection.sourceName,
      groupField: {
        name: root.names[0]!,
        fieldId: groupField.fieldId,
        inputOrdinal: groupInputOrdinal,
      },
      measure: {
        name: root.names[1]!,
        fieldId: countField.fieldId,
        capabilityId: DVT_SUBSTRAIT_COUNT_CAPABILITY_ID,
      },
      outputs: [
        { name: root.names[0]!, fieldId: groupField.fieldId, outputOrdinal: 0 },
        { name: root.names[1]!, fieldId: countField.fieldId, outputOrdinal: 1 },
      ],
    },
  };
}

export function inspectDvtSubstraitPilotAggregationDraft(
  draft: DvtSubstraitPilotDraft
): DvtSubstraitPilotAggregationInspection {
  const valid = inspectValidAggregation(draft);
  return valid == null ? { ok: false } : { ok: true, projection: valid.projection };
}

export function applyDvtSubstraitPilotAggregation(
  draft: DvtSubstraitPilotDraft,
  args: Readonly<{ groupFieldId: string; countOutputName: string }>
): DvtSubstraitPilotDraft {
  const inspection = inspectDvtSubstraitPilotDraft(draft);
  const countOutputName = args.countOutputName.trim();
  if (!inspection.ok || countOutputName.length === 0) return draft;
  const groupField = inspection.projection.outputs.find(
    (output) => output.fieldId === args.groupFieldId
  );
  if (groupField == null || groupField.name === countOutputName) return draft;

  const plan = clonePlan(draft.plan);
  const root = plan.relations[0]?.relType;
  if (root?.case !== 'root' || root.value.input?.relType.case !== 'project') return draft;
  const project = root.value.input;
  const projectRelation = project.relType;
  if (projectRelation.case !== 'project') return draft;
  const projectAnchor = projectRelation.value.common?.relAnchor;
  if (projectAnchor == null || projectAnchor <= 0) return draft;
  const projectBinding = draft.sidecar.relations.find(
    (relation) => relation.relAnchor === projectAnchor
  );
  const targetId = projectBinding == null ? null : parseTargetId(projectBinding.relationId);
  if (projectBinding == null || targetId == null) return draft;

  const aggregateAnchor =
    Math.max(0, ...draft.sidecar.relations.map((relation) => relation.relAnchor)) + 1;
  const countFunctionReference = ensureDvtSubstraitCountFunction(plan);
  root.value.input = create(RelSchema, {
    relType: {
      case: 'aggregate',
      value: create(AggregateRelSchema, {
        common: create(RelCommonSchema, { relAnchor: aggregateAnchor }),
        input: project,
        groupings: [create(AggregateRel_GroupingSchema, { expressionReferences: [0] })],
        groupingExpressions: [createDvtSubstraitFieldReference(groupField.outputOrdinal)],
        measures: [
          create(AggregateRel_MeasureSchema, {
            measure: create(AggregateFunctionSchema, {
              functionReference: countFunctionReference,
              outputType: createDvtSubstraitRequiredI64Type(),
              phase: AggregationPhase.INITIAL_TO_RESULT,
              invocation: AggregateFunction_AggregationInvocation.ALL,
            }),
          }),
        ],
      }),
    },
  });
  root.value.names = [groupField.name, countOutputName];
  const aggregateRelationId = `relation:${targetId}:aggregate`;
  const sidecar: DvtSubstraitAuthoringSidecarV1 = {
    ...draft.sidecar,
    relations: [
      ...draft.sidecar.relations,
      {
        relationId: aggregateRelationId,
        relAnchor: aggregateAnchor,
        displayName: inspection.projection.sourceName,
      },
    ],
    fields: [
      ...draft.sidecar.fields.map((field) =>
        field.fieldId === groupField.fieldId
          ? {
              ...field,
              relationId: aggregateRelationId,
              outputOrdinal: 0,
              displayName: groupField.name,
            }
          : field
      ),
      {
        fieldId: `field:${targetId}:count`,
        relationId: aggregateRelationId,
        outputOrdinal: 1,
        displayName: countOutputName,
      },
    ],
  };
  const grouped = { plan, sidecar };
  return inspectValidAggregation(grouped) == null ? draft : grouped;
}

export function renameDvtSubstraitPilotCountOutput(
  draft: DvtSubstraitPilotDraft,
  outputName: string
): DvtSubstraitPilotDraft {
  const valid = inspectValidAggregation(draft);
  const normalized = outputName.trim();
  if (valid == null || normalized.length === 0 || normalized === valid.projection.groupField.name) {
    return draft;
  }
  const plan = clonePlan(draft.plan);
  const root = plan.relations[0]?.relType;
  if (root?.case !== 'root') return draft;
  root.value.names[1] = normalized;
  const sidecar: DvtSubstraitAuthoringSidecarV1 = {
    ...draft.sidecar,
    fields: draft.sidecar.fields.map((field) =>
      field.fieldId === valid.projection.measure.fieldId
        ? { ...field, displayName: normalized }
        : field
    ),
  };
  const renamed = { plan, sidecar };
  return inspectValidAggregation(renamed) == null ? draft : renamed;
}

export function removeDvtSubstraitPilotAggregation(
  draft: DvtSubstraitPilotDraft
): DvtSubstraitPilotDraft {
  return inspectValidAggregation(draft)?.baseDraft ?? draft;
}
