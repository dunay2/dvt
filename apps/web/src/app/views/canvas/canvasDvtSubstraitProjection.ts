/** Owned concern: author and inspect one connected-source field projection as canonical Substrait. */
import { create, fromBinary, toBinary } from '@bufbuild/protobuf';
import {
  ExpressionSchema,
  Expression_FieldReferenceSchema,
  Expression_FieldReference_RootReferenceSchema,
  Expression_ReferenceSegmentSchema,
  Expression_ReferenceSegment_StructFieldSchema,
  Expression_ScalarFunctionSchema,
  FunctionArgumentSchema,
  FunctionOptionSchema,
  ProjectRelSchema,
  ReadRelSchema,
  ReadRel_NamedTableSchema,
  RelCommonSchema,
  RelCommon_EmitSchema,
  RelRootSchema,
  RelSchema,
  type Expression,
  type ProjectRel,
  type ReadRel,
  type RelCommon,
} from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import {
  PlanRelSchema,
  PlanSchema,
  type Plan,
} from '@buf/substrait_substrait.bufbuild_es/substrait/plan_pb.js';
import {
  SimpleExtensionDeclarationSchema,
  SimpleExtensionDeclaration_ExtensionFunctionSchema,
  SimpleExtensionURNSchema,
} from '@buf/substrait_substrait.bufbuild_es/substrait/extensions/extensions_pb.js';
import {
  NamedStructSchema,
  TypeSchema,
  Type_Nullability,
  Type_StringSchema,
  Type_StructSchema,
  Type_UnboundSchema,
} from '@buf/substrait_substrait.bufbuild_es/substrait/type_pb.js';
import {
  ConnectedSourceRefSchema,
  DVT_SUBSTRAIT_AUTHORING_SIDECAR_SCHEMA_VERSION,
  DVT_SUBSTRAIT_CAPABILITY_CATALOG_V1,
  DVT_SUBSTRAIT_PROFILE_REF_V1,
  allocateDvtFieldId,
  allocateDvtRelationId,
  type ConnectedSourceRef,
  type DvtSubstraitAuthoringSidecarV1,
  type DvtSubstraitFieldBindingV1,
  type DvtSubstraitSemanticDocumentV1,
} from '@dvt/contracts';

import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import {
  inspectDvtSubstraitCalculatedExpression,
  type DvtSubstraitCalculatedExpression,
} from './canvasDvtSubstraitCalculatedExpression';
import {
  decodeDvtSubstraitSemanticDocument,
  encodeDvtSubstraitSemanticDocument,
} from './canvasDvtSubstraitSemanticDocument';

const ZERO_SHA256 = '0'.repeat(64);

export type DvtSubstraitProjectionField = Readonly<{
  name: string;
  dataType: string;
}>;

export type DvtSubstraitProjectionSource = Readonly<{
  nodeId: string;
  schema: string;
  table: string;
  sourceRef: ConnectedSourceRef;
  fields: readonly DvtSubstraitProjectionField[];
}>;

type DvtSubstraitProjectionSemanticSource = Readonly<{
  schema: string;
  table: string;
  sourceRef: ConnectedSourceRef;
  fields: readonly DvtSubstraitProjectionField[];
}>;

export type DvtSubstraitScalarExpression =
  | Readonly<{ kind: 'field-reference'; sourceFieldName: string }>
  | Readonly<{
      kind: 'scalar-function';
      functionName: 'trim' | 'upper' | 'lower';
      arguments: readonly [DvtSubstraitScalarExpression];
    }>
  | Readonly<{
      kind: 'scalar-function';
      functionName: 'concat';
      arguments: readonly [DvtSubstraitScalarExpression, DvtSubstraitScalarExpression];
      nullHandling: 'ACCEPT_NULLS';
    }>;

export type DvtSubstraitProjectionOutput = Readonly<{
  fieldId: string;
  name: string;
  sourceFieldId?: string;
  sourceFieldName?: string;
  calculation?: DvtSubstraitCalculatedExpression;
  dataType: string;
  outputOrdinal: number;
  operations?: readonly string[];
  description?: string;
  scalarExpression?: DvtSubstraitScalarExpression;
  operandFieldIds?: readonly string[];
}>;

export type DvtSubstraitColumnFunction = Readonly<{
  capabilityId: string;
  name: string;
  category: 'text';
  argumentCount: number;
}>;

export type DvtSubstraitProjectionDraft = Readonly<{
  plan: Plan;
  sidecar: DvtSubstraitAuthoringSidecarV1;
}>;

export type DvtSubstraitProjection = Readonly<{
  targetNodeId: string;
  source: DvtSubstraitProjectionSource;
  outputs: readonly DvtSubstraitProjectionOutput[];
}>;

export type DvtSubstraitProjectionSemantics = Readonly<{
  source: DvtSubstraitProjectionSemanticSource;
  outputs: readonly DvtSubstraitProjectionOutput[];
}>;

export type DvtSubstraitProjectionInspection =
  Readonly<{ ok: true; projection: DvtSubstraitProjectionSemantics }> | Readonly<{ ok: false }>;

