/** Owned concern: author and inspect only the first admitted Substrait row-number window shape. */
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
  SortFieldSchema,
  SortField_SortDirection,
  type Expression,
  type Expression_WindowFunction,
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

const ROW_NUMBER_URN = 'extension:io.substrait:functions_arithmetic';
const ROW_NUMBER_NAME = 'row_number';
export const DVT_SUBSTRAIT_ROW_NUMBER_CAPABILITY_ID = buildDvtSubstraitStandardCapabilityId(
  'window-function',
  {
    sourceKind: 'simple-extension',
    urn: ROW_NUMBER_URN,
    name: 'row_number',
  }
);

type WindowFieldProjection = Readonly<{
  name: string;
  fieldId: string;
  inputOrdinal: number;
}>;

export type DvtSubstraitPilotWindowProjection = Readonly<{
  sourceName: string;
  partitionField: WindowFieldProjection;
  orderField: WindowFieldProjection;
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

export type DvtSubstraitPilotWindowInspection =
  Readonly<{ ok: true; projection: DvtSubstraitPilotWindowProjection }> | Readonly<{ ok: false }>;

type ValidWindow = Readonly<{
  projection: DvtSubstraitPilotWindowProjection;
  baseDraft: DvtSubstraitPilotDraft;
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
  if (selection.rootType.case !== 'rootReference') return null;
  if (selection.referenceType.case !== 'directReference') return null;
  const segment = selection.referenceType.value.referenceType;
  if (segment.case !== 'structField' || segment.value.child != null) return null;
  return segment.value.field;
}

export function createDvtSubstraitNullableI64Type() {
  return create(TypeSchema, {
    kind: {
      case: 'i64',
      value: create(Type_I64Schema, { nullability: Type_Nullability.NULLABLE }),
    },
  });
}

function resolveExtensionUrn(plan: Plan, extensionUrnReference: number): string | null {
  return (
    plan.extensionUrns.find((entry) => entry.extensionUrnAnchor === extensionUrnReference)?.urn ??
    null
  );
}

function requireWindowCapabilities(): void {
  const requiredIds = [
    buildDvtSubstraitStandardCapabilityId('expression-form', {
      sourceKind: 'core',
      message: 'substrait.Expression',
      selector: 'rex_type.window_function',
    }),
    DVT_SUBSTRAIT_ROW_NUMBER_CAPABILITY_ID,
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
    throw new Error('Substrait row-number window capabilities are not admitted.');
  }
}

export function ensureDvtSubstraitRowNumberFunction(plan: Plan): number {
  requireWindowCapabilities();
  const existing = plan.extensions.find(
    (entry) =>
      entry.mappingType.case === 'extensionFunction' &&
      entry.mappingType.value.name === ROW_NUMBER_NAME &&
      resolveExtensionUrn(plan, entry.mappingType.value.extensionUrnReference) === ROW_NUMBER_URN
  );
  if (existing?.mappingType.case === 'extensionFunction') {
    return existing.mappingType.value.functionAnchor;
  }

  let urn = plan.extensionUrns.find((entry) => entry.urn === ROW_NUMBER_URN);
  if (urn == null) {
    urn = create(SimpleExtensionURNSchema, {
      extensionUrnAnchor:
        Math.max(0, ...plan.extensionUrns.map((entry) => entry.extensionUrnAnchor)) + 1,
      urn: ROW_NUMBER_URN,
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
          name: ROW_NUMBER_NAME,
        }),
      },
    })
  );
  return functionAnchor;
}

export function isDvtSubstraitRowNumberFunction(
  plan: Plan,
  fn: Expression_WindowFunction
): boolean {
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
      resolveExtensionUrn(plan, entry.mappingType.value.extensionUrnReference) === ROW_NUMBER_URN
  );
  if (
    declarations.length !== 1 ||
    plan.extensionUrns.filter((entry) => entry.urn === ROW_NUMBER_URN).length !== 1
  ) {
    return false;
  }
  const declaration = declarations[0];
  return (
    declaration?.mappingType.case === 'extensionFunction' &&
    declaration.mappingType.value.functionAnchor === fn.functionReference &&
    declaration.mappingType.value.name === ROW_NUMBER_NAME &&
    resolveExtensionUrn(plan, declaration.mappingType.value.extensionUrnReference) ===
      ROW_NUMBER_URN
  );
}

function parseTargetId(projectRelationId: string): string | null {
  const match = /^relation:(.+):project$/.exec(projectRelationId);
  return match?.[1] ?? null;
}

