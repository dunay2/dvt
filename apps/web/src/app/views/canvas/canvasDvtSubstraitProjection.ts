/** Owned concern: author and inspect one connected-source field projection as canonical Substrait. */
import { create, fromBinary, toBinary } from '@bufbuild/protobuf';
import {
  ExpressionSchema,
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
  type Rel,
  type RelCommon,
} from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import {
  PlanRelSchema,
  PlanSchema,
  type Plan,
} from '@buf/substrait_substrait.bufbuild_es/substrait/plan_pb.js';
import {
  NamedStructSchema,
  TypeSchema,
  Type_I64Schema,
  Type_Nullability,
  Type_PrecisionTimestampTZSchema,
  Type_StringSchema,
  Type_StructSchema,
  Type_UnboundSchema,
  type Type,
} from '@buf/substrait_substrait.bufbuild_es/substrait/type_pb.js';
import {
  ConnectedSourceRefSchema,
  DVT_SUBSTRAIT_AUTHORING_SIDECAR_SCHEMA_VERSION,
  DVT_SUBSTRAIT_CAPABILITY_CATALOG_V1,
  DVT_SUBSTRAIT_PROFILE_REF_V1,
  PostgresIdentifierV1Schema,
  allocateDvtFieldId,
  allocateDvtRelationId,
  type ConnectedSourceRef,
  type DvtSubstraitAuthoringSidecarV1,
  type DvtSubstraitFieldBindingV1,
  type DvtSubstraitSemanticDocumentV1,
} from '@dvt/contracts';

import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import { readDvtTransformAuthoringAuthority } from './canvasDvtTransformAuthoringAuthority';
import { dvtSubstraitExpression } from './canvasDvtSubstraitExpression';
import {
  inspectDvtSubstraitCalculatedExpression,
  type DvtSubstraitCalculatedExpression,
} from './canvasDvtSubstraitCalculatedExpression';
import {
  decodeDvtSubstraitSemanticDocument,
  encodeDvtSubstraitSemanticDocument,
} from './canvasDvtSubstraitSemanticDocument';

const ZERO_SHA256 = '0'.repeat(64);
const STRING_DATA_TYPES = new Set([
  'text',
  'string',
  'varchar',
  'character varying',
  'char',
  'character',
  'bpchar',
]);
const TIMESTAMPTZ_DATA_TYPES = new Set(['timestamp with time zone', 'timestamptz', 'timestamp_tz']);
const I64_DATA_TYPES = new Set(['bigint', 'int8', 'i64']);

function normalizeProjectionDataType(dataType: unknown): string {
  return typeof dataType === 'string' ? dataType.trim().toLowerCase().replaceAll(/\s+/g, ' ') : '';
}

function createProjectionType(dataType: string): Type {
  const normalized = normalizeProjectionDataType(dataType);
  if (STRING_DATA_TYPES.has(normalized)) {
    return create(TypeSchema, {
      kind: {
        case: 'string',
        value: create(Type_StringSchema, { nullability: Type_Nullability.NULLABLE }),
      },
    });
  }
  if (TIMESTAMPTZ_DATA_TYPES.has(normalized)) {
    return create(TypeSchema, {
      kind: {
        case: 'precisionTimestampTz',
        value: create(Type_PrecisionTimestampTZSchema, {
          precision: 6,
          nullability: Type_Nullability.NULLABLE,
        }),
      },
    });
  }
  if (I64_DATA_TYPES.has(normalized)) {
    return create(TypeSchema, {
      kind: {
        case: 'i64',
        value: create(Type_I64Schema, { nullability: Type_Nullability.NULLABLE }),
      },
    });
  }
  return create(TypeSchema, { kind: { case: 'unbound', value: create(Type_UnboundSchema) } });
}

function inspectProjectionDataType(type: Type): string | null {
  if (type.kind.case === 'unbound') return 'unknown';
  if (
    type.kind.case === 'string' &&
    type.kind.value.typeVariationReference === 0 &&
    type.kind.value.nullability === Type_Nullability.NULLABLE
  ) {
    return 'string';
  }
  if (
    type.kind.case === 'precisionTimestampTz' &&
    type.kind.value.precision === 6 &&
    type.kind.value.typeVariationReference === 0 &&
    type.kind.value.nullability === Type_Nullability.NULLABLE
  ) {
    return 'timestamp with time zone';
  }
  if (
    type.kind.case === 'i64' &&
    type.kind.value.typeVariationReference === 0 &&
    type.kind.value.nullability === Type_Nullability.NULLABLE
  ) {
    return 'bigint';
  }
  return null;
}