export function resolveDvtSubstraitColumnFunctions(args: {
  dataType?: string;
  dataTypes?: readonly string[];
  provider: string;
}): readonly DvtSubstraitColumnFunction[] {
  const stringTypes = new Set([
    'text',
    'string',
    'varchar',
    'character varying',
    'char',
    'character',
    'bpchar',
  ]);
  const normalizedTypes = (args.dataTypes ?? (args.dataType == null ? [] : [args.dataType])).map(
    (dataType) => dataType.trim().toLowerCase().replaceAll(/\s+/g, ' ')
  );
  if (
    args.provider !== 'postgres' ||
    normalizedTypes.length === 0 ||
    normalizedTypes.some((dataType) => !stringTypes.has(dataType))
  ) {
    return [];
  }
  return DVT_SUBSTRAIT_CAPABILITY_CATALOG_V1.entries.flatMap((entry) => {
    if (
      entry.kind !== 'standard' ||
      entry.category !== 'scalar-function' ||
      entry.profileStatus !== 'supported-profile' ||
      entry.identity.sourceKind !== 'simple-extension' ||
      entry.identity.urn !== 'extension:io.substrait:functions_string'
    )
      return [];
    const argumentCount = entry.invocation?.argumentCount ?? 1;
    return argumentCount === normalizedTypes.length
      ? [
          {
            capabilityId: entry.entryId,
            name: entry.identity.name,
            category: 'text' as const,
            argumentCount,
          },
        ]
      : [];
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function readNonblankText(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function readColumns(node: CanonicalNode): readonly DvtSubstraitProjectionField[] | null {
  const columns = node.metadata?.columns;
  if (!Array.isArray(columns)) return null;
  const resolved = columns.map((candidate) => {
    if (!isRecord(candidate)) return null;
    const name = readNonblankText(candidate.name);
    const dataType = readNonblankText(candidate.type ?? candidate.dataType);
    return name == null || dataType == null ? null : { name, dataType };
  });
  return resolved.some((column) => column == null)
    ? null
    : resolved.filter((column) => column != null);
}

export function resolveDvtSubstraitProjectionSource(
  node: CanonicalNode
): DvtSubstraitProjectionSource | null {
  if (node.kind !== 'dvt:source' || node.role !== 'input') return null;
  const sourceRef = ConnectedSourceRefSchema.safeParse(node.metadata?.connectedSourceRef);
  const schema = readNonblankText(node.metadata?.schema);
  const table = readNonblankText(node.metadata?.tableName);
  const fields = readColumns(node);
  if (
    !sourceRef.success ||
    sourceRef.data.connectionRef.provider !== 'postgres' ||
    schema == null ||
    table == null ||
    fields == null ||
    fields.length === 0 ||
    new Set(fields.map((field) => field.name)).size !== fields.length
  ) {
    return null;
  }
  return { nodeId: node.id, schema, table, sourceRef: sourceRef.data, fields };
}

function sameConnectedSourceRef(first: ConnectedSourceRef, second: ConnectedSourceRef): boolean {
  return (
    first.schemaVersion === second.schemaVersion &&
    first.sourceObjectId === second.sourceObjectId &&
    first.connectionRef.schemaVersion === second.connectionRef.schemaVersion &&
    first.connectionRef.provider === second.connectionRef.provider &&
    first.connectionRef.connectionId === second.connectionRef.connectionId
  );
}

function hasPinnedPlanVersion(plan: Plan): boolean {
  return (
    plan.version?.majorNumber === 0 &&
    plan.version.minorNumber === 101 &&
    plan.version.patchNumber === 0
  );
}

function commonHasNoHiddenSemantics(common: RelCommon | undefined): boolean {
  return common != null && common.hint == null && common.advancedExtension == null;
}

function readHasOnlyProjectionSemantics(read: ReadRel): boolean {
  return (
    commonHasNoHiddenSemantics(read.common) &&
    read.common?.emitKind.case === undefined &&
    read.baseSchema != null &&
    read.filter == null &&
    read.bestEffortFilter == null &&
    read.projection == null &&
    read.advancedExtension == null &&
    read.readType.case === 'namedTable' &&
    read.readType.value.advancedExtension == null
  );
}

function projectHasOnlyFieldSelection(project: ProjectRel): boolean {
  return (
    commonHasNoHiddenSemantics(project.common) &&
    project.common?.emitKind.case === 'emit' &&
    project.advancedExtension == null
  );
}

function sortedRelationFields(
  sidecar: DvtSubstraitAuthoringSidecarV1,
  relationId: string
): DvtSubstraitFieldBindingV1[] {
  return [...sidecar.fields]
    .filter((field) => field.relationId === relationId)
    .sort((left, right) => left.outputOrdinal - right.outputOrdinal);
}

export function createDvtSubstraitProjectionDraft(args: {
  source: DvtSubstraitProjectionSource;
  targetNodeId: string;
  outputs: readonly Readonly<{
    fieldId: string;
    name: string;
    sourceFieldName: string;
  }>[];
}): DvtSubstraitProjectionDraft {
  if (args.targetNodeId.trim().length === 0 || args.targetNodeId !== args.targetNodeId.trim()) {
    throw new Error('Substrait projection requires a target identity.');
  }
  const sourceFieldOrdinals = new Map(
    args.source.fields.map((field, ordinal) => [field.name, ordinal] as const)
  );
  const outputMapping = args.outputs.map((output) => {
    const ordinal = sourceFieldOrdinals.get(output.sourceFieldName);
    if (ordinal == null || output.fieldId.trim().length === 0 || output.name.trim().length === 0) {
      throw new Error('Substrait projection output must reference one connected source field.');
    }
    return ordinal;
  });
  if (new Set(args.outputs.map((output) => output.fieldId)).size !== args.outputs.length) {
    throw new Error('Substrait projection output identities must be unique.');
  }

  const stringTypes = new Set([
    'text',
    'string',
    'varchar',
    'character varying',
    'char',
    'character',
    'bpchar',
  ]);
  const sourceTypes = args.source.fields.map((field) => {
    const normalized =
      typeof field.dataType === 'string'
        ? field.dataType.trim().toLowerCase().replaceAll(/\s+/g, ' ')
        : '';
    return create(TypeSchema, {
      kind: stringTypes.has(normalized)
        ? {
            case: 'string',
            value: create(Type_StringSchema, { nullability: Type_Nullability.NULLABLE }),
          }
        : { case: 'unbound', value: create(Type_UnboundSchema) },
    });
  });

  const read = create(RelSchema, {
    relType: {
      case: 'read',
      value: create(ReadRelSchema, {
        common: create(RelCommonSchema, { relAnchor: 1 }),
        baseSchema: create(NamedStructSchema, {
          names: args.source.fields.map((field) => field.name),
          struct: create(Type_StructSchema, {
            types: sourceTypes,
            nullability: Type_Nullability.REQUIRED,
          }),
        }),
        readType: {
          case: 'namedTable',
          value: create(ReadRel_NamedTableSchema, {
            names: [args.source.schema, args.source.table],
          }),
        },
      }),
    },
  });
  const project = create(RelSchema, {
    relType: {
      case: 'project',
      value: create(ProjectRelSchema, {
        common: create(RelCommonSchema, {
          relAnchor: 2,
          emitKind: {
            case: 'emit',
            value: create(RelCommon_EmitSchema, { outputMapping }),
          },
        }),
        input: read,
        expressions: [],
      }),
    },
  });
  const plan = create(PlanSchema, {
    version: {
      majorNumber: 0,
      minorNumber: 101,
      patchNumber: 0,
      producer: 'dvt-vtx2-connected-field-projection',
    },
    relations: [
      create(PlanRelSchema, {
        relType: {
          case: 'root',
          value: create(RelRootSchema, {
            input: project,
            names: args.outputs.map((output) => output.name),
          }),
        },
      }),
    ],
  });
  const sourceRelationId = allocateDvtRelationId();
  const targetRelationId = allocateDvtRelationId();
  const sourceFields = args.source.fields.map((field, outputOrdinal) => ({
    fieldId: allocateDvtFieldId(),
    relationId: sourceRelationId,
    outputOrdinal,
    displayName: field.name,
  }));
  const sourceFieldIdByName = new Map(
    sourceFields.map((field) => [field.displayName, field.fieldId] as const)
  );
  const sidecar: DvtSubstraitAuthoringSidecarV1 = {
    schemaVersion: DVT_SUBSTRAIT_AUTHORING_SIDECAR_SCHEMA_VERSION,
    semanticPlanSha256: ZERO_SHA256,
    relations: [
      {
        relationId: sourceRelationId,
        relAnchor: 1,
        sourceRef: args.source.sourceRef,
        displayName: args.source.table,
      },
      { relationId: targetRelationId, relAnchor: 2 },
    ],
    fields: [
      ...sourceFields,
      ...args.outputs.map((output, outputOrdinal) => ({
        fieldId: output.fieldId,
        relationId: targetRelationId,
        sourceFieldId: sourceFieldIdByName.get(output.sourceFieldName)!,
        outputOrdinal,
        displayName: output.name,
      })),
    ],
  };
  return { plan, sidecar };
}

export function reorderDvtSubstraitProjectionOutputs(
  draft: DvtSubstraitProjectionDraft,
  args: Readonly<{
    fieldId: string;
    targetFieldId: string;
    placement: 'before' | 'after';
  }>
): DvtSubstraitProjectionDraft {
  if (args.fieldId === args.targetFieldId || draft.plan.relations.length !== 1) return draft;

  const plan = fromBinary(PlanSchema, toBinary(PlanSchema, draft.plan));
  const root = plan.relations[0]?.relType;
  const projectRelation = root?.case === 'root' ? root.value.input?.relType : undefined;
  if (root?.case !== 'root' || projectRelation?.case !== 'project') return draft;

  const project = projectRelation.value;
  const emit = project.common?.emitKind;
  const relationAnchor = project.common?.relAnchor;
  if (emit?.case !== 'emit' || relationAnchor == null) return draft;

  const targetRelationId = draft.sidecar.relations.find(
    (relation) => relation.relAnchor === relationAnchor
  )?.relationId;
  if (targetRelationId == null) return draft;

  const outputFields = sortedRelationFields(draft.sidecar, targetRelationId);
  if (
    outputFields.length !== emit.value.outputMapping.length ||
    outputFields.length !== root.value.names.length
  ) {
    return draft;
  }

  const sourceIndex = outputFields.findIndex((field) => field.fieldId === args.fieldId);
  const targetIndexBeforeMove = outputFields.findIndex(
    (field) => field.fieldId === args.targetFieldId
  );
  if (sourceIndex < 0 || targetIndexBeforeMove < 0) return draft;

  const reorderedFields = [...outputFields];
  const reorderedMappings = [...emit.value.outputMapping];
  const reorderedNames = [...root.value.names];
  const [movedField] = reorderedFields.splice(sourceIndex, 1);
  const [movedMapping] = reorderedMappings.splice(sourceIndex, 1);
  const [movedName] = reorderedNames.splice(sourceIndex, 1);
  const targetIndex = reorderedFields.findIndex((field) => field.fieldId === args.targetFieldId);
  if (movedField == null || movedMapping == null || movedName == null || targetIndex < 0) {
    return draft;
  }
  const insertionIndex = args.placement === 'after' ? targetIndex + 1 : targetIndex;
  reorderedFields.splice(insertionIndex, 0, movedField);
  reorderedMappings.splice(insertionIndex, 0, movedMapping);
  reorderedNames.splice(insertionIndex, 0, movedName);
  emit.value.outputMapping = reorderedMappings;
  root.value.names = reorderedNames;

  const outputOrdinalByFieldId = new Map(
    reorderedFields.map((field, outputOrdinal) => [field.fieldId, outputOrdinal] as const)
  );
  return {
    plan,
    sidecar: {
      ...draft.sidecar,
      fields: draft.sidecar.fields.map((field) => {
        if (field.relationId !== targetRelationId) return field;
        const outputOrdinal = outputOrdinalByFieldId.get(field.fieldId);
        return outputOrdinal == null ? field : { ...field, outputOrdinal };
      }),
    },
  };
}

export function inspectDvtSubstraitProjectionDraft(
  draft: DvtSubstraitProjectionDraft
): DvtSubstraitProjectionInspection {
  if (!hasPinnedPlanVersion(draft.plan) || draft.plan.relations.length !== 1) {
    return { ok: false };
  }
  const rootRelation = draft.plan.relations[0]?.relType;
  if (rootRelation?.case !== 'root') return { ok: false };
  const projectRelation = rootRelation.value.input?.relType;
  if (projectRelation?.case !== 'project') return { ok: false };
  const project = projectRelation.value;
  if (!projectHasOnlyFieldSelection(project)) return { ok: false };
  const readRelation = project.input?.relType;
  if (readRelation?.case !== 'read' || !readHasOnlyProjectionSemantics(readRelation.value)) {
    return { ok: false };
  }
  const namedTable = readRelation.value.readType;
  if (namedTable.case !== 'namedTable' || namedTable.value.names.length !== 2) {
    return { ok: false };
  }
  const [schema, table] = namedTable.value.names;
  if (schema == null || table == null || schema.length === 0 || table.length === 0) {
    return { ok: false };
  }
  const readAnchor = readRelation.value.common?.relAnchor;
  const projectAnchor = project.common?.relAnchor;
  if (readAnchor == null || projectAnchor == null || readAnchor === projectAnchor) {
    return { ok: false };
  }
  const sourceBindings = draft.sidecar.relations.filter(
    (relation) => relation.relAnchor === readAnchor
  );
  const targetBindings = draft.sidecar.relations.filter(
    (relation) => relation.relAnchor === projectAnchor
  );
  const sourceBinding = sourceBindings.length === 1 ? sourceBindings[0] : null;
  const targetBinding = targetBindings.length === 1 ? targetBindings[0] : null;
  if (
    draft.sidecar.relations.length !== 2 ||
    sourceBinding?.sourceRef == null ||
    sourceBinding.sourceRef.connectionRef.provider !== 'postgres' ||
    targetBinding == null ||
    targetBinding.sourceRef != null ||
    sourceBinding.relationId === targetBinding.relationId
  ) {
    return { ok: false };
  }
  const sourceFields = sortedRelationFields(draft.sidecar, sourceBinding.relationId);
  const targetFields = sortedRelationFields(draft.sidecar, targetBinding.relationId);
  const baseSchema = readRelation.value.baseSchema;
  const sourceTypes = baseSchema?.struct?.types;
  if (
    baseSchema == null ||
    sourceTypes == null ||
    baseSchema.names.length !== sourceFields.length ||
    sourceTypes.length !== sourceFields.length ||
    baseSchema.names.some((name, ordinal) => name !== sourceFields[ordinal]?.displayName) ||
    sourceTypes.some(
      (type) =>
        type.kind.case !== 'unbound' &&
        (type.kind.case !== 'string' ||
          type.kind.value.typeVariationReference !== 0 ||
          type.kind.value.nullability !== Type_Nullability.NULLABLE)
    )
  ) {
    return { ok: false };
  }
  const mappings = project.common?.emitKind;
  if (
    mappings?.case !== 'emit' ||
    sourceFields.length === 0 ||
    targetFields.length !== rootRelation.value.names.length ||
    mappings.value.outputMapping.length !== targetFields.length ||
    sourceFields.some(
      (field, ordinal) =>
        field.outputOrdinal !== ordinal || field.displayName == null || field.parentFieldId != null
    ) ||
    targetFields.some(
      (field, ordinal) =>
        field.outputOrdinal !== ordinal || field.displayName !== rootRelation.value.names[ordinal]
    )
  ) {
    return { ok: false };
  }
  const usedExpressionOrdinals = new Set<number>();
  const usedFunctionAnchors = new Set<number>();
  type InspectedScalar =
    | Readonly<{ kind: 'field-reference'; sourceOrdinal: number }>
    | Readonly<{
        kind: 'scalar-function';
        functionName: 'trim' | 'upper' | 'lower';
        arguments: readonly [InspectedScalar];
      }>
    | Readonly<{
        kind: 'scalar-function';
        functionName: 'concat';
        arguments: readonly [InspectedScalar, InspectedScalar];
        nullHandling: 'ACCEPT_NULLS';
      }>;
  const inspectScalar = (expression: Expression): InspectedScalar | null => {
    if (expression.rexType.case === 'selection') {
      const fieldReference = expression.rexType.value;
      const segment =
        fieldReference.referenceType.case === 'directReference'
          ? fieldReference.referenceType.value.referenceType
          : undefined;
      return fieldReference.rootType.case === 'rootReference' &&
        segment?.case === 'structField' &&
        segment.value.child == null &&
        segment.value.field >= 0 &&
        segment.value.field < sourceFields.length
        ? { kind: 'field-reference', sourceOrdinal: segment.value.field }
        : null;
    }
    if (expression.rexType.case !== 'scalarFunction') return null;
    const scalarFunction = expression.rexType.value;
    const declaration = draft.plan.extensions.find(
      (candidate) =>
        candidate.mappingType.case === 'extensionFunction' &&
        candidate.mappingType.value.functionAnchor === scalarFunction.functionReference
    );
    if (declaration?.mappingType.case !== 'extensionFunction') return null;
    const declarationValue = declaration.mappingType.value;
    const urn = draft.plan.extensionUrns.find(
      (candidate) => candidate.extensionUrnAnchor === declarationValue.extensionUrnReference
    )?.urn;
    const entry = DVT_SUBSTRAIT_CAPABILITY_CATALOG_V1.entries.find(
      (candidate) =>
        candidate.kind === 'standard' &&
        candidate.category === 'scalar-function' &&
        candidate.profileStatus === 'supported-profile' &&
        candidate.identity.sourceKind === 'simple-extension' &&
        candidate.identity.urn === urn &&
        (candidate.invocation?.signature ?? `${candidate.identity.name}:str`) ===
          declarationValue.name
    );
    const outputType = scalarFunction.outputType?.kind;
    if (
      entry == null ||
      entry.kind !== 'standard' ||
      entry.identity.sourceKind !== 'simple-extension' ||
      outputType?.case !== 'string' ||
      outputType.value.typeVariationReference !== 0 ||
      outputType.value.nullability !== Type_Nullability.NULLABLE
    ) {
      return null;
    }
    const expectedOptions = entry.invocation?.options ?? [];
    if (
      scalarFunction.arguments.length !== (entry.invocation?.argumentCount ?? 1) ||
      scalarFunction.options.length !== expectedOptions.length ||
      !expectedOptions.every((expected, index) => {
        const actual = scalarFunction.options[index];
        return (
          actual?.name === expected.name &&
          actual.preference.length === expected.preference.length &&
          actual.preference.every(
            (value, optionIndex) => value === expected.preference[optionIndex]
          )
        );
      })
    ) {
      return null;
    }
    const arguments_ = scalarFunction.arguments.map((argument) =>
      argument.argType.case === 'value' ? inspectScalar(argument.argType.value) : null
    );
    if (arguments_.some((argument) => argument == null)) return null;
    usedFunctionAnchors.add(scalarFunction.functionReference);
    if (entry.identity.name === 'concat' && arguments_.length === 2) {
      return {
        kind: 'scalar-function',
        functionName: 'concat',
        arguments: [arguments_[0]!, arguments_[1]!],
        nullHandling: 'ACCEPT_NULLS',
      };
    }
    if (
      (entry.identity.name === 'trim' ||
        entry.identity.name === 'upper' ||
        entry.identity.name === 'lower') &&
      arguments_.length === 1
    ) {
      return {
        kind: 'scalar-function',
        functionName: entry.identity.name,
        arguments: [arguments_[0]!],
      };
    }
    return null;
  };
  const publicScalar = (expression: InspectedScalar): DvtSubstraitScalarExpression =>
    expression.kind === 'field-reference'
      ? {
          kind: 'field-reference',
          sourceFieldName: sourceFields[expression.sourceOrdinal]!.displayName!,
        }
      : expression.functionName === 'concat'
        ? {
            kind: 'scalar-function',
            functionName: 'concat',
            arguments: [
              publicScalar(expression.arguments[0]),
              publicScalar(expression.arguments[1]),
            ],
            nullHandling: expression.nullHandling,
          }
        : {
            kind: 'scalar-function',
            functionName: expression.functionName,
            arguments: [publicScalar(expression.arguments[0])],
          };
  const scalarOperations = (expression: DvtSubstraitScalarExpression): readonly string[] =>
    expression.kind === 'field-reference'
      ? []
      : [
          ...expression.arguments.flatMap((argument) => scalarOperations(argument)),
          expression.functionName,
        ];
  const legacyLineage = (
    expression: InspectedScalar
  ): Readonly<{ sourceOrdinal: number; operations: readonly string[] }> | null => {
    if (expression.kind === 'field-reference') {
      return { sourceOrdinal: expression.sourceOrdinal, operations: [] };
    }
    if (expression.functionName === 'concat') return null;
    const input = legacyLineage(expression.arguments[0]);
    return input == null
      ? null
      : {
          sourceOrdinal: input.sourceOrdinal,
          operations: [...input.operations, expression.functionName],
        };
  };
  const inspectExpression = (
    expression: (typeof project.expressions)[number]
  ):
    | Readonly<{ sourceOrdinal: number; operations: readonly string[] }>
    | Readonly<{ scalarExpression: DvtSubstraitScalarExpression }>
    | Readonly<{ calculation: DvtSubstraitCalculatedExpression }>
    | null => {
    const calculated = inspectDvtSubstraitCalculatedExpression(draft.plan, expression);
    if (calculated != null) {
      calculated.functionAnchors.forEach((anchor) => usedFunctionAnchors.add(anchor));
      return { calculation: calculated.calculation };
    }
    const scalar = inspectScalar(expression);
    if (scalar == null) return null;
    const legacy = legacyLineage(scalar);
    return legacy ?? { scalarExpression: publicScalar(scalar) };
  };
  const outputs = mappings.value.outputMapping.map((mapping, outputOrdinal) => {
    const expressionOrdinal = mapping - sourceFields.length;
    const resolvedExpression =
      mapping < sourceFields.length
        ? { sourceOrdinal: mapping, operations: [] as readonly string[] }
        : expressionOrdinal >= 0 && expressionOrdinal < project.expressions.length
          ? inspectExpression(project.expressions[expressionOrdinal]!)
          : null;
    if (expressionOrdinal >= 0 && resolvedExpression != null) {
      usedExpressionOrdinals.add(expressionOrdinal);
    }
    const sourceField =
      resolvedExpression != null && 'sourceOrdinal' in resolvedExpression
        ? sourceFields[resolvedExpression.sourceOrdinal]
        : undefined;
    const calculation =
      resolvedExpression != null && 'calculation' in resolvedExpression
        ? resolvedExpression.calculation
        : undefined;
    const scalarExpression =
      resolvedExpression != null && 'scalarExpression' in resolvedExpression
        ? resolvedExpression.scalarExpression
        : undefined;
    const targetField = targetFields[outputOrdinal];
    if (
      resolvedExpression == null ||
      ('sourceOrdinal' in resolvedExpression && sourceField == null) ||
      targetField == null ||
      (sourceField != null && sourceField.displayName == null) ||
      (sourceField != null &&
        targetField.sourceFieldId != null &&
        targetField.sourceFieldId !== sourceField.fieldId) ||
      (calculation?.kind === 'row-number' && calculation.orderSourceOrdinal >= sourceFields.length)
    ) {
      return null;
    }
    const lineage =
      calculation != null
        ? { calculation }
        : scalarExpression != null
          ? { scalarExpression }
          : sourceField != null
            ? { sourceFieldId: sourceField.fieldId, sourceFieldName: sourceField.displayName }
            : null;
    if (lineage == null) return null;
    return {
      fieldId: targetField.fieldId,
      name: targetField.displayName ?? rootRelation.value.names[outputOrdinal]!,
      ...lineage,
      dataType:
        scalarExpression != null
          ? 'string'
          : calculation == null
            ? sourceField == null
              ? 'unknown'
              : sourceTypes[
                    'sourceOrdinal' in resolvedExpression ? resolvedExpression.sourceOrdinal : -1
                  ]?.kind.case === 'string'
                ? 'string'
                : 'unknown'
            : calculation.kind === 'string-literal'
              ? 'string'
              : calculation.kind === 'timestamp-literal'
                ? 'timestamp with time zone'
                : 'bigint',
      outputOrdinal,
      ...(targetField.description == null ? {} : { description: targetField.description }),
      ...(targetField.operandFieldIds == null
        ? {}
        : { operandFieldIds: targetField.operandFieldIds }),
      ...('operations' in resolvedExpression && resolvedExpression.operations.length > 0
        ? { operations: resolvedExpression.operations }
        : scalarExpression == null
          ? {}
          : { operations: scalarOperations(scalarExpression) }),
    };
  });
  const declaredFunctionAnchors = draft.plan.extensions.flatMap((entry) =>
    entry.mappingType.case === 'extensionFunction' ? [entry.mappingType.value.functionAnchor] : []
  );
  const declaredUrnAnchors = new Set(
    draft.plan.extensions.flatMap((entry) =>
      entry.mappingType.case === 'extensionFunction'
        ? [entry.mappingType.value.extensionUrnReference]
        : []
    )
  );
  if (
    outputs.some((output) => output == null) ||
    usedExpressionOrdinals.size !== project.expressions.length ||
    draft.plan.extensions.length !== declaredFunctionAnchors.length ||
    new Set(declaredFunctionAnchors).size !== declaredFunctionAnchors.length ||
    declaredFunctionAnchors.some((anchor) => !usedFunctionAnchors.has(anchor)) ||
    usedFunctionAnchors.size !== declaredFunctionAnchors.length ||
    draft.plan.extensionUrns.length !== declaredUrnAnchors.size ||
    draft.plan.extensionUrns.some(
      (entry) =>
        !declaredUrnAnchors.has(entry.extensionUrnAnchor) ||
        (entry.urn !== 'extension:io.substrait:functions_string' &&
          entry.urn !== 'extension:io.substrait:functions_arithmetic')
    )
  ) {
    return { ok: false };
  }

  return {
    ok: true,
    projection: {
      source: {
        schema,
        table,
        sourceRef: sourceBinding.sourceRef,
        fields: sourceFields.map((field, ordinal) => ({
          name: field.displayName!,
          dataType: sourceTypes[ordinal]!.kind.case === 'string' ? 'string' : 'unknown',
        })),
      },
      outputs: outputs.filter((output) => output != null),
    },
  };
}

export function applyDvtSubstraitProjectionFunction(
  draft: DvtSubstraitProjectionDraft,
  args: {
    fieldId: string;
    capabilityId: string;
    alias: string;
    provider: string;
  } & (
    | {
        operandFieldIds: readonly [string, ...string[]];
        dataTypes: readonly string[];
        dataType?: never;
      }
    | { dataType: string; operandFieldIds?: never; dataTypes?: never }
  )
): DvtSubstraitProjectionDraft {
  const operandFieldIds: readonly [string, ...string[]] = args.operandFieldIds ?? [args.fieldId];
  const inspection = inspectDvtSubstraitProjectionDraft(draft);
  const alias = args.alias.trim();
  const output = inspection.ok
    ? inspection.projection.outputs.find((candidate) => candidate.fieldId === args.fieldId)
    : undefined;
  const operands = inspection.ok
    ? operandFieldIds.map((fieldId) =>
        inspection.projection.outputs.find((candidate) => candidate.fieldId === fieldId)
      )
    : [];
  const capability =
    inspection.ok && operands.every((operand) => operand != null)
      ? resolveDvtSubstraitColumnFunctions({
          dataTypes: operands.map((operand) => operand!.dataType),
          provider: inspection.projection.source.sourceRef.connectionRef.provider,
        }).find((entry) => entry.capabilityId === args.capabilityId)
      : undefined;
  if (
    !inspection.ok ||
    args.provider !== inspection.projection.source.sourceRef.connectionRef.provider ||
    capability == null ||
    alias.length === 0 ||
    output == null ||
    operands.some((operand) => operand == null) ||
    new Set(operandFieldIds).size !== operandFieldIds.length ||
    inspection.projection.outputs.some(
      (candidate) => candidate.fieldId !== args.fieldId && candidate.name === alias
    ) ||
    inspection.projection.source.fields.some(
      (field) => field.name === alias && field.name !== output.sourceFieldName
    )
  ) {
    return draft;
  }

  const plan = fromBinary(PlanSchema, toBinary(PlanSchema, draft.plan));
  const rootRelation = plan.relations[0]?.relType;
  const projectRelation =
    rootRelation?.case === 'root' ? rootRelation.value.input?.relType : undefined;
  if (rootRelation?.case !== 'root' || projectRelation?.case !== 'project') return draft;
  const project = projectRelation.value;
  const emitKind = project.common?.emitKind;
  if (emitKind?.case !== 'emit') return draft;
  const outputMapping = emitKind.value.outputMapping;
  const targetMapping = outputMapping[output.outputOrdinal];
  const sourceFieldCount = inspection.projection.source.fields.length;
  if (targetMapping == null) return draft;

  const buildFieldReference = (ordinal: number) =>
    create(ExpressionSchema, {
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
  const expressionForMapping = (mapping: number): Expression | undefined => {
    if (mapping < sourceFieldCount) return buildFieldReference(mapping);
    const expression = project.expressions[mapping - sourceFieldCount];
    return expression == null
      ? undefined
      : fromBinary(ExpressionSchema, toBinary(ExpressionSchema, expression));
  };
  const operandExpressions = operands.map((operand) => {
    const mapping = operand == null ? undefined : outputMapping[operand.outputOrdinal];
    return mapping == null ? undefined : expressionForMapping(mapping);
  });
  if (operandExpressions.some((expression) => expression == null)) return draft;

  const functionEntry = DVT_SUBSTRAIT_CAPABILITY_CATALOG_V1.entries.find(
    (entry) => entry.entryId === capability.capabilityId
  );
  if (
    functionEntry == null ||
    functionEntry.kind !== 'standard' ||
    functionEntry.category !== 'scalar-function' ||
    functionEntry.profileStatus !== 'supported-profile' ||
    functionEntry.identity.sourceKind !== 'simple-extension'
  ) {
    return draft;
  }
  const functionIdentity = functionEntry.identity;
  const signature = functionEntry.invocation?.signature ?? `${functionIdentity.name}:str`;
  let extensionUrn = plan.extensionUrns.find((entry) => entry.urn === functionIdentity.urn);
  if (extensionUrn == null) {
    extensionUrn = create(SimpleExtensionURNSchema, {
      extensionUrnAnchor:
        Math.max(0, ...plan.extensionUrns.map((entry) => entry.extensionUrnAnchor)) + 1,
      urn: functionIdentity.urn,
    });
    plan.extensionUrns.push(extensionUrn);
  }
  let extensionFunction = plan.extensions.find(
    (entry) =>
      entry.mappingType.case === 'extensionFunction' &&
      entry.mappingType.value.name === signature &&
      entry.mappingType.value.extensionUrnReference === extensionUrn.extensionUrnAnchor
  );
  if (extensionFunction?.mappingType.case !== 'extensionFunction') {
    const functionAnchor =
      Math.max(
        0,
        ...plan.extensions.flatMap((entry) =>
          entry.mappingType.case === 'extensionFunction'
            ? [entry.mappingType.value.functionAnchor]
            : []
        )
      ) + 1;
    extensionFunction = create(SimpleExtensionDeclarationSchema, {
      mappingType: {
        case: 'extensionFunction',
        value: create(SimpleExtensionDeclaration_ExtensionFunctionSchema, {
          extensionUrnReference: extensionUrn.extensionUrnAnchor,
          functionAnchor,
          name: signature,
        }),
      },
    });
    plan.extensions.push(extensionFunction);
  }
  if (extensionFunction.mappingType.case !== 'extensionFunction') return draft;

  const nextExpression = create(ExpressionSchema, {
    rexType: {
      case: 'scalarFunction',
      value: create(Expression_ScalarFunctionSchema, {
        functionReference: extensionFunction.mappingType.value.functionAnchor,
        arguments: operandExpressions.map((expression) =>
          create(FunctionArgumentSchema, { argType: { case: 'value', value: expression! } })
        ),
        options: (functionEntry.invocation?.options ?? []).map((option) =>
          create(FunctionOptionSchema, {
            name: option.name,
            preference: [...option.preference],
          })
        ),
        outputType: create(TypeSchema, {
          kind: {
            case: 'string',
            value: create(Type_StringSchema, { nullability: Type_Nullability.NULLABLE }),
          },
        }),
      }),
    },
  });
  const targetExpressionOrdinal = targetMapping - sourceFieldCount;
  const referenceCount = outputMapping.filter((mapping) => mapping === targetMapping).length;
  if (targetMapping < sourceFieldCount || referenceCount > 1) {
    project.expressions.push(nextExpression);
    outputMapping[output.outputOrdinal] = sourceFieldCount + project.expressions.length - 1;
  } else {
    project.expressions[targetExpressionOrdinal] = nextExpression;
  }
  rootRelation.value.names[output.outputOrdinal] = alias;

  const usedFunctionAnchors = new Set<number>();
  const visitFunctionAnchors = (expression: Expression): void => {
    if (expression.rexType.case !== 'scalarFunction') return;
    usedFunctionAnchors.add(expression.rexType.value.functionReference);
    expression.rexType.value.arguments.forEach((argument) => {
      if (argument.argType.case === 'value') visitFunctionAnchors(argument.argType.value);
    });
  };
  project.expressions.forEach(visitFunctionAnchors);
  plan.extensions = plan.extensions.filter(
    (entry) =>
      entry.mappingType.case !== 'extensionFunction' ||
      usedFunctionAnchors.has(entry.mappingType.value.functionAnchor)
  );
  const usedUrns = new Set(
    plan.extensions.flatMap((entry) =>
      entry.mappingType.case === 'extensionFunction'
        ? [entry.mappingType.value.extensionUrnReference]
        : []
    )
  );
  plan.extensionUrns = plan.extensionUrns.filter((entry) => usedUrns.has(entry.extensionUrnAnchor));
  const nextDraft = {
    plan,
    sidecar: {
      ...draft.sidecar,
      fields: draft.sidecar.fields.map((field) => {
        if (field.fieldId !== output.fieldId) return field;
        const { sourceFieldId: _sourceFieldId, ...preserved } = field;
        return {
          ...preserved,
          displayName: alias,
          ...(operandFieldIds.length > 1 ? { operandFieldIds: [...operandFieldIds] } : {}),
        };
      }),
    },
  };
  return inspectDvtSubstraitProjectionDraft(nextDraft).ok ? nextDraft : draft;
}

export function resolveDvtSubstraitProjectionEntry(args: {
  targetNode: CanonicalNode;
  nodes: readonly CanonicalNode[];
  edges: readonly Pick<CanonicalEdge, 'sourceId' | 'targetId'>[];
  draft: DvtSubstraitProjectionDraft;
}): DvtSubstraitProjection | null {
  const inspection = inspectDvtSubstraitProjectionDraft(args.draft);
  if (!inspection.ok) return null;
  const incomingSourceIds = [
    ...new Set(
      args.edges.filter((edge) => edge.targetId === args.targetNode.id).map((edge) => edge.sourceId)
    ),
  ];
  const candidateNodes =
    incomingSourceIds.length === 0
      ? [args.targetNode]
      : incomingSourceIds.flatMap((sourceId) => {
          const sourceNode = args.nodes.find((node) => node.id === sourceId);
          return sourceNode == null ? [] : [sourceNode];
        });
  const matchingSources = candidateNodes.flatMap((sourceNode) => {
    const source = resolveDvtSubstraitProjectionSource(sourceNode);
    return source != null &&
      source.table === inspection.projection.source.table &&
      sameConnectedSourceRef(source.sourceRef, inspection.projection.source.sourceRef) &&
      source.fields.map((field) => field.name).join('\u0000') ===
        inspection.projection.source.fields.map((field) => field.name).join('\u0000')
      ? [source]
      : [];
  });
  if (matchingSources.length !== 1) return null;
  const source = matchingSources[0]!;
  return {
    targetNodeId: args.targetNode.id,
    source,
    outputs: inspection.projection.outputs.map((output) => ({
      ...output,
      dataType:
        output.scalarExpression != null
          ? output.dataType
          : output.calculation == null
            ? (source.fields.find((field) => field.name === output.sourceFieldName)?.dataType ??
              'unknown')
            : output.dataType,
    })),
  };
}

export function decodeDvtSubstraitProjectionDocument(input: unknown): DvtSubstraitProjectionDraft {
  const { plan, sidecar } = decodeDvtSubstraitSemanticDocument(input);
  if (!hasPinnedPlanVersion(plan)) {
    throw new Error('Substrait Plan does not match the pinned DVT profile.');
  }
  return { plan, sidecar };
}

export function encodeDvtSubstraitProjectionDocument(
  draft: DvtSubstraitProjectionDraft
): DvtSubstraitSemanticDocumentV1 {
  if (!inspectDvtSubstraitProjectionDraft(draft).ok) {
    throw new Error('Substrait connected-source projection is invalid.');
  }
  return encodeDvtSubstraitSemanticDocument(draft);
}