export function removeDvtSubstraitRowNumberExtension(plan: Plan): void {
  plan.extensions = plan.extensions.filter(
    (entry) =>
      !(
        entry.mappingType.case === 'extensionFunction' &&
        entry.mappingType.value.name === ROW_NUMBER_NAME &&
        resolveExtensionUrn(plan, entry.mappingType.value.extensionUrnReference) === ROW_NUMBER_URN
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
    (entry) => entry.urn !== ROW_NUMBER_URN || referencedUrnAnchors.has(entry.extensionUrnAnchor)
  );
}

function inspectValidWindow(draft: DvtSubstraitPilotDraft): ValidWindow | null {
  const rootRelation = draft.plan.relations.length === 1 ? draft.plan.relations[0]?.relType : null;
  if (rootRelation?.case !== 'root') return null;
  const root = rootRelation.value;
  if (
    root.names.length !== 4 ||
    root.names.some((name) => name.trim().length === 0) ||
    new Set(root.names).size !== root.names.length ||
    root.input?.relType.case !== 'project'
  ) {
    return null;
  }
  const project = root.input.relType.value;
  if (
    project.expressions.length !== 2 ||
    project.common?.emitKind.case !== 'emit' ||
    project.common.emitKind.value.outputMapping.join(',') !== '3,1,2,4'
  ) {
    return null;
  }
  const windowExpression = project.expressions[1]?.rexType;
  if (windowExpression?.case !== 'windowFunction') return null;
  const windowFunction = windowExpression.value;
  if (
    !isDvtSubstraitRowNumberFunction(draft.plan, windowFunction) ||
    windowFunction.partitions.length !== 1 ||
    windowFunction.sorts.length !== 1 ||
    windowFunction.sorts[0]?.sortKind.case !== 'direction' ||
    windowFunction.sorts[0].sortKind.value !== SortField_SortDirection.ASC_NULLS_LAST
  ) {
    return null;
  }
  const partitionInputOrdinal = readFieldReferenceOrdinal(windowFunction.partitions[0]);
  const orderInputOrdinal = readFieldReferenceOrdinal(windowFunction.sorts[0]?.expr);
  if (
    partitionInputOrdinal == null ||
    orderInputOrdinal == null ||
    partitionInputOrdinal < 0 ||
    partitionInputOrdinal > 2 ||
    orderInputOrdinal < 0 ||
    orderInputOrdinal > 2 ||
    partitionInputOrdinal === orderInputOrdinal
  ) {
    return null;
  }
  const projectAnchor = project.common?.relAnchor;
  if (projectAnchor == null || projectAnchor <= 0) return null;
  const projectBinding = draft.sidecar.relations.find(
    (relation) => relation.relAnchor === projectAnchor
  );
  const targetId = projectBinding == null ? null : parseTargetId(projectBinding.relationId);
  if (projectBinding == null || targetId == null) return null;
  const resultFieldId = `field:${targetId}:row-number`;
  const projectFields = draft.sidecar.fields
    .filter((field) => field.relationId === projectBinding.relationId)
    .sort((left, right) => left.outputOrdinal - right.outputOrdinal);
  const resultField = projectFields[3];
  if (
    projectFields.length !== 4 ||
    resultField?.fieldId !== resultFieldId ||
    resultField.outputOrdinal !== 3 ||
    resultField.displayName !== root.names[3]
  ) {
    return null;
  }

  const basePlan = clonePlan(draft.plan);
  const baseRoot = basePlan.relations[0]?.relType;
  if (baseRoot?.case !== 'root' || baseRoot.value.input?.relType.case !== 'project') return null;
  baseRoot.value.names = baseRoot.value.names.slice(0, 3);
  baseRoot.value.input.relType.value.expressions =
    baseRoot.value.input.relType.value.expressions.slice(0, 1);
  if (baseRoot.value.input.relType.value.common?.emitKind.case !== 'emit') return null;
  baseRoot.value.input.relType.value.common.emitKind.value.outputMapping = [3, 1, 2];
  removeDvtSubstraitRowNumberExtension(basePlan);
  const baseSidecar: DvtSubstraitAuthoringSidecarV1 = {
    ...draft.sidecar,
    fields: draft.sidecar.fields.filter((field) => field.fieldId !== resultFieldId),
  };
  const baseDraft = { plan: basePlan, sidecar: baseSidecar };
  const baseInspection = inspectDvtSubstraitPilotDraft(baseDraft);
  if (!baseInspection.ok) return null;
  const partitionField = baseInspection.projection.outputs[partitionInputOrdinal];
  const orderField = baseInspection.projection.outputs[orderInputOrdinal];
  if (partitionField == null || orderField == null) return null;
  const outputs = [
    ...baseInspection.projection.outputs,
    { name: root.names[3]!, fieldId: resultFieldId, outputOrdinal: 3 },
  ];
  if (
    projectFields.some(
      (field, outputOrdinal) =>
        field.fieldId !== outputs[outputOrdinal]?.fieldId ||
        field.displayName !== outputs[outputOrdinal]?.name
    )
  ) {
    return null;
  }
  return {
    baseDraft,
    projection: {
      sourceName: baseInspection.projection.sourceName,
      partitionField: {
        name: partitionField.name,
        fieldId: partitionField.fieldId,
        inputOrdinal: partitionInputOrdinal,
      },
      orderField: {
        name: orderField.name,
        fieldId: orderField.fieldId,
        inputOrdinal: orderInputOrdinal,
      },
      result: {
        name: root.names[3]!,
        fieldId: resultFieldId,
        capabilityId: DVT_SUBSTRAIT_ROW_NUMBER_CAPABILITY_ID,
      },
      outputs,
    },
  };
}

export function inspectDvtSubstraitPilotWindowDraft(
  draft: DvtSubstraitPilotDraft
): DvtSubstraitPilotWindowInspection {
  const valid = inspectValidWindow(draft);
  return valid == null ? { ok: false } : { ok: true, projection: valid.projection };
}

export function applyDvtSubstraitPilotRowNumber(
  draft: DvtSubstraitPilotDraft,
  args: Readonly<{ partitionFieldId: string; orderFieldId: string; outputName: string }>
): DvtSubstraitPilotDraft {
  const inspection = inspectDvtSubstraitPilotDraft(draft);
  const outputName = args.outputName.trim();
  if (!inspection.ok || outputName.length === 0) return draft;
  const partitionField = inspection.projection.outputs.find(
    (output) => output.fieldId === args.partitionFieldId
  );
  const orderField = inspection.projection.outputs.find(
    (output) => output.fieldId === args.orderFieldId
  );
  if (
    partitionField == null ||
    orderField == null ||
    partitionField.fieldId === orderField.fieldId ||
    inspection.projection.outputs.some((output) => output.name === outputName)
  ) {
    return draft;
  }

  const plan = clonePlan(draft.plan);
  const root = plan.relations[0]?.relType;
  if (root?.case !== 'root' || root.value.input?.relType.case !== 'project') return draft;
  const project = root.value.input.relType.value;
  if (project.common?.emitKind.case !== 'emit') return draft;
  const projectBinding = draft.sidecar.relations.find(
    (relation) => relation.relAnchor === project.common?.relAnchor
  );
  const targetId = projectBinding == null ? null : parseTargetId(projectBinding.relationId);
  if (projectBinding == null || targetId == null) return draft;
  const functionReference = ensureDvtSubstraitRowNumberFunction(plan);
  project.expressions.push(
    create(ExpressionSchema, {
      rexType: {
        case: 'windowFunction',
        value: create(Expression_WindowFunctionSchema, {
          functionReference,
          outputType: createDvtSubstraitNullableI64Type(),
          phase: AggregationPhase.INITIAL_TO_RESULT,
          invocation: AggregateFunction_AggregationInvocation.ALL,
          partitions: [fieldReference(partitionField.outputOrdinal)],
          sorts: [
            create(SortFieldSchema, {
              expr: fieldReference(orderField.outputOrdinal),
              sortKind: {
                case: 'direction',
                value: SortField_SortDirection.ASC_NULLS_LAST,
              },
            }),
          ],
          boundsType: Expression_WindowFunction_BoundsType.UNSPECIFIED,
        }),
      },
    })
  );
  project.common.emitKind.value.outputMapping = [3, 1, 2, 4];
  root.value.names.push(outputName);
  const sidecar: DvtSubstraitAuthoringSidecarV1 = {
    ...draft.sidecar,
    fields: [
      ...draft.sidecar.fields,
      {
        fieldId: `field:${targetId}:row-number`,
        relationId: projectBinding.relationId,
        outputOrdinal: 3,
        displayName: outputName,
      },
    ],
  };
  const windowed = { plan, sidecar };
  return inspectValidWindow(windowed) == null ? draft : windowed;
}

export function renameDvtSubstraitPilotRowNumberOutput(
  draft: DvtSubstraitPilotDraft,
  outputName: string
): DvtSubstraitPilotDraft {
  const valid = inspectValidWindow(draft);
  const normalized = outputName.trim();
  if (
    valid == null ||
    normalized.length === 0 ||
    valid.projection.outputs.slice(0, 3).some((output) => output.name === normalized)
  ) {
    return draft;
  }
  const plan = clonePlan(draft.plan);
  const root = plan.relations[0]?.relType;
  if (root?.case !== 'root') return draft;
  root.value.names[3] = normalized;
  const sidecar: DvtSubstraitAuthoringSidecarV1 = {
    ...draft.sidecar,
    fields: draft.sidecar.fields.map((field) =>
      field.fieldId === valid.projection.result.fieldId
        ? { ...field, displayName: normalized }
        : field
    ),
  };
  const renamed = { plan, sidecar };
  return inspectValidWindow(renamed) == null ? draft : renamed;
}

export function removeDvtSubstraitPilotRowNumber(
  draft: DvtSubstraitPilotDraft
): DvtSubstraitPilotDraft {
  return inspectValidWindow(draft)?.baseDraft ?? draft;
}