export function canonicalizeDvtSubstraitProjectionDataType(dataType: unknown): string {
  return (
    inspectProjectionDataType(createProjectionType(normalizeProjectionDataType(dataType))) ??
    'unknown'
  );
}
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
  | Readonly<{ kind: 'timestamp-literal'; value: string }>
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
    }>
  | Readonly<{
      kind: 'scalar-function';
      functionName: 'coalesce';
      arguments: readonly [
        DvtSubstraitScalarExpression,
        DvtSubstraitScalarExpression,
        ...DvtSubstraitScalarExpression[],
      ];
    }>
  | Readonly<{
      kind: 'scalar-function';
      functionName: 'extract';
      arguments: readonly [DvtSubstraitScalarExpression];
      component: 'YEAR';
      timezone: 'UTC';
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
  category: 'text' | 'date-time';
  minimumArgumentCount: number;
  maximumArgumentCount?: number;
  expressionTemplate?: string;
}>;

function invocationArgumentRange(
  invocation:
    | Readonly<{
        minimumArgumentCount: number;
        maximumArgumentCount?: number;
      }>
    | undefined
): Readonly<{ minimumArgumentCount: number; maximumArgumentCount?: number }> {
  return invocation == null
    ? { minimumArgumentCount: 1, maximumArgumentCount: 1 }
    : {
        minimumArgumentCount: invocation.minimumArgumentCount,
        ...(invocation.maximumArgumentCount == null
          ? {}
          : { maximumArgumentCount: invocation.maximumArgumentCount }),
      };
}

function admitsProposedArgumentCount(
  range: Readonly<{ minimumArgumentCount: number; maximumArgumentCount?: number }>,
  proposedCount: number
): boolean {
  return (
    proposedCount > 0 &&
    (range.maximumArgumentCount == null || proposedCount <= range.maximumArgumentCount)
  );
}

function admitsCompleteArgumentCount(
  range: Readonly<{ minimumArgumentCount: number; maximumArgumentCount?: number }>,
  completeCount: number
): boolean {
  return (
    completeCount >= range.minimumArgumentCount &&
    (range.maximumArgumentCount == null || completeCount <= range.maximumArgumentCount)
  );
}

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
  inputRelationId: string;
  inputFields: readonly Readonly<{
    fieldId: string;
    name: string;
    dataType: string;
  }>[];
  targetRelationId: string;
  outputs: readonly DvtSubstraitProjectionOutput[];
}>;

export type DvtSubstraitProjectionInspection =
  Readonly<{ ok: true; projection: DvtSubstraitProjectionSemantics }> | Readonly<{ ok: false }>;

export function resolveDvtSubstraitColumnFunctions(args: {
  dataType?: string;
  dataTypes?: readonly string[];
  provider: string;
  resolution?: 'proposal' | 'complete';
}): readonly DvtSubstraitColumnFunction[] {
  const normalizedTypes = (args.dataTypes ?? (args.dataType == null ? [] : [args.dataType])).map(
    normalizeProjectionDataType
  );
  if (args.provider !== 'postgres' || normalizedTypes.length === 0) return [];
  const stringOperands = normalizedTypes.every((dataType) => STRING_DATA_TYPES.has(dataType));
  const timestampOperand =
    normalizedTypes.length === 1 && TIMESTAMPTZ_DATA_TYPES.has(normalizedTypes[0]!);

  return DVT_SUBSTRAIT_CAPABILITY_CATALOG_V1.entries.flatMap<DvtSubstraitColumnFunction>(
    (entry) => {
      if (
        entry.kind !== 'standard' ||
        entry.category !== 'scalar-function' ||
        entry.profileStatus !== 'supported-profile' ||
        entry.identity.sourceKind !== 'simple-extension'
      ) {
        return [];
      }
      const textFunction =
        entry.identity.urn === 'extension:io.substrait:functions_string' ||
        (entry.identity.urn === 'extension:io.substrait:functions_comparison' &&
          entry.identity.name === 'coalesce' &&
          entry.invocation?.signature === 'coalesce:any1');
      if (stringOperands && textFunction) {
        const range = invocationArgumentRange(entry.invocation);
        const admitted =
          args.resolution === 'proposal'
            ? admitsProposedArgumentCount(range, normalizedTypes.length)
            : admitsCompleteArgumentCount(range, normalizedTypes.length);
        return admitted
          ? [
              {
                capabilityId: entry.entryId,
                name: entry.identity.name,
                category: 'text' as const,
                ...range,
              },
            ]
          : [];
      }
      if (
        timestampOperand &&
        entry.identity.urn === 'extension:io.substrait:functions_datetime' &&
        entry.identity.name === 'extract' &&
        entry.invocation?.signature === 'extract:req_ptstz_str' &&
        entry.invocation.argumentTypes.join('_') === 'req_ptstz_str' &&
        entry.invocation.minimumArgumentCount === 3 &&
        entry.invocation.maximumArgumentCount === 3 &&
        entry.invocation.outputType === 'i64' &&
        entry.invocation.options.length === 0
      ) {
        return [
          {
            capabilityId: entry.entryId,
            name: 'extract year (UTC)',
            category: 'date-time' as const,
            minimumArgumentCount: 1,
            maximumArgumentCount: 1,
            expressionTemplate: "EXTRACT(YEAR FROM {column} AT TIME ZONE 'UTC')",
          },
        ];
      }
      return [];
    }
  );
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

  const sourceTypes = args.source.fields.map((field) => createProjectionType(field.dataType));

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

export function createDvtSubstraitProjectionDraftFromTransform(args: {
  source: DvtSubstraitProjectionDraft;
  targetNodeId: string;
  outputs: readonly Readonly<{
    fieldId: string;
    name: string;
    sourceFieldId: string;
  }>[];
}): DvtSubstraitProjectionDraft {
  if (args.targetNodeId.trim().length === 0 || args.targetNodeId !== args.targetNodeId.trim()) {
    throw new Error('Substrait projection requires a target identity.');
  }
  const sourceInspection = inspectDvtSubstraitProjectionDraft(args.source);
  if (!sourceInspection.ok) {
    throw new Error('Substrait Transform input must be a valid projection.');
  }
  const existingFieldIds = new Set(args.source.sidecar.fields.map((field) => field.fieldId));
  if (
    args.outputs.some(
      (output) =>
        output.fieldId.trim().length === 0 ||
        output.name.trim().length === 0 ||
        output.sourceFieldId.trim().length === 0 ||
        existingFieldIds.has(output.fieldId)
    ) ||
    new Set(args.outputs.map((output) => output.fieldId)).size !== args.outputs.length
  ) {
    throw new Error('Substrait projection output identities must be unique and nonblank.');
  }
  const sourceOrdinalByFieldId = new Map(
    sourceInspection.projection.outputs.map((output, ordinal) => [output.fieldId, ordinal] as const)
  );
  const outputMapping = args.outputs.map((output) => {
    const ordinal = sourceOrdinalByFieldId.get(output.sourceFieldId);
    if (ordinal == null) {
      throw new Error('Substrait Transform input must reference an existing FieldId.');
    }
    return ordinal;
  });

  const plan = fromBinary(PlanSchema, toBinary(PlanSchema, args.source.plan));
  const root = plan.relations[0]?.relType;
  if (root?.case !== 'root' || root.value.input == null) {
    throw new Error('Substrait Transform input must expose one root relation.');
  }
  const input = root.value.input;
  const nextAnchor =
    Math.max(0, ...args.source.sidecar.relations.map((relation) => relation.relAnchor)) + 1;
  root.value.input = create(RelSchema, {
    relType: {
      case: 'project',
      value: create(ProjectRelSchema, {
        common: create(RelCommonSchema, {
          relAnchor: nextAnchor,
          emitKind: {
            case: 'emit',
            value: create(RelCommon_EmitSchema, { outputMapping }),
          },
        }),
        input,
        expressions: [],
      }),
    },
  });
  root.value.names = args.outputs.map((output) => output.name);

  const targetRelationId = allocateDvtRelationId();
  return {
    plan,
    sidecar: {
      ...args.source.sidecar,
      relations: [
        ...args.source.sidecar.relations,
        { relationId: targetRelationId, relAnchor: nextAnchor },
      ],
      fields: [
        ...args.source.sidecar.fields,
        ...args.outputs.map((output, outputOrdinal) => ({
          fieldId: output.fieldId,
          relationId: targetRelationId,
          sourceFieldId: output.sourceFieldId,
          outputOrdinal,
          displayName: output.name,
        })),
      ],
    },
  };
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

function inspectChainedDvtSubstraitProjectionDraft(
  draft: DvtSubstraitProjectionDraft,
  root: Extract<Plan['relations'][number]['relType'], { case: 'root' }>['value'],
  project: ProjectRel
): DvtSubstraitProjectionInspection {
  const inputProject = project.input?.relType;
  const inputAnchor =
    inputProject?.case === 'project' ? inputProject.value.common?.relAnchor : undefined;
  const targetAnchor = project.common?.relAnchor;
  if (
    inputProject?.case !== 'project' ||
    inputAnchor == null ||
    targetAnchor == null ||
    inputAnchor === targetAnchor ||
    !projectHasOnlyFieldSelection(project)
  ) {
    return { ok: false };
  }
  const inputBindings = draft.sidecar.relations.filter(
    (relation) => relation.relAnchor === inputAnchor
  );
  const targetBindings = draft.sidecar.relations.filter(
    (relation) => relation.relAnchor === targetAnchor
  );
  const inputBinding = inputBindings.length === 1 ? inputBindings[0] : null;
  const targetBinding = targetBindings.length === 1 ? targetBindings[0] : null;
  if (
    inputBinding == null ||
    inputBinding.sourceRef != null ||
    targetBinding == null ||
    targetBinding.sourceRef != null ||
    inputBinding.relationId === targetBinding.relationId ||
    new Set(draft.sidecar.relations.map((relation) => relation.relationId)).size !==
      draft.sidecar.relations.length ||
    new Set(draft.sidecar.fields.map((field) => field.fieldId)).size !== draft.sidecar.fields.length
  ) {
    return { ok: false };
  }
  const inputFields = sortedRelationFields(draft.sidecar, inputBinding.relationId);
  const targetFields = sortedRelationFields(draft.sidecar, targetBinding.relationId);
  const mappings = project.common?.emitKind;
  if (
    mappings?.case !== 'emit' ||
    inputFields.length === 0 ||
    targetFields.length !== root.names.length ||
    mappings.value.outputMapping.length !== targetFields.length ||
    inputFields.some(
      (field, ordinal) =>
        field.outputOrdinal !== ordinal || field.displayName == null || field.parentFieldId != null
    ) ||
    targetFields.some(
      (field, ordinal) =>
        field.outputOrdinal !== ordinal || field.displayName !== root.names[ordinal]
    )
  ) {
    return { ok: false };
  }

  const upstreamPlan = fromBinary(PlanSchema, toBinary(PlanSchema, draft.plan));
  const upstreamRoot = upstreamPlan.relations[0]?.relType;
  if (upstreamRoot?.case !== 'root') return { ok: false };
  upstreamRoot.value.input = project.input;
  upstreamRoot.value.names = inputFields.map((field) => field.displayName!);
  const upstreamFunctionAnchors = new Set<number>();
  const collectExpressionFunctionAnchors = (expression: Expression): void => {
    if (expression.rexType.case !== 'scalarFunction') return;
    upstreamFunctionAnchors.add(expression.rexType.value.functionReference);
    expression.rexType.value.arguments.forEach((argument) => {
      if (argument.argType.case === 'value')
        collectExpressionFunctionAnchors(argument.argType.value);
    });
  };
  const collectRelationFunctionAnchors = (relation: Rel | undefined): void => {
    if (relation?.relType.case !== 'project') return;
    relation.relType.value.expressions.forEach(collectExpressionFunctionAnchors);
    collectRelationFunctionAnchors(relation.relType.value.input);
  };
  collectRelationFunctionAnchors(upstreamRoot.value.input);
  upstreamPlan.extensions = upstreamPlan.extensions.filter(
    (entry) =>
      entry.mappingType.case !== 'extensionFunction' ||
      upstreamFunctionAnchors.has(entry.mappingType.value.functionAnchor)
  );
  const upstreamUrnAnchors = new Set(
    upstreamPlan.extensions.flatMap((entry) =>
      entry.mappingType.case === 'extensionFunction'
        ? [entry.mappingType.value.extensionUrnReference]
        : []
    )
  );
  upstreamPlan.extensionUrns = upstreamPlan.extensionUrns.filter((entry) =>
    upstreamUrnAnchors.has(entry.extensionUrnAnchor)
  );
  const upstreamDraft: DvtSubstraitProjectionDraft = {
    plan: upstreamPlan,
    sidecar: {
      ...draft.sidecar,
      relations: draft.sidecar.relations.filter(
        (relation) => relation.relationId !== targetBinding.relationId
      ),
      fields: draft.sidecar.fields.filter((field) => field.relationId !== targetBinding.relationId),
    },
  };
  const upstreamInspection = inspectDvtSubstraitProjectionDraft(upstreamDraft);
  if (
    !upstreamInspection.ok ||
    upstreamInspection.projection.targetRelationId !== inputBinding.relationId ||
    upstreamInspection.projection.outputs.length !== inputFields.length ||
    upstreamInspection.projection.outputs.some((output, ordinal) => {
      const field = inputFields[ordinal];
      return (
        field == null ||
        output.fieldId !== field.fieldId ||
        output.name !== field.displayName ||
        output.outputOrdinal !== field.outputOrdinal
      );
    })
  ) {
    return { ok: false };
  }

  if (project.expressions.length > 0) {
    const validationPlan = fromBinary(PlanSchema, toBinary(PlanSchema, draft.plan));
    const validationRoot = validationPlan.relations[0]?.relType;
    const validationProject =
      validationRoot?.case === 'root' ? validationRoot.value.input?.relType : undefined;
    if (validationRoot?.case !== 'root' || validationProject?.case !== 'project') {
      return { ok: false };
    }
    validationProject.value.input = create(RelSchema, {
      relType: {
        case: 'read',
        value: create(ReadRelSchema, {
          common: create(RelCommonSchema, { relAnchor: inputAnchor }),
          baseSchema: create(NamedStructSchema, {
            names: inputFields.map((field) => field.displayName!),
            struct: create(Type_StructSchema, {
              types: upstreamInspection.projection.outputs.map((output) =>
                createProjectionType(output.dataType)
              ),
              nullability: Type_Nullability.REQUIRED,
            }),
          }),
          readType: {
            case: 'namedTable',
            value: create(ReadRel_NamedTableSchema, {
              names: [
                upstreamInspection.projection.source.schema,
                upstreamInspection.projection.source.table,
              ],
            }),
          },
        }),
      },
    });
    const validationInspection = inspectDvtSubstraitProjectionDraft({
      plan: validationPlan,
      sidecar: {
        ...draft.sidecar,
        relations: [
          { ...inputBinding, sourceRef: upstreamInspection.projection.source.sourceRef },
          targetBinding,
        ],
        fields: draft.sidecar.fields.filter(
          (field) =>
            field.relationId === inputBinding.relationId ||
            field.relationId === targetBinding.relationId
        ),
      },
    });
    if (!validationInspection.ok) return { ok: false };
    const actualTypeByFieldId = new Map(
      upstreamInspection.projection.outputs.map(
        (output) => [output.fieldId, output.dataType] as const
      )
    );
    return {
      ok: true,
      projection: {
        ...validationInspection.projection,
        source: upstreamInspection.projection.source,
        inputRelationId: inputBinding.relationId,
        inputFields: inputFields.map((field, ordinal) => ({
          fieldId: field.fieldId,
          name: field.displayName!,
          dataType: upstreamInspection.projection.outputs[ordinal]!.dataType,
        })),
        targetRelationId: targetBinding.relationId,
        outputs: validationInspection.projection.outputs.map((output) => ({
          ...output,
          ...(output.sourceFieldId == null ||
          output.calculation != null ||
          output.scalarExpression != null
            ? {}
            : { dataType: actualTypeByFieldId.get(output.sourceFieldId) ?? output.dataType }),
        })),
      },
    };
  }
  const outputs = mappings.value.outputMapping.map((sourceOrdinal, outputOrdinal) => {
    const sourceField = inputFields[sourceOrdinal];
    const sourceOutput = upstreamInspection.projection.outputs[sourceOrdinal];
    const targetField = targetFields[outputOrdinal];
    if (
      sourceField == null ||
      sourceOutput == null ||
      targetField == null ||
      targetField.sourceFieldId !== sourceField.fieldId
    ) {
      return null;
    }
    return {
      fieldId: targetField.fieldId,
      name: targetField.displayName!,
      sourceFieldId: sourceField.fieldId,
      sourceFieldName: sourceField.displayName!,
      dataType: sourceOutput.dataType,
      outputOrdinal,
      ...(targetField.description == null ? {} : { description: targetField.description }),
    };
  });
  if (outputs.some((output) => output == null)) return { ok: false };

  return {
    ok: true,
    projection: {
      source: upstreamInspection.projection.source,
      inputRelationId: inputBinding.relationId,
      inputFields: inputFields.map((field, ordinal) => ({
        fieldId: field.fieldId,
        name: field.displayName!,
        dataType: upstreamInspection.projection.outputs[ordinal]!.dataType,
      })),
      targetRelationId: targetBinding.relationId,
      outputs: outputs.filter((output) => output != null),
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
  if (project.input?.relType.case === 'project') {
    return inspectChainedDvtSubstraitProjectionDraft(draft, rootRelation.value, project);
  }
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
    sourceTypes.some((type) => inspectProjectionDataType(type) == null)
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
    | Readonly<{ kind: 'timestamp-literal'; value: string }>
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
      }>
    | Readonly<{
        kind: 'scalar-function';
        functionName: 'coalesce';
        arguments: readonly [InspectedScalar, InspectedScalar, ...InspectedScalar[]];
      }>
    | Readonly<{
        kind: 'scalar-function';
        functionName: 'extract';
        arguments: readonly [InspectedScalar];
        component: 'YEAR';
        timezone: 'UTC';
      }>;
  const inspectedScalarDataType = (expression: InspectedScalar): string => {
    if (expression.kind === 'field-reference') {
      return inspectProjectionDataType(sourceTypes[expression.sourceOrdinal]!) ?? 'unknown';
    }
    if (expression.kind === 'timestamp-literal') return 'timestamp with time zone';
    return expression.functionName === 'extract' ? 'bigint' : 'string';
  };
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
    if (expression.rexType.case === 'literal') {
      const calculated = inspectDvtSubstraitCalculatedExpression(draft.plan, expression);
      return calculated?.calculation.kind === 'timestamp-literal'
        ? { kind: 'timestamp-literal', value: calculated.calculation.value }
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
    const temporalExtract =
      entry?.kind === 'standard' &&
      entry.identity.sourceKind === 'simple-extension' &&
      entry.identity.urn === 'extension:io.substrait:functions_datetime' &&
      entry.identity.name === 'extract' &&
      entry.invocation?.signature === 'extract:req_ptstz_str';
    const outputTypeMatches = temporalExtract
      ? outputType?.case === 'i64' &&
        outputType.value.typeVariationReference === 0 &&
        outputType.value.nullability === Type_Nullability.NULLABLE
      : outputType?.case === 'string' &&
        outputType.value.typeVariationReference === 0 &&
        outputType.value.nullability === Type_Nullability.NULLABLE;
    if (
      entry == null ||
      entry.kind !== 'standard' ||
      entry.identity.sourceKind !== 'simple-extension' ||
      !outputTypeMatches
    ) {
      return null;
    }
    const expectedOptions = entry.invocation?.options ?? [];
    const invocationRange = invocationArgumentRange(entry.invocation);
    if (
      !admitsCompleteArgumentCount(invocationRange, scalarFunction.arguments.length) ||
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
    if (temporalExtract) {
      const component = scalarFunction.arguments[0]?.argType;
      const input = scalarFunction.arguments[1]?.argType;
      const timezone = scalarFunction.arguments[2]?.argType;
      const inspectedInput = input?.case === 'value' ? inspectScalar(input.value) : null;
      const timezoneLiteral = timezone?.case === 'value' ? timezone.value.rexType : undefined;
      if (
        component?.case !== 'enum' ||
        component.value !== 'YEAR' ||
        inspectedInput == null ||
        !TIMESTAMPTZ_DATA_TYPES.has(inspectedScalarDataType(inspectedInput)) ||
        timezoneLiteral?.case !== 'literal' ||
        timezoneLiteral.value.literalType.case !== 'string' ||
        timezoneLiteral.value.literalType.value !== 'UTC'
      ) {
        return null;
      }
      usedFunctionAnchors.add(scalarFunction.functionReference);
      return {
        kind: 'scalar-function',
        functionName: 'extract',
        arguments: [inspectedInput],
        component: 'YEAR',
        timezone: 'UTC',
      };
    }
    const arguments_ = scalarFunction.arguments.map((argument) =>
      argument.argType.case === 'value' ? inspectScalar(argument.argType.value) : null
    );
    if (arguments_.some((argument) => argument == null)) return null;
    const textFunction =
      entry.identity.urn === 'extension:io.substrait:functions_string' ||
      (entry.identity.urn === 'extension:io.substrait:functions_comparison' &&
        entry.identity.name === 'coalesce');
    if (
      textFunction &&
      arguments_.some(
        (argument) => argument == null || inspectedScalarDataType(argument) !== 'string'
      )
    ) {
      return null;
    }
    usedFunctionAnchors.add(scalarFunction.functionReference);
    if (entry.identity.name === 'coalesce' && arguments_.length >= 2) {
      return {
        kind: 'scalar-function',
        functionName: 'coalesce',
        arguments: [arguments_[0]!, arguments_[1]!, ...arguments_.slice(2)] as [
          InspectedScalar,
          InspectedScalar,
          ...InspectedScalar[],
        ],
      };
    }
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
      : expression.kind === 'timestamp-literal'
        ? { kind: 'timestamp-literal', value: expression.value }
        : expression.functionName === 'coalesce'
          ? {
              kind: 'scalar-function',
              functionName: 'coalesce',
              arguments: expression.arguments.map(publicScalar) as [
                DvtSubstraitScalarExpression,
                DvtSubstraitScalarExpression,
                ...DvtSubstraitScalarExpression[],
              ],
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
            : expression.functionName === 'extract'
              ? {
                  kind: 'scalar-function',
                  functionName: 'extract',
                  arguments: [publicScalar(expression.arguments[0])],
                  component: expression.component,
                  timezone: expression.timezone,
                }
              : {
                  kind: 'scalar-function',
                  functionName: expression.functionName,
                  arguments: [publicScalar(expression.arguments[0])],
                };
  const scalarOperations = (expression: DvtSubstraitScalarExpression): readonly string[] =>
    expression.kind !== 'scalar-function'
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
    if (expression.kind === 'timestamp-literal') return null;
    if (
      expression.functionName === 'concat' ||
      expression.functionName === 'coalesce' ||
      expression.functionName === 'extract'
    ) {
      return null;
    }
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
  const mappedExpression = (outputOrdinal: number): Expression | null => {
    const mapping = mappings.value.outputMapping[outputOrdinal];
    if (mapping == null) return null;
    if (mapping < sourceFields.length) return dvtSubstraitExpression.field(mapping);
    return project.expressions[mapping - sourceFields.length] ?? null;
  };
  const expressionsMatch = (left: Expression, right: Expression): boolean => {
    const leftScalar = inspectScalar(left);
    const rightScalar = inspectScalar(right);
    return (
      leftScalar != null &&
      rightScalar != null &&
      JSON.stringify(publicScalar(leftScalar)) === JSON.stringify(publicScalar(rightScalar))
    );
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
    const persistedOperandFieldIds = targetField?.operandFieldIds;
    const rawExpression = mappedExpression(outputOrdinal);
    const rawScalarArguments =
      rawExpression?.rexType.case === 'scalarFunction'
        ? rawExpression.rexType.value.arguments.flatMap((argument) =>
            argument.argType.case === 'value' ? [argument.argType.value] : []
          )
        : [];
    const persistedOperandsMatch =
      persistedOperandFieldIds != null &&
      persistedOperandFieldIds.length === rawScalarArguments.length &&
      persistedOperandFieldIds.every((fieldId, index) => {
        const operandField = targetFields.find((field) => field.fieldId === fieldId);
        const operandExpression =
          operandField == null ? null : mappedExpression(operandField.outputOrdinal);
        return (
          fieldId !== targetField?.fieldId &&
          operandExpression != null &&
          expressionsMatch(operandExpression, rawScalarArguments[index]!)
        );
      });
    if (
      resolvedExpression == null ||
      ('sourceOrdinal' in resolvedExpression && sourceField == null) ||
      targetField == null ||
      (sourceField != null && sourceField.displayName == null) ||
      (sourceField != null &&
        targetField.sourceFieldId != null &&
        targetField.sourceFieldId !== sourceField.fieldId) ||
      (persistedOperandFieldIds != null && !persistedOperandsMatch) ||
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
          ? scalarExpression.kind === 'scalar-function' &&
            scalarExpression.functionName === 'extract'
            ? 'bigint'
            : 'string'
          : calculation == null
            ? sourceField == null
              ? 'unknown'
              : (inspectProjectionDataType(
                  sourceTypes[
                    'sourceOrdinal' in resolvedExpression ? resolvedExpression.sourceOrdinal : -1
                  ]!
                ) ?? 'unknown')
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
          entry.urn !== 'extension:io.substrait:functions_arithmetic' &&
          entry.urn !== 'extension:io.substrait:functions_comparison' &&
          entry.urn !== 'extension:io.substrait:functions_datetime')
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
          dataType: inspectProjectionDataType(sourceTypes[ordinal]!)!,
        })),
      },
      inputRelationId: sourceBinding.relationId,
      inputFields: sourceFields.map((field, ordinal) => ({
        fieldId: field.fieldId,
        name: field.displayName!,
        dataType: inspectProjectionDataType(sourceTypes[ordinal]!)!,
      })),
      targetRelationId: targetBinding.relationId,
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
  const alias = args.alias;
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
          resolution: 'complete',
        }).find((entry) => entry.capabilityId === args.capabilityId)
      : undefined;
  if (
    !inspection.ok ||
    args.provider !== inspection.projection.source.sourceRef.connectionRef.provider ||
    capability == null ||
    !admitsCompleteArgumentCount(capability, operandFieldIds.length) ||
    !PostgresIdentifierV1Schema.safeParse(alias).success ||
    output == null ||
    operands.some((operand) => operand == null) ||
    new Set(operandFieldIds).size !== operandFieldIds.length ||
    inspection.projection.outputs.some(
      (candidate) => candidate.fieldId !== args.fieldId && candidate.name === alias
    ) ||
    inspection.projection.inputFields.some(
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
  const sourceFieldCount = inspection.projection.inputFields.length;
  if (targetMapping == null) return draft;

  const expressionForMapping = (mapping: number): Expression | undefined => {
    if (mapping < sourceFieldCount) return dvtSubstraitExpression.field(mapping);
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
  const definedOperandExpressions = operandExpressions.filter(
    (expression): expression is Expression => expression != null
  );

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
  const temporalExtract =
    functionIdentity.urn === 'extension:io.substrait:functions_datetime' &&
    functionIdentity.name === 'extract' &&
    signature === 'extract:req_ptstz_str';
  const extensionFunction = dvtSubstraitExpression.ensureScalarFunction(plan, {
    urn: functionIdentity.urn,
    name: signature,
  });

  const nextExpression = dvtSubstraitExpression.scalarFunction({
    functionReference: extensionFunction.functionAnchor,
    arguments: temporalExtract
      ? [
          definedOperandExpressions[0]!,
          dvtSubstraitExpression.literal({ dataType: 'string', value: 'UTC' }),
        ]
      : definedOperandExpressions,
    leadingEnumArguments: temporalExtract ? ['YEAR'] : undefined,
    options: functionEntry.invocation?.options,
    outputType: temporalExtract
      ? create(TypeSchema, {
          kind: {
            case: 'i64',
            value: create(Type_I64Schema, { nullability: Type_Nullability.NULLABLE }),
          },
        })
      : create(TypeSchema, {
          kind: {
            case: 'string',
            value: create(Type_StringSchema, { nullability: Type_Nullability.NULLABLE }),
          },
        }),
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
        const {
          sourceFieldId: _sourceFieldId,
          operandFieldIds: _operandFieldIds,
          ...preserved
        } = field;
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

type ResolveDvtSubstraitProjectionEntryArgs = Readonly<{
  targetNode: CanonicalNode;
  nodes: readonly CanonicalNode[];
  edges: readonly Pick<CanonicalEdge, 'sourceId' | 'targetId'>[];
  draft: DvtSubstraitProjectionDraft;
}>;

function resolveDvtSubstraitProjectionEntryInternal(
  args: ResolveDvtSubstraitProjectionEntryArgs,
  visitedNodeIds: ReadonlySet<string>
): DvtSubstraitProjection | null {
  if (visitedNodeIds.has(args.targetNode.id)) return null;
  const nextVisitedNodeIds = new Set(visitedNodeIds);
  nextVisitedNodeIds.add(args.targetNode.id);
  const inspection = inspectDvtSubstraitProjectionDraft(args.draft);
  if (!inspection.ok) return null;
  const inputBinding = args.draft.sidecar.relations.find(
    (relation) => relation.relationId === inspection.projection.inputRelationId
  );
  if (inputBinding == null) return null;
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

  if (inputBinding.sourceRef != null) {
    const matchingSources = candidateNodes.flatMap((sourceNode) => {
      const source = resolveDvtSubstraitProjectionSource(sourceNode);
      return source != null &&
        source.table === inspection.projection.source.table &&
        sameConnectedSourceRef(source.sourceRef, inspection.projection.source.sourceRef) &&
        source.fields.map((field) => field.name).join('\u0000') ===
          inspection.projection.inputFields.map((field) => field.name).join('\u0000')
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

  const matchingTransforms = candidateNodes.flatMap((sourceNode) => {
    if (sourceNode.pluginId !== 'dvt' || sourceNode.kind !== 'dvt:transform') return [];
    try {
      const authority = readDvtTransformAuthoringAuthority(sourceNode);
      if (authority == null) return [];
      const sourceDraft = decodeDvtSubstraitProjectionDocument(authority.semanticDocument);
      const sourceInspection = inspectDvtSubstraitProjectionDraft(sourceDraft);
      if (
        !sourceInspection.ok ||
        sourceInspection.projection.targetRelationId !== inspection.projection.inputRelationId ||
        sourceInspection.projection.outputs.length !== inspection.projection.inputFields.length
      ) {
        return [];
      }
      const resolvedUpstream = resolveDvtSubstraitProjectionEntryInternal(
        { ...args, targetNode: sourceNode, draft: sourceDraft },
        nextVisitedNodeIds
      );
      if (
        resolvedUpstream == null ||
        sourceInspection.projection.outputs.some((output, ordinal) => {
          const input = inspection.projection.inputFields[ordinal];
          const resolvedInput = resolvedUpstream.outputs[ordinal];
          return (
            input == null ||
            resolvedInput == null ||
            output.fieldId !== input.fieldId ||
            resolvedInput.fieldId !== input.fieldId
          );
        })
      ) {
        return [];
      }
      return [{ sourceNode, sourceInspection, resolvedUpstream }] as const;
    } catch {
      return [];
    }
  });
  if (matchingTransforms.length !== 1) return null;
  const match = matchingTransforms[0]!;
  const currentInputByFieldId = new Map(
    match.resolvedUpstream.outputs.map((output) => [output.fieldId, output] as const)
  );
  const source = {
    nodeId: match.sourceNode.id,
    schema: match.resolvedUpstream.source.schema,
    table: match.resolvedUpstream.source.table,
    sourceRef: match.resolvedUpstream.source.sourceRef,
    fields: match.resolvedUpstream.outputs.map((output) => ({
      name: output.name,
      dataType: output.dataType,
    })),
  };
  return {
    targetNodeId: args.targetNode.id,
    source,
    outputs: inspection.projection.outputs.map((output) => {
      const currentInput =
        output.sourceFieldId == null ? undefined : currentInputByFieldId.get(output.sourceFieldId);
      return {
        ...output,
        ...(currentInput == null
          ? {}
          : { sourceFieldName: currentInput.name, dataType: currentInput.dataType }),
      };
    }),
  };
}

export function resolveDvtSubstraitProjectionEntry(
  args: ResolveDvtSubstraitProjectionEntryArgs
): DvtSubstraitProjection | null {
  return resolveDvtSubstraitProjectionEntryInternal(args, new Set());
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
