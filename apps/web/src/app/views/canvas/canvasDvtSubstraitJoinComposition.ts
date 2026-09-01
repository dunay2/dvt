/** Owned concern: build and inspect only the first two-source INNER JOIN shape admitted by #2634. */
import { create, fromBinary, toBinary } from '@bufbuild/protobuf';
import {
  AggregateFunction_AggregationInvocation,
  AggregateFunctionSchema,
  AggregateRelSchema,
  AggregateRel_GroupingSchema,
  AggregateRel_MeasureSchema,
  AggregationPhase,
  ExpressionSchema,
  Expression_FieldReferenceSchema,
  Expression_FieldReference_RootReferenceSchema,
  Expression_ReferenceSegmentSchema,
  Expression_ReferenceSegment_StructFieldSchema,
  Expression_ScalarFunctionSchema,
  Expression_WindowFunctionSchema,
  Expression_WindowFunction_BoundsType,
  FunctionArgumentSchema,
  JoinRelSchema,
  JoinRel_JoinType,
  ProjectRelSchema,
  ReadRelSchema,
  ReadRel_NamedTableSchema,
  RelCommonSchema,
  RelCommon_EmitSchema,
  RelRootSchema,
  RelSchema,
  SortFieldSchema,
  SortField_SortDirection,
  type Rel,
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
  Type_BooleanSchema,
  Type_Nullability,
  Type_StringSchema,
  Type_StructSchema,
} from '@buf/substrait_substrait.bufbuild_es/substrait/type_pb.js';
import { base64Bytes, sha256Hex } from '@dvt/crypto';
import {
  DVT_SUBSTRAIT_AUTHORING_SIDECAR_SCHEMA_VERSION,
  DVT_SUBSTRAIT_CAPABILITY_CATALOG_V1,
  DVT_SUBSTRAIT_PLAN_ENCODING,
  DVT_SUBSTRAIT_PROFILE_REF_V1,
  DVT_SUBSTRAIT_SEMANTIC_DOCUMENT_SCHEMA_VERSION,
  DVT_TRANSFORM_AUTHORING_MODE,
  ConnectedSourceRefSchema,
  buildDvtSubstraitStandardCapabilityId,
  canonicalizeDvtSubstraitSemanticDocumentV1,
  type ConnectedSourceRef,
  type DvtSubstraitAuthoringSidecarV1,
  type DvtSubstraitSemanticDocumentV1,
} from '@dvt/contracts';

import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import {
  createDvtSubstraitFieldReference,
  createDvtSubstraitRequiredI64Type,
  DVT_SUBSTRAIT_COUNT_CAPABILITY_ID,
  ensureDvtSubstraitCountFunction,
  isDvtSubstraitCountFunction,
  readDvtSubstraitFieldReferenceOrdinal,
  removeDvtSubstraitCountExtension,
} from './canvasDvtSubstraitAggregation';
import { readDvtTransformAuthoringAuthority } from './canvasDvtTransformAuthoringAuthority';
import {
  createDvtSubstraitNullableI64Type,
  DVT_SUBSTRAIT_ROW_NUMBER_CAPABILITY_ID,
  ensureDvtSubstraitRowNumberFunction,
  isDvtSubstraitRowNumberFunction,
  removeDvtSubstraitRowNumberExtension,
} from './canvasDvtSubstraitWindow';

const ZERO_SHA256 = '0'.repeat(64);
const COMPARISON_FUNCTION_URN = 'extension:io.substrait:functions_comparison';
const EQUAL_FUNCTION_NAME = 'equal';
const LEFT_FIELD_NAMES = ['customer_id', 'name'] as const;
const RIGHT_FIELD_NAMES = ['order_id', 'customer_id'] as const;
const INNER_JOIN_OUTPUT_FIELDS = [
  {
    fieldKey: 'left.customer_id',
    outputMapping: 0,
    defaultName: 'customer_id',
    source: { relation: 'left', name: 'customer_id' },
  },
  {
    fieldKey: 'left.name',
    outputMapping: 1,
    defaultName: 'name',
    source: { relation: 'left', name: 'name' },
  },
  {
    fieldKey: 'right.order_id',
    outputMapping: 2,
    defaultName: 'order_id',
    source: { relation: 'right', name: 'order_id' },
  },
] as const;
const OUTPUT_FIELD_NAMES = INNER_JOIN_OUTPUT_FIELDS.map((field) => field.defaultName);

export type DvtSubstraitInnerJoinFieldKey = (typeof INNER_JOIN_OUTPUT_FIELDS)[number]['fieldKey'];
export const DVT_SUBSTRAIT_INNER_JOIN_FIELD_KEYS: readonly DvtSubstraitInnerJoinFieldKey[] =
  Object.freeze(INNER_JOIN_OUTPUT_FIELDS.map((field) => field.fieldKey));

type DvtSubstraitInnerJoinFieldSelector =
  | Readonly<{ fieldKey: DvtSubstraitInnerJoinFieldKey; sourceFieldId?: never }>
  | Readonly<{ fieldKey?: never; sourceFieldId: string }>;

export type DvtSubstraitInnerJoinFieldEdit =
  | Readonly<
      DvtSubstraitInnerJoinFieldSelector & {
        kind: 'set-selected';
        selected: boolean;
      }
    >
  | Readonly<
      DvtSubstraitInnerJoinFieldSelector & {
        kind: 'rename';
        outputName: string;
      }
    >
  | Readonly<
      DvtSubstraitInnerJoinFieldSelector & {
        kind: 'move';
        direction: 'up' | 'down';
      }
    >;

export type DvtSubstraitJoinSource = Readonly<{
  nodeId: string;
  schema: string;
  table: string;
  sourceRef: ConnectedSourceRef;
}>;

export type DvtSubstraitInnerJoinDraft = Readonly<{
  plan: Plan;
  sidecar: DvtSubstraitAuthoringSidecarV1;
}>;

export type DvtSubstraitInnerJoinProjection = Readonly<{
  left: Readonly<{ schema: string; table: string; sourceRef: ConnectedSourceRef }>;
  right: Readonly<{ schema: string; table: string; sourceRef: ConnectedSourceRef }>;
  leftKey: 'customer_id';
  rightKey: 'customer_id';
  outputs: readonly Readonly<{
    fieldKey: DvtSubstraitInnerJoinFieldKey;
    name: string;
    fieldId: string;
    dataType: 'string';
    outputOrdinal: number;
    source: Readonly<{ relation: 'left' | 'right'; name: string }>;
  }>[];
}>;

export type DvtSubstraitInnerJoinInspection =
  Readonly<{ ok: true; projection: DvtSubstraitInnerJoinProjection }> | Readonly<{ ok: false }>;

type DvtSubstraitInnerJoinGroupingCommon = Readonly<{
  measure: Readonly<{ name: string; fieldId: string; capabilityId: string }>;
  outputs: readonly Readonly<{
    name: string;
    fieldId: string;
    dataType: 'string' | 'i64';
    outputOrdinal: number;
  }>[];
}>;

export type DvtSubstraitInnerJoinGroupingProjection =
  | Readonly<
      DvtSubstraitInnerJoinGroupingCommon & {
        kind: 'binary';
        left: DvtSubstraitInnerJoinProjection['left'];
        right: DvtSubstraitInnerJoinProjection['right'];
        leftKey: DvtSubstraitInnerJoinProjection['leftKey'];
        rightKey: DvtSubstraitInnerJoinProjection['rightKey'];
        groupField: Readonly<{
          fieldKey: DvtSubstraitInnerJoinFieldKey;
          name: string;
          fieldId: string;
          inputOrdinal: number;
          source: Readonly<{ relation: 'left' | 'right'; name: string }>;
        }>;
      }
    >
  | Readonly<
      DvtSubstraitInnerJoinGroupingCommon & {
        kind: 'n-input';
        targetNodeId: DvtSubstraitNInputJoinProjection['targetNodeId'];
        inputs: DvtSubstraitNInputJoinProjection['inputs'];
        joins: DvtSubstraitNInputJoinProjection['joins'];
        groupField: Readonly<{
          name: string;
          fieldId: string;
          inputOrdinal: number;
          source: DvtSubstraitNInputJoinProjection['outputs'][number]['source'];
        }>;
      }
    >;

export type DvtSubstraitInnerJoinGroupingInspection =
  | Readonly<{ ok: true; projection: DvtSubstraitInnerJoinGroupingProjection }>
  | Readonly<{ ok: false }>;

type DvtSubstraitInnerJoinGroupedWindowCommon = Readonly<{
  measure: Readonly<{ name: string; fieldId: string }>;
  result: Readonly<{ name: string; fieldId: string; capabilityId: string }>;
  outputs: readonly Readonly<{
    name: string;
    fieldId: string;
    dataType: 'string' | 'i64';
    outputOrdinal: number;
  }>[];
}>;

export type DvtSubstraitInnerJoinGroupedWindowProjection =
  | Readonly<
      DvtSubstraitInnerJoinGroupedWindowCommon & {
        kind: 'binary';
        left: DvtSubstraitInnerJoinProjection['left'];
        right: DvtSubstraitInnerJoinProjection['right'];
        leftKey: DvtSubstraitInnerJoinProjection['leftKey'];
        rightKey: DvtSubstraitInnerJoinProjection['rightKey'];
        groupField: Extract<
          DvtSubstraitInnerJoinGroupingProjection,
          { kind: 'binary' }
        >['groupField'];
      }
    >
  | Readonly<
      DvtSubstraitInnerJoinGroupedWindowCommon & {
        kind: 'n-input';
        targetNodeId: DvtSubstraitNInputJoinProjection['targetNodeId'];
        inputs: DvtSubstraitNInputJoinProjection['inputs'];
        joins: DvtSubstraitNInputJoinProjection['joins'];
        groupField: Extract<
          DvtSubstraitInnerJoinGroupingProjection,
          { kind: 'n-input' }
        >['groupField'];
      }
    >;

export type DvtSubstraitInnerJoinGroupedWindowInspection =
  | Readonly<{ ok: true; projection: DvtSubstraitInnerJoinGroupedWindowProjection }>
  | Readonly<{ ok: false }>;

export type DvtSubstraitInnerJoinEntry = Readonly<{
  left: DvtSubstraitJoinSource;
  right: DvtSubstraitJoinSource;
  targetNodeId: string;
}>;

export type DvtSubstraitJoinInput = Readonly<{
  source: DvtSubstraitJoinSource;
  fields: readonly string[];
}>;

export type DvtSubstraitJoinPredicate = Readonly<{
  leftSourceFieldId: string;
  rightSourceFieldId: string;
}>;

export type DvtSubstraitJoinOutputSelection = Readonly<{
  name: string;
  sourceFieldId: string;
  fieldId?: string;
}>;

export type DvtSubstraitNInputJoinEntry = Readonly<{
  inputs: readonly DvtSubstraitJoinInput[];
  predicates: readonly DvtSubstraitJoinPredicate[];
  outputs: readonly DvtSubstraitJoinOutputSelection[];
  targetNodeId: string;
}>;

export type DvtSubstraitNInputJoinProjection = Readonly<{
  targetNodeId: string;
  inputs: readonly Readonly<{
    nodeId: string;
    schema: string;
    table: string;
    sourceRef: ConnectedSourceRef;
    fields: readonly Readonly<{ name: string; fieldId: string }>[];
  }>[];
  joins: readonly DvtSubstraitJoinPredicate[];
  outputs: readonly Readonly<{
    name: string;
    fieldId: string;
    dataType: 'string';
    outputOrdinal: number;
    source: Readonly<{ nodeId: string; name: string; fieldId: string }>;
  }>[];
}>;

export type DvtSubstraitNInputJoinInspection =
  Readonly<{ ok: true; projection: DvtSubstraitNInputJoinProjection }> | Readonly<{ ok: false }>;

export type DvtSubstraitJoinAppendInput = Readonly<{
  source: DvtSubstraitJoinSource;
  fields: readonly string[];
  predicate: Readonly<{ leftSourceFieldId: string; rightFieldName: string }>;
  selectedFields: readonly string[];
}>;

function readMetadataText(node: CanonicalNode, key: string): string | null {
  const value = node.metadata?.[key];
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function readSourceColumnNames(node: CanonicalNode): readonly string[] | null {
  const columns = node.metadata?.columns;
  if (!Array.isArray(columns)) return null;
  const names = columns.map((column) => {
    if (column == null || typeof column !== 'object' || Array.isArray(column)) return null;
    const name = (column as Record<string, unknown>).name;
    const type = (column as Record<string, unknown>).type;
    return typeof name === 'string' && name.trim().length > 0 && type === 'string'
      ? name.trim()
      : null;
  });
  return names.some((name) => name == null) ? null : names.filter((name) => name != null);
}

function resolveJoinSource(
  node: CanonicalNode,
  expectedColumns: readonly string[]
): DvtSubstraitJoinSource | null {
  const input = resolveJoinInput(node);
  return input == null || input.fields.join(',') !== expectedColumns.join(',')
    ? null
    : input.source;
}

function resolveJoinInput(node: CanonicalNode): DvtSubstraitJoinInput | null {
  if (node.kind !== 'dvt:source' || node.role !== 'input') return null;
  const connectedSourceRef = ConnectedSourceRefSchema.safeParse(node.metadata?.connectedSourceRef);
  const schema = readMetadataText(node, 'schema');
  const table = readMetadataText(node, 'tableName');
  const columns = readSourceColumnNames(node);
  if (
    !connectedSourceRef.success ||
    connectedSourceRef.data.connectionRef.provider !== 'postgres' ||
    schema == null ||
    table == null ||
    columns == null
  ) {
    return null;
  }
  return {
    source: { nodeId: node.id, schema, table, sourceRef: connectedSourceRef.data },
    fields: columns,
  };
}

function hasSameConnectionRef(
  first: ConnectedSourceRef['connectionRef'],
  second: ConnectedSourceRef['connectionRef']
): boolean {
  return (
    first.schemaVersion === second.schemaVersion &&
    first.provider === second.provider &&
    first.connectionId === second.connectionId
  );
}

function hasSameConnectedSourceRef(first: ConnectedSourceRef, second: ConnectedSourceRef): boolean {
  return (
    first.schemaVersion === second.schemaVersion &&
    first.sourceObjectId === second.sourceObjectId &&
    hasSameConnectionRef(first.connectionRef, second.connectionRef)
  );
}

export function resolveDvtSubstraitJoinAppendCandidates(args: {
  targetNode: CanonicalNode;
  nodes: readonly CanonicalNode[];
  edges: readonly CanonicalEdge[];
  draft: DvtSubstraitInnerJoinDraft;
}): readonly DvtSubstraitJoinInput[] {
  if (
    args.targetNode.pluginId !== 'dvt' ||
    args.targetNode.kind !== 'dvt:transform' ||
    args.targetNode.role !== 'transform'
  ) {
    return [];
  }
  const inspection = inspectDvtSubstraitNInputJoinDraft(args.draft);
  if (!inspection.ok) return [];
  const existingNodeIds = new Set(inspection.projection.inputs.map((input) => input.nodeId));
  const connectionRef = inspection.projection.inputs[0]!.sourceRef.connectionRef;
  const connectedIds = new Set(
    args.edges
      .filter((edge) => edge.targetId === args.targetNode.id)
      .map((edge) => edge.sourceId)
      .filter((nodeId) => !existingNodeIds.has(nodeId))
  );
  return args.nodes
    .filter((node) => connectedIds.has(node.id))
    .map(resolveJoinInput)
    .filter(
      (input): input is DvtSubstraitJoinInput =>
        input != null && hasSameConnectionRef(connectionRef, input.source.sourceRef.connectionRef)
    )
    .sort((left, right) =>
      `${left.source.table}:${left.source.nodeId}`.localeCompare(
        `${right.source.table}:${right.source.nodeId}`
      )
    );
}

export function resolveDvtSubstraitInnerJoinEntry(args: {
  targetNode: CanonicalNode;
  nodes: readonly CanonicalNode[];
  edges: readonly CanonicalEdge[];
  requirePersistedAuthority?: boolean;
}): DvtSubstraitInnerJoinEntry | null {
  if (
    args.targetNode.pluginId !== 'dvt' ||
    args.targetNode.kind !== 'dvt:transform' ||
    args.targetNode.role !== 'transform'
  ) {
    return null;
  }
  const sourceIds = [
    ...new Set(
      args.edges.filter((edge) => edge.targetId === args.targetNode.id).map((edge) => edge.sourceId)
    ),
  ];
  if (sourceIds.length !== 2) return null;
  const sources = sourceIds
    .map((sourceId) => args.nodes.find((node) => node.id === sourceId))
    .filter((node): node is CanonicalNode => node != null);
  if (sources.length !== 2) return null;

  const left = sources.map((source) => resolveJoinSource(source, LEFT_FIELD_NAMES)).find(Boolean);
  const right = sources.map((source) => resolveJoinSource(source, RIGHT_FIELD_NAMES)).find(Boolean);
  if (left == null || right == null || left.nodeId === right.nodeId) return null;
  if (!hasSameConnectionRef(left.sourceRef.connectionRef, right.sourceRef.connectionRef)) {
    return null;
  }

  if (args.requirePersistedAuthority) {
    try {
      const authority = readDvtTransformAuthoringAuthority(args.targetNode);
      if (authority.mode !== DVT_TRANSFORM_AUTHORING_MODE.substrait) return null;
      const inspection = inspectDvtSubstraitInnerJoinAcceptedDraft(
        decodeDvtSubstraitInnerJoinDocument(authority.semanticDocument)
      );
      if (
        !inspection.ok ||
        !('left' in inspection.projection) ||
        !('right' in inspection.projection)
      ) {
        return null;
      }
      if (
        inspection.projection.left.schema !== left.schema ||
        inspection.projection.left.table !== left.table ||
        !hasSameConnectedSourceRef(inspection.projection.left.sourceRef, left.sourceRef) ||
        inspection.projection.right.schema !== right.schema ||
        inspection.projection.right.table !== right.table ||
        !hasSameConnectedSourceRef(inspection.projection.right.sourceRef, right.sourceRef)
      ) {
        return null;
      }
    } catch {
      return null;
    }
  }
  return { left, right, targetNodeId: args.targetNode.id };
}

export function resolveDvtSubstraitNInputJoinEntry(args: {
  targetNode: CanonicalNode;
  nodes: readonly CanonicalNode[];
  edges: readonly CanonicalEdge[];
  draft?: DvtSubstraitInnerJoinDraft;
}): DvtSubstraitNInputJoinEntry | null {
  if (
    args.targetNode.pluginId !== 'dvt' ||
    args.targetNode.kind !== 'dvt:transform' ||
    args.targetNode.role !== 'transform'
  ) {
    return null;
  }
  let draft = args.draft;
  if (draft == null) {
    try {
      const authority = readDvtTransformAuthoringAuthority(args.targetNode);
      if (authority.mode !== DVT_TRANSFORM_AUTHORING_MODE.substrait) return null;
      draft = decodeDvtSubstraitInnerJoinDocument(authority.semanticDocument);
    } catch {
      return null;
    }
  }
  const groupedWindowInspection = inspectDvtSubstraitInnerJoinGroupedWindowDraft(draft);
  const groupingInspection = inspectDvtSubstraitInnerJoinGroupingDraft(draft);
  const joinDraft = groupedWindowInspection.ok
    ? removeDvtSubstraitInnerJoinGrouping(removeDvtSubstraitInnerJoinGroupedRowNumber(draft))
    : groupingInspection.ok
      ? removeDvtSubstraitInnerJoinGrouping(draft)
      : draft;
  const inspection = inspectDvtSubstraitNInputJoinDraft(joinDraft);
  if (!inspection.ok || inspection.projection.targetNodeId !== args.targetNode.id) return null;

  const graphSourceIds = [
    ...new Set(
      args.edges.filter((edge) => edge.targetId === args.targetNode.id).map((edge) => edge.sourceId)
    ),
  ];
  const semanticSourceIds = new Set(inspection.projection.inputs.map((input) => input.nodeId));
  if (
    graphSourceIds.length !== inspection.projection.inputs.length ||
    graphSourceIds.some((sourceId) => !semanticSourceIds.has(sourceId))
  ) {
    return null;
  }

  const inputs: DvtSubstraitJoinInput[] = [];
  for (const semanticInput of inspection.projection.inputs) {
    const node = args.nodes.find((candidate) => candidate.id === semanticInput.nodeId);
    const graphInput = node == null ? null : resolveJoinInput(node);
    const semanticFields = semanticInput.fields.map((field) => field.name);
    if (
      graphInput == null ||
      graphInput.source.schema !== semanticInput.schema ||
      graphInput.source.table !== semanticInput.table ||
      !hasSameConnectedSourceRef(graphInput.source.sourceRef, semanticInput.sourceRef) ||
      graphInput.fields.length !== semanticFields.length ||
      graphInput.fields.some((field, index) => field !== semanticFields[index])
    ) {
      return null;
    }
    inputs.push(graphInput);
  }

  return {
    inputs,
    predicates: inspection.projection.joins,
    outputs: inspection.projection.outputs.map((output) => ({
      name: output.name,
      sourceFieldId: output.source.fieldId,
    })),
    targetNodeId: args.targetNode.id,
  };
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function stringType() {
  return create(TypeSchema, {
    kind: {
      case: 'string',
      value: create(Type_StringSchema, { nullability: Type_Nullability.NULLABLE }),
    },
  });
}

function booleanType() {
  return create(TypeSchema, {
    kind: {
      case: 'bool',
      value: create(Type_BooleanSchema, { nullability: Type_Nullability.NULLABLE }),
    },
  });
}

function fieldReference(ordinal: number) {
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

function readRelation(args: {
  relAnchor: number;
  schema: string;
  table: string;
  fields: readonly string[];
}) {
  return create(RelSchema, {
    relType: {
      case: 'read',
      value: create(ReadRelSchema, {
        common: create(RelCommonSchema, { relAnchor: args.relAnchor }),
        baseSchema: create(NamedStructSchema, {
          names: [...args.fields],
          struct: create(Type_StructSchema, {
            types: args.fields.map(() => stringType()),
            nullability: Type_Nullability.REQUIRED,
          }),
        }),
        readType: {
          case: 'namedTable',
          value: create(ReadRel_NamedTableSchema, { names: [args.schema, args.table] }),
        },
      }),
    },
  });
}

function requireSupportedCapability(entryId: string): void {
  const capability = DVT_SUBSTRAIT_CAPABILITY_CATALOG_V1.entries.find(
    (entry) =>
      entry.kind === 'standard' &&
      entry.entryId === entryId &&
      entry.profileStatus === 'supported-profile'
  );
  if (capability == null) throw new Error(`Substrait capability ${entryId} is not supported.`);
}

function requireInnerJoinCapabilities(): void {
  requireSupportedCapability(
    buildDvtSubstraitStandardCapabilityId('relation', {
      sourceKind: 'core',
      message: 'substrait.JoinRel',
      selector: 'JoinType.JOIN_TYPE_INNER',
    })
  );
  requireSupportedCapability(
    buildDvtSubstraitStandardCapabilityId('scalar-function', {
      sourceKind: 'simple-extension',
      urn: COMPARISON_FUNCTION_URN,
      name: EQUAL_FUNCTION_NAME,
    })
  );
  requireSupportedCapability(
    buildDvtSubstraitStandardCapabilityId('type', {
      sourceKind: 'core',
      message: 'substrait.Type',
      selector: 'kind.bool',
    })
  );
}

function assertCompatibleSources(
  left: DvtSubstraitJoinSource,
  right: DvtSubstraitJoinSource
): void {
  const leftConnection = left.sourceRef.connectionRef;
  const rightConnection = right.sourceRef.connectionRef;
  if (
    leftConnection.provider !== 'postgres' ||
    rightConnection.provider !== 'postgres' ||
    leftConnection.schemaVersion !== rightConnection.schemaVersion ||
    leftConnection.connectionId !== rightConnection.connectionId
  ) {
    throw new Error('VTX2 INNER JOIN requires two PostgreSQL sources on the same connection.');
  }
  for (const value of [
    left.nodeId,
    left.schema,
    left.table,
    right.nodeId,
    right.schema,
    right.table,
  ]) {
    if (value.length === 0 || value !== value.trim()) {
      throw new Error('VTX2 INNER JOIN source identity must be non-blank and trimmed.');
    }
  }
}

export function createDvtSubstraitInnerJoinDraft(args: {
  left: DvtSubstraitJoinSource;
  right: DvtSubstraitJoinSource;
  targetNodeId: string;
}): DvtSubstraitInnerJoinDraft {
  requireInnerJoinCapabilities();
  assertCompatibleSources(args.left, args.right);
  if (args.targetNodeId.length === 0 || args.targetNodeId !== args.targetNodeId.trim()) {
    throw new Error('VTX2 INNER JOIN target node identity must be non-blank and trimmed.');
  }

  const left = readRelation({
    relAnchor: 1,
    schema: args.left.schema,
    table: args.left.table,
    fields: LEFT_FIELD_NAMES,
  });
  const right = readRelation({
    relAnchor: 2,
    schema: args.right.schema,
    table: args.right.table,
    fields: RIGHT_FIELD_NAMES,
  });
  const equalFunctionAnchor = 1;
  const join = create(RelSchema, {
    relType: {
      case: 'join',
      value: create(JoinRelSchema, {
        common: create(RelCommonSchema, {
          relAnchor: 3,
          emitKind: {
            case: 'emit',
            value: create(RelCommon_EmitSchema, { outputMapping: [0, 1, 2] }),
          },
        }),
        left,
        right,
        expression: create(ExpressionSchema, {
          rexType: {
            case: 'scalarFunction',
            value: create(Expression_ScalarFunctionSchema, {
              functionReference: equalFunctionAnchor,
              arguments: [
                create(FunctionArgumentSchema, {
                  argType: { case: 'value', value: fieldReference(0) },
                }),
                create(FunctionArgumentSchema, {
                  argType: { case: 'value', value: fieldReference(3) },
                }),
              ],
              outputType: booleanType(),
            }),
          },
        }),
        type: JoinRel_JoinType.INNER,
      }),
    },
  });
  const plan = create(PlanSchema, {
    version: {
      majorNumber: 0,
      minorNumber: 101,
      patchNumber: 0,
      producer: 'dvt-vtx2-inner-join-card',
    },
    extensionUrns: [
      create(SimpleExtensionURNSchema, {
        extensionUrnAnchor: 1,
        urn: COMPARISON_FUNCTION_URN,
      }),
    ],
    extensions: [
      create(SimpleExtensionDeclarationSchema, {
        mappingType: {
          case: 'extensionFunction',
          value: create(SimpleExtensionDeclaration_ExtensionFunctionSchema, {
            extensionUrnReference: 1,
            functionAnchor: equalFunctionAnchor,
            name: EQUAL_FUNCTION_NAME,
          }),
        },
      }),
    ],
    relations: [
      create(PlanRelSchema, {
        relType: {
          case: 'root',
          value: create(RelRootSchema, { input: join, names: [...OUTPUT_FIELD_NAMES] }),
        },
      }),
    ],
  });
  const resultRelationId = `relation:${args.targetNodeId}:join`;
  const sidecar: DvtSubstraitAuthoringSidecarV1 = {
    schemaVersion: DVT_SUBSTRAIT_AUTHORING_SIDECAR_SCHEMA_VERSION,
    semanticPlanSha256: ZERO_SHA256,
    relations: [
      {
        relationId: `relation:${args.left.nodeId}`,
        relAnchor: 1,
        sourceRef: args.left.sourceRef,
        displayName: args.left.table,
      },
      {
        relationId: `relation:${args.right.nodeId}`,
        relAnchor: 2,
        sourceRef: args.right.sourceRef,
        displayName: args.right.table,
      },
      {
        relationId: resultRelationId,
        relAnchor: 3,
        displayName: `${args.left.table}+${args.right.table}`,
      },
    ],
    fields: [
      ...LEFT_FIELD_NAMES.map((name, outputOrdinal) => ({
        fieldId: `field:${args.left.nodeId}:${name}`,
        relationId: `relation:${args.left.nodeId}`,
        outputOrdinal,
        displayName: name,
      })),
      ...RIGHT_FIELD_NAMES.map((name, outputOrdinal) => ({
        fieldId: `field:${args.right.nodeId}:${name}`,
        relationId: `relation:${args.right.nodeId}`,
        outputOrdinal,
        displayName: name,
      })),
      ...OUTPUT_FIELD_NAMES.map((name, outputOrdinal) => ({
        fieldId: `field:${args.targetNodeId}:${name}`,
        relationId: resultRelationId,
        outputOrdinal,
        displayName: name,
      })),
    ],
  };
  return { plan, sidecar };
}

type DvtSubstraitJoinWorkingField = Readonly<{
  sourceNodeId: string;
  sourceName: string;
  sourceFieldId: string;
}>;

function createNInputInnerJoinRelation(args: {
  relAnchor: number;
  left: Rel;
  right: Rel;
  leftKeyOrdinal: number;
  rightKeyOrdinal: number;
  outputMapping: readonly number[];
  equalFunctionAnchor: number;
}): Rel {
  return create(RelSchema, {
    relType: {
      case: 'join',
      value: create(JoinRelSchema, {
        common: create(RelCommonSchema, {
          relAnchor: args.relAnchor,
          emitKind: {
            case: 'emit',
            value: create(RelCommon_EmitSchema, { outputMapping: [...args.outputMapping] }),
          },
        }),
        left: args.left,
        right: args.right,
        expression: create(ExpressionSchema, {
          rexType: {
            case: 'scalarFunction',
            value: create(Expression_ScalarFunctionSchema, {
              functionReference: args.equalFunctionAnchor,
              arguments: [
                create(FunctionArgumentSchema, {
                  argType: { case: 'value', value: fieldReference(args.leftKeyOrdinal) },
                }),
                create(FunctionArgumentSchema, {
                  argType: { case: 'value', value: fieldReference(args.rightKeyOrdinal) },
                }),
              ],
              outputType: booleanType(),
            }),
          },
        }),
        type: JoinRel_JoinType.INNER,
      }),
    },
  });
}

function sourceFieldId(sourceNodeId: string, fieldName: string): string {
  return `field:${sourceNodeId}:${fieldName}`;
}

function requireUniqueTrimmedFields(fields: readonly string[]): void {
  if (
    fields.length === 0 ||
    fields.some((field) => field.length === 0 || field !== field.trim()) ||
    new Set(fields).size !== fields.length
  ) {
    throw new Error('VTX2 INNER JOIN input fields must be non-empty, unique, and trimmed.');
  }
}

function createDvtSubstraitNInputJoinDraft(
  args: DvtSubstraitNInputJoinEntry
): DvtSubstraitInnerJoinDraft {
  requireInnerJoinCapabilities();
  if (args.inputs.length < 2 || args.predicates.length !== args.inputs.length - 1) {
    throw new Error('VTX2 INNER JOIN requires N inputs and exactly N-1 predicates.');
  }
  const sources = args.inputs.map((input) => input.source);
  if (
    new Set(sources.map((source) => source.nodeId)).size !== sources.length ||
    new Set(
      sources.map(
        (source) =>
          `${source.sourceRef.connectionRef.connectionId}:${source.sourceRef.sourceObjectId}`
      )
    ).size !== sources.length
  ) {
    throw new Error('VTX2 INNER JOIN requires distinct source identities.');
  }
  for (const input of args.inputs) requireUniqueTrimmedFields(input.fields);
  for (const source of sources.slice(1)) {
    assertCompatibleSources(sources[0]!, source);
  }
  if (args.targetNodeId.length === 0 || args.targetNodeId !== args.targetNodeId.trim()) {
    throw new Error('VTX2 INNER JOIN target node identity must be non-blank and trimmed.');
  }
  if (
    args.outputs.length === 0 ||
    args.outputs.some(
      (output) =>
        output.name.length === 0 ||
        output.name !== output.name.trim() ||
        output.sourceFieldId.length === 0 ||
        output.sourceFieldId !== output.sourceFieldId.trim() ||
        (output.fieldId != null &&
          (output.fieldId.length === 0 ||
            output.fieldId !== output.fieldId.trim() ||
            !output.fieldId.startsWith(`field:${args.targetNodeId}:`) ||
            output.fieldId.length <= `field:${args.targetNodeId}:`.length))
    ) ||
    new Set(args.outputs.map((output) => output.name)).size !== args.outputs.length ||
    new Set(args.outputs.map((output) => output.sourceFieldId)).size !== args.outputs.length ||
    new Set(
      args.outputs.map((output) => output.fieldId ?? `field:${args.targetNodeId}:${output.name}`)
    ).size !== args.outputs.length
  ) {
    throw new Error('VTX2 INNER JOIN outputs must have unique names and source fields.');
  }

  const inputFields = args.inputs.map((input) =>
    input.fields.map<DvtSubstraitJoinWorkingField>((name) => ({
      sourceNodeId: input.source.nodeId,
      sourceName: name,
      sourceFieldId: sourceFieldId(input.source.nodeId, name),
    }))
  );
  const inputIndexByFieldId = new Map<string, number>();
  inputFields.forEach((fields, inputIndex) => {
    for (const field of fields) inputIndexByFieldId.set(field.sourceFieldId, inputIndex);
  });
  if (args.outputs.some((output) => !inputIndexByFieldId.has(output.sourceFieldId))) {
    throw new Error('VTX2 INNER JOIN output references an unknown source field.');
  }

  const reads = args.inputs.map((input, index) =>
    readRelation({
      relAnchor: index + 1,
      schema: input.source.schema,
      table: input.source.table,
      fields: input.fields,
    })
  );
  const equalFunctionAnchor = 1;
  let currentRelation = reads[0]!;
  let currentFields = [...inputFields[0]!];
  const stageOutputs: DvtSubstraitJoinWorkingField[][] = [];
  for (const [predicateIndex, predicate] of args.predicates.entries()) {
    const rightInputIndex = predicateIndex + 1;
    const rightFields = inputFields[rightInputIndex]!;
    const leftKeyOrdinal = currentFields.findIndex(
      (field) => field.sourceFieldId === predicate.leftSourceFieldId
    );
    const rightFieldIndex = rightFields.findIndex(
      (field) => field.sourceFieldId === predicate.rightSourceFieldId
    );
    if (leftKeyOrdinal < 0 || rightFieldIndex < 0) {
      throw new Error('VTX2 INNER JOIN predicate references an unavailable source field.');
    }
    const available = [...currentFields, ...rightFields];
    const selectedOutputs = args.outputs
      .filter(
        (output) => (inputIndexByFieldId.get(output.sourceFieldId) ?? Infinity) <= rightInputIndex
      )
      .map((output) => available.find((field) => field.sourceFieldId === output.sourceFieldId));
    const futurePredicateFields = args.predicates
      .slice(predicateIndex + 1)
      .map((futurePredicate) =>
        available.find((field) => field.sourceFieldId === futurePredicate.leftSourceFieldId)
      )
      .filter((field) => field != null);
    const selected = [...selectedOutputs, ...futurePredicateFields].filter(
      (field, index, fields) =>
        field != null &&
        fields.findIndex((candidate) => candidate?.sourceFieldId === field.sourceFieldId) === index
    );
    if (selected.length === 0 || selectedOutputs.some((field) => field == null)) {
      throw new Error('VTX2 INNER JOIN output is unavailable at its join stage.');
    }
    const nextFields = selected.filter((field) => field != null);
    const outputMapping = nextFields.map((field) =>
      available.findIndex((candidate) => candidate.sourceFieldId === field.sourceFieldId)
    );
    currentRelation = createNInputInnerJoinRelation({
      relAnchor: args.inputs.length + predicateIndex + 1,
      left: currentRelation,
      right: reads[rightInputIndex]!,
      leftKeyOrdinal,
      rightKeyOrdinal: currentFields.length + rightFieldIndex,
      outputMapping,
      equalFunctionAnchor,
    });
    currentFields = nextFields;
    stageOutputs.push(nextFields);
  }
  const outputNames = args.outputs.map((output) => output.name);
  const plan = create(PlanSchema, {
    version: {
      majorNumber: 0,
      minorNumber: 101,
      patchNumber: 0,
      producer:
        args.inputs.length === 2 ? 'dvt-vtx2-inner-join-card' : 'dvt-vtx2-n-input-inner-join-card',
    },
    extensionUrns: [
      create(SimpleExtensionURNSchema, {
        extensionUrnAnchor: 1,
        urn: COMPARISON_FUNCTION_URN,
      }),
    ],
    extensions: [
      create(SimpleExtensionDeclarationSchema, {
        mappingType: {
          case: 'extensionFunction',
          value: create(SimpleExtensionDeclaration_ExtensionFunctionSchema, {
            extensionUrnReference: 1,
            functionAnchor: equalFunctionAnchor,
            name: EQUAL_FUNCTION_NAME,
          }),
        },
      }),
    ],
    relations: [
      create(PlanRelSchema, {
        relType: {
          case: 'root',
          value: create(RelRootSchema, { input: currentRelation, names: outputNames }),
        },
      }),
    ],
  });
  const joinRelationIds = args.predicates.map((_, index) =>
    index === args.predicates.length - 1
      ? `relation:${args.targetNodeId}:join`
      : `relation:${args.targetNodeId}:join-stage-${index + 1}`
  );
  const sidecar: DvtSubstraitAuthoringSidecarV1 = {
    schemaVersion: DVT_SUBSTRAIT_AUTHORING_SIDECAR_SCHEMA_VERSION,
    semanticPlanSha256: ZERO_SHA256,
    relations: [
      ...args.inputs.map((input, index) => ({
        relationId: `relation:${input.source.nodeId}`,
        relAnchor: index + 1,
        sourceRef: input.source.sourceRef,
        displayName: input.source.table,
      })),
      ...joinRelationIds.map((relationId, index) => ({
        relationId,
        relAnchor: args.inputs.length + index + 1,
        displayName: args.inputs
          .slice(0, index + 2)
          .map((input) => input.source.table)
          .join('+'),
      })),
    ],
    fields: [
      ...args.inputs.flatMap((input) =>
        input.fields.map((name, outputOrdinal) => ({
          fieldId: sourceFieldId(input.source.nodeId, name),
          relationId: `relation:${input.source.nodeId}`,
          outputOrdinal,
          displayName: name,
        }))
      ),
      ...stageOutputs.flatMap((fields, stageIndex) => {
        const finalStage = stageIndex === stageOutputs.length - 1;
        return fields.map((field, outputOrdinal) => {
          const output = args.outputs.find(
            (candidate) => candidate.sourceFieldId === field.sourceFieldId
          );
          const displayName = output?.name ?? field.sourceName;
          return {
            fieldId: finalStage
              ? (output?.fieldId ?? `field:${args.targetNodeId}:${displayName}`)
              : `field:${args.targetNodeId}:join-stage-${stageIndex + 1}:${field.sourceFieldId}`,
            relationId: joinRelationIds[stageIndex]!,
            outputOrdinal,
            displayName,
          };
        });
      }),
    ],
  };
  return { plan, sidecar };
}

function createCollisionSafeNInputOutput(
  args: Readonly<{
    targetNodeId: string;
    input: Readonly<{ nodeId: string; schema: string; table: string }>;
    sourceName: string;
    sourceFieldId: string;
    outputs: ReadonlyArray<Readonly<{ name: string; fieldId: string }>>;
  }>
): Readonly<{ name: string; sourceFieldId: string; fieldId: string }> | null {
  const usedNames = new Set(args.outputs.map((output) => output.name));
  const usedFieldIds = new Set([
    ...args.outputs.map((output) => output.fieldId),
    `field:${args.targetNodeId}:join-count`,
    `field:${args.targetNodeId}:join-count-rank`,
  ]);
  const name = [
    args.sourceName,
    `${args.input.table}_${args.sourceName}`,
    `${args.input.schema}_${args.input.table}_${args.sourceName}`,
    `${args.input.nodeId}_${args.sourceName}`,
  ].find(
    (candidate) =>
      !usedNames.has(candidate) && !usedFieldIds.has(`field:${args.targetNodeId}:${candidate}`)
  );
  return name == null
    ? null
    : {
        name,
        sourceFieldId: args.sourceFieldId,
        fieldId: `field:${args.targetNodeId}:${name}`,
      };
}

export function appendDvtSubstraitInnerJoinInput(
  draft: DvtSubstraitInnerJoinDraft,
  input: DvtSubstraitJoinAppendInput
): DvtSubstraitInnerJoinDraft {
  const inspection = inspectDvtSubstraitNInputJoinDraft(draft);
  if (!inspection.ok) return draft;
  const { projection } = inspection;
  if (
    projection.inputs.some(
      (existing) =>
        existing.nodeId === input.source.nodeId ||
        hasSameConnectedSourceRef(existing.sourceRef, input.source.sourceRef)
    ) ||
    !hasSameConnectionRef(
      projection.inputs[0]!.sourceRef.connectionRef,
      input.source.sourceRef.connectionRef
    ) ||
    !projection.outputs.some(
      (output) => output.source.fieldId === input.predicate.leftSourceFieldId
    )
  ) {
    return draft;
  }
  try {
    requireUniqueTrimmedFields(input.fields);
    const rightSourceFieldId = sourceFieldId(input.source.nodeId, input.predicate.rightFieldName);
    if (!input.fields.includes(input.predicate.rightFieldName)) return draft;
    if (
      input.selectedFields.length === 0 ||
      new Set(input.selectedFields).size !== input.selectedFields.length ||
      input.selectedFields.some((field) => !input.fields.includes(field))
    ) {
      return draft;
    }
    const outputs = projection.outputs.map((output) => ({
      name: output.name,
      sourceFieldId: output.source.fieldId,
      fieldId: output.fieldId,
    }));
    for (const field of input.selectedFields) {
      const output = createCollisionSafeNInputOutput({
        targetNodeId: projection.targetNodeId,
        input: input.source,
        sourceName: field,
        sourceFieldId: sourceFieldId(input.source.nodeId, field),
        outputs,
      });
      if (output == null) return draft;
      outputs.push(output);
    }
    return createDvtSubstraitNInputJoinDraft({
      inputs: [
        ...projection.inputs.map((existing) => ({
          source: {
            nodeId: existing.nodeId,
            schema: existing.schema,
            table: existing.table,
            sourceRef: existing.sourceRef,
          },
          fields: existing.fields.map((field) => field.name),
        })),
        { source: input.source, fields: input.fields },
      ],
      predicates: [
        ...projection.joins,
        { leftSourceFieldId: input.predicate.leftSourceFieldId, rightSourceFieldId },
      ],
      outputs,
      targetNodeId: projection.targetNodeId,
    });
  } catch {
    return draft;
  }
}

function directStructFieldOrdinal(expression: ReturnType<typeof fieldReference>): number | null {
  if (expression.rexType.case !== 'selection') return null;
  const selection = expression.rexType.value;
  if (selection.rootType.case !== 'rootReference') return null;
  if (selection.referenceType.case !== 'directReference') return null;
  const segment = selection.referenceType.value.referenceType;
  if (segment.case !== 'structField' || segment.value.child != null) return null;
  return segment.value.field;
}

function namedTableIdentity(rel: Rel): { schema: string; table: string } | null {
  if (rel.relType.case !== 'read') return null;
  const read = rel.relType.value;
  if (read.common?.emitKind.case !== undefined || read.common?.hint != null) return null;
  if (read.common?.advancedExtension != null || read.advancedExtension != null) return null;
  if (read.filter != null || read.bestEffortFilter != null || read.projection != null) return null;
  if (read.readType.case !== 'namedTable' || read.readType.value.advancedExtension != null)
    return null;
  const names = read.readType.value.names;
  if (names.some((name) => name.trim().length === 0 || name !== name.trim())) return null;
  return names.length === 2 && names[0] != null && names[1] != null
    ? { schema: names[0], table: names[1] }
    : null;
}

function tableIdentity(rel: Rel): { schema: string; table: string } | null {
  const identity = namedTableIdentity(rel);
  if (identity == null || rel.relType.case !== 'read') return null;
  const schema = rel.relType.value.baseSchema;
  if (schema?.names.length !== 2 || schema.struct?.types.length !== 2) return null;
  return schema.struct.types.every((type) => type.kind.case === 'string') ? identity : null;
}

function sourceRefForAnchor(
  sidecar: DvtSubstraitAuthoringSidecarV1,
  relAnchor: number
): ConnectedSourceRef | null {
  return sidecar.relations.find((relation) => relation.relAnchor === relAnchor)?.sourceRef ?? null;
}

function hasPinnedPlanVersion(plan: Plan): boolean {
  return (
    plan.version?.majorNumber === 0 &&
    plan.version.minorNumber === 101 &&
    plan.version.patchNumber === 0
  );
}

function clonePlan(plan: Plan): Plan {
  return fromBinary(PlanSchema, toBinary(PlanSchema, plan));
}

function targetNodeIdFromResultRelationId(relationId: string): string | null {
  const prefix = 'relation:';
  const suffix = ':join';
  if (!relationId.startsWith(prefix) || !relationId.endsWith(suffix)) return null;
  const targetNodeId = relationId.slice(prefix.length, -suffix.length);
  return targetNodeId.length > 0 && targetNodeId === targetNodeId.trim() ? targetNodeId : null;
}

function innerJoinOutputFieldId(
  targetNodeId: string,
  fieldKey: DvtSubstraitInnerJoinFieldKey
): string | null {
  const field = INNER_JOIN_OUTPUT_FIELDS.find((candidate) => candidate.fieldKey === fieldKey);
  return field == null ? null : `field:${targetNodeId}:${field.defaultName}`;
}

export function inspectDvtSubstraitInnerJoinDraft(
  draft: DvtSubstraitInnerJoinDraft
): DvtSubstraitInnerJoinInspection {
  const { plan, sidecar } = draft;
  if (!hasPinnedPlanVersion(plan) || plan.relations.length !== 1) return { ok: false };
  const rootRelation = plan.relations[0]?.relType;
  if (rootRelation?.case !== 'root') return { ok: false };
  if (
    rootRelation.value.names.length === 0 ||
    rootRelation.value.names.length > INNER_JOIN_OUTPUT_FIELDS.length ||
    rootRelation.value.names.some((name) => name.trim().length === 0 || name !== name.trim()) ||
    new Set(rootRelation.value.names).size !== rootRelation.value.names.length
  ) {
    return { ok: false };
  }
  const joinRel = rootRelation.value.input?.relType;
  if (joinRel?.case !== 'join') return { ok: false };
  const join = joinRel.value;
  if (join.type !== JoinRel_JoinType.INNER || join.postJoinFilter != null) return { ok: false };
  if (
    join.advancedExtension != null ||
    join.common?.hint != null ||
    join.common?.advancedExtension != null
  ) {
    return { ok: false };
  }
  if (join.common?.relAnchor !== 3 || join.common.emitKind.case !== 'emit') return { ok: false };
  const outputMapping = join.common.emitKind.value.outputMapping;
  if (
    outputMapping.length !== rootRelation.value.names.length ||
    new Set(outputMapping).size !== outputMapping.length ||
    outputMapping.some(
      (mapping) => !INNER_JOIN_OUTPUT_FIELDS.some((field) => field.outputMapping === mapping)
    )
  ) {
    return { ok: false };
  }
  if (join.left == null || join.right == null) return { ok: false };
  const leftTable = tableIdentity(join.left);
  const rightTable = tableIdentity(join.right);
  if (leftTable == null || rightTable == null) return { ok: false };
  if (join.left.relType.case !== 'read' || join.left.relType.value.common?.relAnchor !== 1) {
    return { ok: false };
  }
  if (join.right.relType.case !== 'read' || join.right.relType.value.common?.relAnchor !== 2) {
    return { ok: false };
  }
  if (join.left.relType.value.baseSchema?.names.join(',') !== LEFT_FIELD_NAMES.join(',')) {
    return { ok: false };
  }
  if (join.right.relType.value.baseSchema?.names.join(',') !== RIGHT_FIELD_NAMES.join(',')) {
    return { ok: false };
  }

  const functionExpression = join.expression?.rexType;
  if (functionExpression?.case !== 'scalarFunction') return { ok: false };
  const scalarFunction = functionExpression.value;
  if (scalarFunction.arguments.length !== 2 || scalarFunction.outputType?.kind.case !== 'bool') {
    return { ok: false };
  }
  const declaration = plan.extensions.find(
    (entry) =>
      entry.mappingType.case === 'extensionFunction' &&
      entry.mappingType.value.functionAnchor === scalarFunction.functionReference
  );
  if (declaration?.mappingType.case !== 'extensionFunction') return { ok: false };
  const declarationMapping = declaration.mappingType.value;
  if (declarationMapping == null) return { ok: false };
  const urn = plan.extensionUrns.find(
    (entry) => entry.extensionUrnAnchor === declarationMapping.extensionUrnReference
  )?.urn;
  if (urn !== COMPARISON_FUNCTION_URN || declarationMapping.name !== EQUAL_FUNCTION_NAME) {
    return { ok: false };
  }
  const leftArgument = scalarFunction.arguments[0]?.argType;
  const rightArgument = scalarFunction.arguments[1]?.argType;
  if (leftArgument?.case !== 'value' || rightArgument?.case !== 'value') return { ok: false };
  if (directStructFieldOrdinal(leftArgument.value) !== 0) return { ok: false };
  if (directStructFieldOrdinal(rightArgument.value) !== 3) return { ok: false };

  const leftSourceRef = sourceRefForAnchor(sidecar, 1);
  const rightSourceRef = sourceRefForAnchor(sidecar, 2);
  const resultBinding = sidecar.relations.find((relation) => relation.relAnchor === 3);
  if (leftSourceRef == null || rightSourceRef == null || resultBinding == null)
    return { ok: false };
  const targetNodeId = targetNodeIdFromResultRelationId(resultBinding.relationId);
  if (targetNodeId == null) return { ok: false };
  if (
    leftSourceRef.connectionRef.provider !== 'postgres' ||
    rightSourceRef.connectionRef.provider !== 'postgres' ||
    leftSourceRef.connectionRef.schemaVersion !== rightSourceRef.connectionRef.schemaVersion ||
    leftSourceRef.connectionRef.connectionId !== rightSourceRef.connectionRef.connectionId
  ) {
    return { ok: false };
  }
  const resultFields = sidecar.fields.filter(
    (field) => field.relationId === resultBinding.relationId
  );
  if (resultFields.length !== outputMapping.length) return { ok: false };
  const outputs = outputMapping.map((mapping, outputOrdinal) => {
    const field = INNER_JOIN_OUTPUT_FIELDS.find((candidate) => candidate.outputMapping === mapping);
    const name = rootRelation.value.names[outputOrdinal];
    const binding = sidecar.fields.find(
      (candidate) =>
        candidate.relationId === resultBinding.relationId &&
        candidate.outputOrdinal === outputOrdinal
    );
    const expectedFieldId = field && innerJoinOutputFieldId(targetNodeId, field.fieldKey);
    return field == null ||
      name == null ||
      binding == null ||
      binding.displayName !== name ||
      binding.fieldId !== expectedFieldId
      ? null
      : {
          fieldKey: field.fieldKey,
          name,
          fieldId: binding.fieldId,
          dataType: 'string' as const,
          outputOrdinal,
          source: field.source,
        };
  });
  if (outputs.some((output) => output == null)) return { ok: false };

  return {
    ok: true,
    projection: {
      left: { ...leftTable, sourceRef: leftSourceRef },
      right: { ...rightTable, sourceRef: rightSourceRef },
      leftKey: 'customer_id',
      rightKey: 'customer_id',
      outputs: outputs.filter((output) => output != null),
    },
  };
}

export function applyDvtSubstraitInnerJoinFieldEdit(
  draft: DvtSubstraitInnerJoinDraft,
  edit: DvtSubstraitInnerJoinFieldEdit
): DvtSubstraitInnerJoinDraft {
  const nInputInspection = inspectDvtSubstraitNInputJoinDraft(draft);
  if (nInputInspection.ok && nInputInspection.projection.inputs.length > 2) {
    if (!('sourceFieldId' in edit) || typeof edit.sourceFieldId !== 'string') return draft;
    const { projection } = nInputInspection;
    const availableField = projection.inputs
      .flatMap((input) => input.fields.map((field) => ({ input, field })))
      .find(({ field }) => field.fieldId === edit.sourceFieldId);
    if (availableField == null) return draft;

    let outputs = projection.outputs.map((output) => ({
      name: output.name,
      sourceFieldId: output.source.fieldId,
      fieldId: output.fieldId,
    }));
    const currentIndex = outputs.findIndex((output) => output.sourceFieldId === edit.sourceFieldId);

    if (edit.kind === 'set-selected') {
      if (edit.selected === currentIndex >= 0) return draft;
      if (!edit.selected) {
        if (outputs.length === 1) return draft;
        outputs = outputs.filter((output) => output.sourceFieldId !== edit.sourceFieldId);
      } else {
        const output = createCollisionSafeNInputOutput({
          targetNodeId: projection.targetNodeId,
          input: availableField.input,
          sourceName: availableField.field.name,
          sourceFieldId: availableField.field.fieldId,
          outputs,
        });
        if (output == null) return draft;
        outputs.push(output);
      }
    } else if (edit.kind === 'rename') {
      const output = outputs[currentIndex];
      const outputName = edit.outputName.trim();
      if (
        output == null ||
        outputName.length === 0 ||
        outputs.some((candidate, index) => index !== currentIndex && candidate.name === outputName)
      ) {
        return draft;
      }
      outputs[currentIndex] = { ...output, name: outputName };
    } else {
      if (currentIndex < 0) return draft;
      const nextIndex = edit.direction === 'up' ? currentIndex - 1 : currentIndex + 1;
      if (nextIndex < 0 || nextIndex >= outputs.length) return draft;
      const current = outputs[currentIndex];
      const next = outputs[nextIndex];
      if (current == null || next == null) return draft;
      outputs[currentIndex] = next;
      outputs[nextIndex] = current;
    }

    try {
      const edited = createDvtSubstraitNInputJoinDraft({
        inputs: projection.inputs.map((input) => ({
          source: {
            nodeId: input.nodeId,
            schema: input.schema,
            table: input.table,
            sourceRef: input.sourceRef,
          },
          fields: input.fields.map((field) => field.name),
        })),
        predicates: projection.joins,
        outputs,
        targetNodeId: projection.targetNodeId,
      });
      const editedInspection = inspectDvtSubstraitNInputJoinDraft(edited);
      return editedInspection.ok && editedInspection.projection.inputs.length > 2 ? edited : draft;
    } catch {
      return draft;
    }
  }

  if (!('fieldKey' in edit) || edit.fieldKey == null) return draft;
  const fieldKey = edit.fieldKey;
  const inspection = inspectDvtSubstraitInnerJoinDraft(draft);
  if (!inspection.ok) return draft;
  const resultBinding = draft.sidecar.relations.find((relation) => relation.relAnchor === 3);
  if (resultBinding == null) return draft;
  const targetNodeId = targetNodeIdFromResultRelationId(resultBinding.relationId);
  if (targetNodeId == null) return draft;

  let outputs = inspection.projection.outputs.map((output) => ({ ...output }));
  const currentIndex = outputs.findIndex((output) => output.fieldKey === fieldKey);

  if (edit.kind === 'set-selected') {
    if (edit.selected === currentIndex >= 0) return draft;
    if (!edit.selected) {
      if (outputs.length === 1) return draft;
      outputs = outputs.filter((output) => output.fieldKey !== fieldKey);
    } else {
      const field = INNER_JOIN_OUTPUT_FIELDS.find((candidate) => candidate.fieldKey === fieldKey);
      const fieldId = innerJoinOutputFieldId(targetNodeId, fieldKey);
      if (field == null || fieldId == null) return draft;
      outputs.push({
        fieldKey: field.fieldKey,
        name: field.defaultName,
        fieldId,
        dataType: 'string',
        outputOrdinal: outputs.length,
        source: field.source,
      });
    }
  } else if (edit.kind === 'rename') {
    const output = outputs[currentIndex];
    const outputName = edit.outputName.trim();
    if (
      output == null ||
      outputName.length === 0 ||
      outputs.some((candidate, index) => index !== currentIndex && candidate.name === outputName)
    ) {
      return draft;
    }
    outputs[currentIndex] = { ...output, name: outputName };
  } else {
    if (currentIndex < 0) return draft;
    const nextIndex = edit.direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (nextIndex < 0 || nextIndex >= outputs.length) return draft;
    const current = outputs[currentIndex];
    const next = outputs[nextIndex];
    if (current == null || next == null) return draft;
    outputs[currentIndex] = next;
    outputs[nextIndex] = current;
  }

  const plan = clonePlan(draft.plan);
  const rootRelation = plan.relations[0]?.relType;
  if (rootRelation?.case !== 'root') return draft;
  const joinRelation = rootRelation.value.input?.relType;
  if (joinRelation?.case !== 'join' || joinRelation.value.common?.emitKind.case !== 'emit') {
    return draft;
  }
  const mappings = outputs.map((output) =>
    INNER_JOIN_OUTPUT_FIELDS.find((field) => field.fieldKey === output.fieldKey)
  );
  const outputMappings: number[] = [];
  for (const mapping of mappings) {
    if (mapping == null) return draft;
    outputMappings.push(mapping.outputMapping);
  }
  rootRelation.value.names = outputs.map((output) => output.name);
  joinRelation.value.common.emitKind.value.outputMapping = outputMappings;

  const fields = [
    ...draft.sidecar.fields.filter((field) => field.relationId !== resultBinding.relationId),
    ...outputs.map((output, outputOrdinal) => ({
      fieldId: output.fieldId,
      relationId: resultBinding.relationId,
      outputOrdinal,
      displayName: output.name,
    })),
  ];
  const edited = {
    plan,
    sidecar: { ...draft.sidecar, semanticPlanSha256: ZERO_SHA256, fields },
  };
  return inspectDvtSubstraitInnerJoinDraft(edited).ok ? edited : draft;
}

type ValidInnerJoinGrouping = Readonly<{
  baseDraft: DvtSubstraitInnerJoinDraft;
  projection: DvtSubstraitInnerJoinGroupingProjection;
}>;

function hasUniqueInnerJoinSidecarIdentity(draft: DvtSubstraitInnerJoinDraft): boolean {
  return (
    new Set(draft.sidecar.relations.map((relation) => relation.relationId)).size ===
      draft.sidecar.relations.length &&
    new Set(draft.sidecar.relations.map((relation) => relation.relAnchor)).size ===
      draft.sidecar.relations.length &&
    new Set(draft.sidecar.fields.map((field) => field.fieldId)).size === draft.sidecar.fields.length
  );
}

function hasCurrentInnerJoinSemanticHash(draft: DvtSubstraitInnerJoinDraft): boolean {
  const planSha256 = sha256Hex(toBinary(PlanSchema, draft.plan));
  return (
    draft.sidecar.semanticPlanSha256 === ZERO_SHA256 ||
    draft.sidecar.semanticPlanSha256 === planSha256
  );
}

function innerJoinResultBinding(
  draft: DvtSubstraitInnerJoinDraft
): DvtSubstraitAuthoringSidecarV1['relations'][number] | null {
  const bindings = draft.sidecar.relations.filter(
    (relation) => targetNodeIdFromResultRelationId(relation.relationId) != null
  );
  return bindings.length === 1 ? bindings[0]! : null;
}

function innerJoinTargetNodeId(draft: DvtSubstraitInnerJoinDraft): string | null {
  const resultBinding = innerJoinResultBinding(draft);
  return resultBinding == null ? null : targetNodeIdFromResultRelationId(resultBinding.relationId);
}

function inspectValidInnerJoinGrouping(
  draft: DvtSubstraitInnerJoinDraft
): ValidInnerJoinGrouping | null {
  if (
    !hasPinnedPlanVersion(draft.plan) ||
    draft.plan.relations.length !== 1 ||
    draft.sidecar.schemaVersion !== DVT_SUBSTRAIT_AUTHORING_SIDECAR_SCHEMA_VERSION ||
    draft.sidecar.relations.length < 4 ||
    !hasUniqueInnerJoinSidecarIdentity(draft) ||
    !hasCurrentInnerJoinSemanticHash(draft)
  ) {
    return null;
  }
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
  if (
    aggregate.common?.relAnchor == null ||
    aggregate.common.emitKind.case !== undefined ||
    aggregate.common.hint != null ||
    aggregate.common.advancedExtension != null ||
    aggregate.advancedExtension != null ||
    aggregate.input?.relType.case !== 'join' ||
    aggregate.groupings.length !== 1 ||
    aggregate.groupings[0]?.expressionReferences.join(',') !== '0' ||
    aggregate.groupingExpressions.length !== 1 ||
    aggregate.measures.length !== 1 ||
    !isDvtSubstraitCountFunction(draft.plan, aggregate)
  ) {
    return null;
  }
  const groupInputOrdinal = readDvtSubstraitFieldReferenceOrdinal(aggregate.groupingExpressions[0]);
  if (groupInputOrdinal == null || groupInputOrdinal < 0) return null;
  const targetNodeId = innerJoinTargetNodeId(draft);
  const joinBinding = innerJoinResultBinding(draft);
  const aggregateBinding = draft.sidecar.relations.find(
    (relation) => relation.relAnchor === aggregate.common?.relAnchor
  );
  const aggregateRelationId =
    targetNodeId == null ? null : `relation:${targetNodeId}:join-aggregate`;
  if (
    targetNodeId == null ||
    joinBinding == null ||
    aggregate.common.relAnchor <= joinBinding.relAnchor ||
    aggregateBinding == null ||
    aggregateBinding.relationId !== aggregateRelationId ||
    aggregateBinding.sourceRef != null ||
    aggregateBinding.displayName !== joinBinding.displayName
  ) {
    return null;
  }
  const aggregateFields = draft.sidecar.fields
    .filter((field) => field.relationId === aggregateRelationId)
    .sort((left, right) => left.outputOrdinal - right.outputOrdinal);
  const groupField = aggregateFields[0];
  const countField = aggregateFields[1];
  const groupDisplayName = groupField?.displayName;
  const countDisplayName = countField?.displayName;
  if (
    aggregateFields.length !== 2 ||
    groupField?.outputOrdinal !== 0 ||
    typeof groupDisplayName !== 'string' ||
    groupDisplayName !== root.value.names[0] ||
    countField?.outputOrdinal !== 1 ||
    countField.fieldId !== `field:${targetNodeId}:join-count` ||
    typeof countDisplayName !== 'string' ||
    countDisplayName !== root.value.names[1]
  ) {
    return null;
  }

  const basePlan = clonePlan(draft.plan);
  const baseRoot = basePlan.relations[0]?.relType;
  if (baseRoot?.case !== 'root' || baseRoot.value.input?.relType.case !== 'aggregate') return null;
  baseRoot.value.input = baseRoot.value.input.relType.value.input;
  removeDvtSubstraitCountExtension(basePlan);
  const baseFields = draft.sidecar.fields.flatMap((field) => {
    if (field.fieldId === countField.fieldId) return [];
    if (field.fieldId !== groupField.fieldId) return [field];
    return [
      {
        ...field,
        relationId: joinBinding.relationId,
        outputOrdinal: groupInputOrdinal,
        displayName: root.value.names[0]!,
      },
    ];
  });
  const baseOutputFields = baseFields
    .filter((field) => field.relationId === joinBinding.relationId)
    .sort((left, right) => left.outputOrdinal - right.outputOrdinal);
  const baseOutputNames = baseOutputFields.map((field) => field.displayName);
  if (
    baseOutputFields.length === 0 ||
    baseOutputFields.some((field, outputOrdinal) => field.outputOrdinal !== outputOrdinal) ||
    baseOutputNames.some((name) => name == null)
  ) {
    return null;
  }
  baseRoot.value.names = baseOutputNames.flatMap((name) => (name == null ? [] : [name]));
  const baseDraft: DvtSubstraitInnerJoinDraft = {
    plan: basePlan,
    sidecar: {
      ...draft.sidecar,
      semanticPlanSha256: ZERO_SHA256,
      relations: draft.sidecar.relations.filter(
        (relation) => relation.relationId !== aggregateRelationId
      ),
      fields: baseFields,
    },
  };
  const nInputBaseInspection = inspectDvtSubstraitNInputJoinDraft(baseDraft);
  const binaryBaseInspection = inspectDvtSubstraitInnerJoinDraft(baseDraft);
  const baseInspection =
    nInputBaseInspection.ok && nInputBaseInspection.projection.inputs.length > 2
      ? nInputBaseInspection
      : binaryBaseInspection;
  const baseGroupField = baseInspection.ok
    ? baseInspection.projection.outputs[groupInputOrdinal]
    : null;
  if (
    !baseInspection.ok ||
    baseGroupField == null ||
    baseGroupField.fieldId !== groupField.fieldId ||
    baseGroupField.name !== root.value.names[0]
  ) {
    return null;
  }
  const common = {
    measure: {
      name: countDisplayName,
      fieldId: countField.fieldId,
      capabilityId: DVT_SUBSTRAIT_COUNT_CAPABILITY_ID,
    },
    outputs: [
      {
        name: groupDisplayName,
        fieldId: groupField.fieldId,
        dataType: 'string' as const,
        outputOrdinal: 0,
      },
      {
        name: countDisplayName,
        fieldId: countField.fieldId,
        dataType: 'i64' as const,
        outputOrdinal: 1,
      },
    ],
  };
  if (nInputBaseInspection.ok && nInputBaseInspection.projection.inputs.length > 2) {
    const nInputGroupField = nInputBaseInspection.projection.outputs[groupInputOrdinal];
    if (nInputGroupField == null) return null;
    return {
      baseDraft,
      projection: {
        kind: 'n-input',
        targetNodeId: nInputBaseInspection.projection.targetNodeId,
        inputs: nInputBaseInspection.projection.inputs,
        joins: nInputBaseInspection.projection.joins,
        groupField: {
          name: nInputGroupField.name,
          fieldId: nInputGroupField.fieldId,
          inputOrdinal: groupInputOrdinal,
          source: nInputGroupField.source,
        },
        ...common,
      },
    };
  }
  if (!binaryBaseInspection.ok) return null;
  const binaryGroupField = binaryBaseInspection.projection.outputs[groupInputOrdinal];
  if (binaryGroupField == null) return null;
  return {
    baseDraft,
    projection: {
      kind: 'binary',
      left: binaryBaseInspection.projection.left,
      right: binaryBaseInspection.projection.right,
      leftKey: binaryBaseInspection.projection.leftKey,
      rightKey: binaryBaseInspection.projection.rightKey,
      groupField: {
        fieldKey: binaryGroupField.fieldKey,
        name: binaryGroupField.name,
        fieldId: binaryGroupField.fieldId,
        inputOrdinal: groupInputOrdinal,
        source: binaryGroupField.source,
      },
      ...common,
    },
  };
}

export function inspectDvtSubstraitInnerJoinGroupingDraft(
  draft: DvtSubstraitInnerJoinDraft
): DvtSubstraitInnerJoinGroupingInspection {
  const valid = inspectValidInnerJoinGrouping(draft);
  return valid == null ? { ok: false } : { ok: true, projection: valid.projection };
}

export function applyDvtSubstraitInnerJoinGrouping(
  draft: DvtSubstraitInnerJoinDraft,
  args: Readonly<{ groupFieldId: string; countOutputName: string }>
): DvtSubstraitInnerJoinDraft {
  const nInputInspection = inspectDvtSubstraitNInputJoinDraft(draft);
  const binaryInspection = inspectDvtSubstraitInnerJoinDraft(draft);
  const inspection =
    nInputInspection.ok && nInputInspection.projection.inputs.length > 2
      ? nInputInspection
      : binaryInspection;
  const countOutputName = args.countOutputName.trim();
  if (!inspection.ok || countOutputName.length === 0) return draft;
  const groupField = inspection.projection.outputs.find(
    (output) => output.fieldId === args.groupFieldId
  );
  if (groupField == null || groupField.name === countOutputName) return draft;
  const targetNodeId = innerJoinTargetNodeId(draft);
  const joinBinding = innerJoinResultBinding(draft);
  if (targetNodeId == null || joinBinding == null) return draft;

  const plan = clonePlan(draft.plan);
  const root = plan.relations[0]?.relType;
  if (root?.case !== 'root' || root.value.input?.relType.case !== 'join') return draft;
  const joinInput = root.value.input;
  const aggregateAnchor =
    Math.max(0, ...draft.sidecar.relations.map((relation) => relation.relAnchor)) + 1;
  const countFunctionReference = ensureDvtSubstraitCountFunction(plan);
  root.value.input = create(RelSchema, {
    relType: {
      case: 'aggregate',
      value: create(AggregateRelSchema, {
        common: create(RelCommonSchema, { relAnchor: aggregateAnchor }),
        input: joinInput,
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
  const aggregateRelationId = `relation:${targetNodeId}:join-aggregate`;
  const sidecar: DvtSubstraitAuthoringSidecarV1 = {
    ...draft.sidecar,
    semanticPlanSha256: ZERO_SHA256,
    relations: [
      ...draft.sidecar.relations,
      {
        relationId: aggregateRelationId,
        relAnchor: aggregateAnchor,
        displayName: joinBinding.displayName,
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
        fieldId: `field:${targetNodeId}:join-count`,
        relationId: aggregateRelationId,
        outputOrdinal: 1,
        displayName: countOutputName,
      },
    ],
  };
  const grouped = { plan, sidecar };
  return inspectValidInnerJoinGrouping(grouped) == null ? draft : grouped;
}

export function renameDvtSubstraitInnerJoinCountOutput(
  draft: DvtSubstraitInnerJoinDraft,
  outputName: string
): DvtSubstraitInnerJoinDraft {
  const valid = inspectValidInnerJoinGrouping(draft);
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
    semanticPlanSha256: ZERO_SHA256,
    fields: draft.sidecar.fields.map((field) =>
      field.fieldId === valid.projection.measure.fieldId
        ? { ...field, displayName: normalized }
        : field
    ),
  };
  const renamed = { plan, sidecar };
  return inspectValidInnerJoinGrouping(renamed) == null ? draft : renamed;
}

export function removeDvtSubstraitInnerJoinGrouping(
  draft: DvtSubstraitInnerJoinDraft
): DvtSubstraitInnerJoinDraft {
  return inspectValidInnerJoinGrouping(draft)?.baseDraft ?? draft;
}

type ValidInnerJoinGroupedWindow = Readonly<{
  baseDraft: DvtSubstraitInnerJoinDraft;
  projection: DvtSubstraitInnerJoinGroupedWindowProjection;
}>;

function inspectValidInnerJoinGroupedWindow(
  draft: DvtSubstraitInnerJoinDraft
): ValidInnerJoinGroupedWindow | null {
  if (
    !hasPinnedPlanVersion(draft.plan) ||
    draft.plan.relations.length !== 1 ||
    draft.sidecar.schemaVersion !== DVT_SUBSTRAIT_AUTHORING_SIDECAR_SCHEMA_VERSION ||
    draft.sidecar.relations.length < 5 ||
    !hasUniqueInnerJoinSidecarIdentity(draft) ||
    !hasCurrentInnerJoinSemanticHash(draft)
  ) {
    return null;
  }
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
  if (
    project.common?.relAnchor == null ||
    project.common.relAnchor <= 4 ||
    project.common.emitKind.case !== 'emit' ||
    project.common.emitKind.value.outputMapping.join(',') !== '0,1,2' ||
    project.common.hint != null ||
    project.common.advancedExtension != null ||
    project.advancedExtension != null ||
    project.input?.relType.case !== 'aggregate' ||
    project.expressions.length !== 1
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
    readDvtSubstraitFieldReferenceOrdinal(windowFunction.sorts[0]?.expr) !== 1 ||
    windowFunction.sorts[0]?.sortKind.case !== 'direction' ||
    windowFunction.sorts[0].sortKind.value !== SortField_SortDirection.DESC_NULLS_LAST ||
    readDvtSubstraitFieldReferenceOrdinal(windowFunction.sorts[1]?.expr) !== 0 ||
    windowFunction.sorts[1]?.sortKind.case !== 'direction' ||
    windowFunction.sorts[1].sortKind.value !== SortField_SortDirection.ASC_NULLS_LAST
  ) {
    return null;
  }
  const targetNodeId = innerJoinTargetNodeId(draft);
  const windowBinding = draft.sidecar.relations.find(
    (relation) => relation.relAnchor === project.common?.relAnchor
  );
  const joinBinding = innerJoinResultBinding(draft);
  const windowRelationId =
    targetNodeId == null ? null : `relation:${targetNodeId}:join-aggregate-window`;
  const aggregateRelationId =
    targetNodeId == null ? null : `relation:${targetNodeId}:join-aggregate`;
  const aggregateBinding = draft.sidecar.relations.find(
    (relation) => relation.relationId === aggregateRelationId
  );
  const resultFieldId = targetNodeId == null ? null : `field:${targetNodeId}:join-count-rank`;
  if (
    targetNodeId == null ||
    windowBinding == null ||
    joinBinding == null ||
    windowBinding.relationId !== windowRelationId ||
    windowBinding.sourceRef != null ||
    windowBinding.displayName !== joinBinding.displayName ||
    aggregateRelationId == null ||
    aggregateBinding == null ||
    project.common.relAnchor <= aggregateBinding.relAnchor ||
    resultFieldId == null
  ) {
    return null;
  }
  const outerFields = draft.sidecar.fields
    .filter((field) => field.relationId === windowRelationId)
    .sort((left, right) => left.outputOrdinal - right.outputOrdinal);
  if (
    outerFields.length !== 3 ||
    outerFields.some(
      (field, outputOrdinal) =>
        field.outputOrdinal !== outputOrdinal ||
        field.displayName !== root.value.names[outputOrdinal]
    ) ||
    outerFields[2]?.fieldId !== resultFieldId
  ) {
    return null;
  }

  const basePlan = clonePlan(draft.plan);
  const baseRoot = basePlan.relations[0]?.relType;
  if (baseRoot?.case !== 'root' || baseRoot.value.input?.relType.case !== 'project') return null;
  const aggregateInput = baseRoot.value.input.relType.value.input;
  if (aggregateInput?.relType.case !== 'aggregate') return null;
  baseRoot.value.input = aggregateInput;
  baseRoot.value.names = baseRoot.value.names.slice(0, 2);
  removeDvtSubstraitRowNumberExtension(basePlan);
  const baseDraft: DvtSubstraitInnerJoinDraft = {
    plan: basePlan,
    sidecar: {
      ...draft.sidecar,
      semanticPlanSha256: ZERO_SHA256,
      relations: draft.sidecar.relations.filter(
        (relation) => relation.relationId !== windowRelationId
      ),
      fields: draft.sidecar.fields.flatMap((field) => {
        if (field.fieldId === resultFieldId) return [];
        if (field.relationId !== windowRelationId) return [field];
        return [{ ...field, relationId: aggregateRelationId }];
      }),
    },
  };
  const baseInspection = inspectDvtSubstraitInnerJoinGroupingDraft(baseDraft);
  if (
    !baseInspection.ok ||
    outerFields[0]?.fieldId !== baseInspection.projection.groupField.fieldId ||
    outerFields[1]?.fieldId !== baseInspection.projection.measure.fieldId
  ) {
    return null;
  }
  const common = {
    groupField: baseInspection.projection.groupField,
    measure: {
      name: baseInspection.projection.measure.name,
      fieldId: baseInspection.projection.measure.fieldId,
    },
    result: {
      name: root.value.names[2]!,
      fieldId: resultFieldId,
      capabilityId: DVT_SUBSTRAIT_ROW_NUMBER_CAPABILITY_ID,
    },
    outputs: [
      {
        name: root.value.names[0]!,
        fieldId: outerFields[0]!.fieldId,
        dataType: 'string' as const,
        outputOrdinal: 0,
      },
      {
        name: root.value.names[1]!,
        fieldId: outerFields[1]!.fieldId,
        dataType: 'i64' as const,
        outputOrdinal: 1,
      },
      {
        name: root.value.names[2]!,
        fieldId: resultFieldId,
        dataType: 'i64' as const,
        outputOrdinal: 2,
      },
    ],
  };
  return baseInspection.projection.kind === 'n-input'
    ? {
        baseDraft,
        projection: {
          kind: 'n-input',
          targetNodeId: baseInspection.projection.targetNodeId,
          inputs: baseInspection.projection.inputs,
          joins: baseInspection.projection.joins,
          ...common,
          groupField: baseInspection.projection.groupField,
        },
      }
    : {
        baseDraft,
        projection: {
          kind: 'binary',
          left: baseInspection.projection.left,
          right: baseInspection.projection.right,
          leftKey: baseInspection.projection.leftKey,
          rightKey: baseInspection.projection.rightKey,
          ...common,
          groupField: baseInspection.projection.groupField,
        },
      };
}

export function inspectDvtSubstraitInnerJoinGroupedWindowDraft(
  draft: DvtSubstraitInnerJoinDraft
): DvtSubstraitInnerJoinGroupedWindowInspection {
  const valid = inspectValidInnerJoinGroupedWindow(draft);
  return valid == null ? { ok: false } : { ok: true, projection: valid.projection };
}

export function applyDvtSubstraitInnerJoinGroupedRowNumber(
  draft: DvtSubstraitInnerJoinDraft,
  args: Readonly<{ outputName: string }>
): DvtSubstraitInnerJoinDraft {
  const groupingInspection = inspectDvtSubstraitInnerJoinGroupingDraft(draft);
  const outputName = args.outputName.trim();
  if (
    !groupingInspection.ok ||
    outputName.length === 0 ||
    groupingInspection.projection.outputs.some((output) => output.name === outputName)
  ) {
    return draft;
  }
  const targetNodeId = innerJoinTargetNodeId(draft);
  const joinBinding = innerJoinResultBinding(draft);
  if (targetNodeId == null || joinBinding == null) return draft;
  const plan = clonePlan(draft.plan);
  const root = plan.relations[0]?.relType;
  if (root?.case !== 'root' || root.value.input?.relType.case !== 'aggregate') return draft;
  const aggregateInput = root.value.input;
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
        input: aggregateInput,
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
                    expr: createDvtSubstraitFieldReference(1),
                    sortKind: {
                      case: 'direction',
                      value: SortField_SortDirection.DESC_NULLS_LAST,
                    },
                  }),
                  create(SortFieldSchema, {
                    expr: createDvtSubstraitFieldReference(0),
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
  const aggregateRelationId = `relation:${targetNodeId}:join-aggregate`;
  const windowRelationId = `relation:${targetNodeId}:join-aggregate-window`;
  const resultFieldId = `field:${targetNodeId}:join-count-rank`;
  const sidecar: DvtSubstraitAuthoringSidecarV1 = {
    ...draft.sidecar,
    semanticPlanSha256: ZERO_SHA256,
    relations: [
      ...draft.sidecar.relations,
      {
        relationId: windowRelationId,
        relAnchor: relationAnchor,
        displayName: joinBinding.displayName,
      },
    ],
    fields: [
      ...draft.sidecar.fields.map((field) =>
        field.relationId === aggregateRelationId
          ? { ...field, relationId: windowRelationId }
          : field
      ),
      {
        fieldId: resultFieldId,
        relationId: windowRelationId,
        outputOrdinal: 2,
        displayName: outputName,
      },
    ],
  };
  const composed = { plan, sidecar };
  return inspectValidInnerJoinGroupedWindow(composed) == null ? draft : composed;
}

export function renameDvtSubstraitInnerJoinGroupedRowNumberOutput(
  draft: DvtSubstraitInnerJoinDraft,
  outputName: string
): DvtSubstraitInnerJoinDraft {
  const valid = inspectValidInnerJoinGroupedWindow(draft);
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
    semanticPlanSha256: ZERO_SHA256,
    fields: draft.sidecar.fields.map((field) =>
      field.fieldId === valid.projection.result.fieldId
        ? { ...field, displayName: normalized }
        : field
    ),
  };
  const renamed = { plan, sidecar };
  return inspectValidInnerJoinGroupedWindow(renamed) == null ? draft : renamed;
}

export function removeDvtSubstraitInnerJoinGroupedRowNumber(
  draft: DvtSubstraitInnerJoinDraft
): DvtSubstraitInnerJoinDraft {
  return inspectValidInnerJoinGroupedWindow(draft)?.baseDraft ?? draft;
}

type DvtSubstraitNInputJoinNode = Readonly<{
  leftKeyOrdinal: number;
  rightKeyOrdinal: number;
  outputMapping: readonly number[];
}>;

function inspectNInputJoinNode(
  plan: Plan,
  rel: Rel,
  relAnchor: number
): DvtSubstraitNInputJoinNode | null {
  if (rel.relType.case !== 'join') return null;
  const join = rel.relType.value;
  if (
    join.type !== JoinRel_JoinType.INNER ||
    join.postJoinFilter != null ||
    join.advancedExtension != null ||
    join.common?.hint != null ||
    join.common?.advancedExtension != null ||
    join.common?.relAnchor !== relAnchor ||
    join.common.emitKind.case !== 'emit' ||
    join.left == null ||
    join.right == null
  ) {
    return null;
  }
  const expression = join.expression?.rexType;
  if (expression?.case !== 'scalarFunction') return null;
  const scalar = expression.value;
  if (
    scalar.arguments.length !== 2 ||
    scalar.outputType?.kind.case !== 'bool' ||
    plan.extensions.length !== 1 ||
    plan.extensionUrns.length !== 1
  ) {
    return null;
  }
  const declaration = plan.extensions[0]?.mappingType;
  if (
    declaration?.case !== 'extensionFunction' ||
    declaration.value.functionAnchor !== scalar.functionReference ||
    declaration.value.functionAnchor !== 1 ||
    declaration.value.extensionUrnReference !== 1 ||
    declaration.value.name !== EQUAL_FUNCTION_NAME ||
    plan.extensionUrns[0]?.extensionUrnAnchor !== 1 ||
    plan.extensionUrns[0]?.urn !== COMPARISON_FUNCTION_URN
  ) {
    return null;
  }
  const leftArgument = scalar.arguments[0]?.argType;
  const rightArgument = scalar.arguments[1]?.argType;
  if (leftArgument?.case !== 'value' || rightArgument?.case !== 'value') return null;
  const leftKeyOrdinal = directStructFieldOrdinal(leftArgument.value);
  const rightKeyOrdinal = directStructFieldOrdinal(rightArgument.value);
  if (leftKeyOrdinal == null || rightKeyOrdinal == null) return null;
  return {
    leftKeyOrdinal,
    rightKeyOrdinal,
    outputMapping: join.common.emitKind.value.outputMapping,
  };
}

function sourceNodeIdFromRelationId(relationId: string): string | null {
  const prefix = 'relation:';
  if (!relationId.startsWith(prefix)) return null;
  const nodeId = relationId.slice(prefix.length);
  return nodeId.length > 0 && nodeId === nodeId.trim() ? nodeId : null;
}

function flattenNInputJoinTree(
  rel: Rel
): Readonly<{ reads: readonly Rel[]; joins: readonly Rel[] }> | null {
  if (rel.relType.case === 'read') return { reads: [rel], joins: [] };
  if (rel.relType.case !== 'join') return null;
  const join = rel.relType.value;
  if (join.left == null || join.right == null || join.right.relType.case !== 'read') return null;
  const left = flattenNInputJoinTree(join.left);
  return left == null ? null : { reads: [...left.reads, join.right], joins: [...left.joins, rel] };
}

export function inspectDvtSubstraitNInputJoinDraft(
  draft: DvtSubstraitInnerJoinDraft
): DvtSubstraitNInputJoinInspection {
  const { plan, sidecar } = draft;
  if (
    !hasPinnedPlanVersion(plan) ||
    plan.relations.length !== 1 ||
    sidecar.schemaVersion !== DVT_SUBSTRAIT_AUTHORING_SIDECAR_SCHEMA_VERSION ||
    !hasUniqueInnerJoinSidecarIdentity(draft) ||
    !hasCurrentInnerJoinSemanticHash(draft)
  ) {
    return { ok: false };
  }
  const root = plan.relations[0]?.relType;
  if (
    root?.case !== 'root' ||
    root.value.input == null ||
    root.value.names.length === 0 ||
    root.value.names.some((name) => name.length === 0 || name !== name.trim()) ||
    new Set(root.value.names).size !== root.value.names.length
  ) {
    return { ok: false };
  }
  const tree = flattenNInputJoinTree(root.value.input);
  if (
    tree == null ||
    tree.reads.length < 2 ||
    tree.joins.length !== tree.reads.length - 1 ||
    sidecar.relations.length !== tree.reads.length + tree.joins.length
  ) {
    return { ok: false };
  }

  const inputs: DvtSubstraitNInputJoinProjection['inputs'][number][] = [];
  for (const [index, readRel] of tree.reads.entries()) {
    const fieldNames =
      readRel.relType.case === 'read' ? readRel.relType.value.baseSchema?.names : undefined;
    const fieldTypes =
      readRel.relType.case === 'read' ? readRel.relType.value.baseSchema?.struct?.types : undefined;
    const binding = sidecar.relations.find((relation) => relation.relAnchor === index + 1);
    const sourceRef = binding?.sourceRef;
    const nodeId = binding == null ? null : sourceNodeIdFromRelationId(binding.relationId);
    const table = namedTableIdentity(readRel);
    if (
      readRel.relType.case !== 'read' ||
      readRel.relType.value.common?.relAnchor !== index + 1 ||
      fieldNames == null ||
      fieldNames.length === 0 ||
      fieldNames.some((name) => name.length === 0 || name !== name.trim()) ||
      new Set(fieldNames).size !== fieldNames.length ||
      fieldTypes == null ||
      fieldTypes.length !== fieldNames.length ||
      fieldTypes.some((type) => type.kind.case !== 'string') ||
      table == null ||
      binding == null ||
      binding.displayName !== table.table ||
      sourceRef == null ||
      nodeId == null
    ) {
      return { ok: false };
    }
    const fields = sidecar.fields
      .filter((field) => field.relationId === binding.relationId)
      .sort((left, right) => left.outputOrdinal - right.outputOrdinal);
    if (
      fields.length !== fieldNames.length ||
      fields.some(
        (field, fieldIndex) =>
          field.outputOrdinal !== fieldIndex ||
          field.displayName !== fieldNames[fieldIndex] ||
          field.fieldId !== sourceFieldId(nodeId, fieldNames[fieldIndex]!)
      )
    ) {
      return { ok: false };
    }
    inputs.push({
      nodeId,
      ...table,
      sourceRef,
      fields: fields.map((field, fieldIndex) => ({
        name: fieldNames[fieldIndex]!,
        fieldId: field.fieldId,
      })),
    });
  }
  if (
    new Set(inputs.map((input) => input.nodeId)).size !== inputs.length ||
    new Set(
      inputs.map(
        (input) => `${input.sourceRef.connectionRef.connectionId}:${input.sourceRef.sourceObjectId}`
      )
    ).size !== inputs.length ||
    inputs.some(
      (input) =>
        input.sourceRef.connectionRef.provider !== 'postgres' ||
        !hasSameConnectionRef(inputs[0]!.sourceRef.connectionRef, input.sourceRef.connectionRef)
    )
  ) {
    return { ok: false };
  }

  const finalAnchor = inputs.length + tree.joins.length;
  const resultBinding = sidecar.relations.find((relation) => relation.relAnchor === finalAnchor);
  const targetNodeId =
    resultBinding == null ? null : targetNodeIdFromResultRelationId(resultBinding.relationId);
  if (targetNodeId == null || resultBinding?.sourceRef != null) return { ok: false };

  let workingFields = inputs[0]!.fields.map<DvtSubstraitJoinWorkingField>((field) => ({
    sourceNodeId: inputs[0]!.nodeId,
    sourceName: field.name,
    sourceFieldId: field.fieldId,
  }));
  const joins: DvtSubstraitJoinPredicate[] = [];
  let finalOutputs: DvtSubstraitNInputJoinProjection['outputs'][number][] = [];
  for (const [joinIndex, joinRel] of tree.joins.entries()) {
    const relAnchor = inputs.length + joinIndex + 1;
    const inspectedJoin = inspectNInputJoinNode(plan, joinRel, relAnchor);
    const rightInput = inputs[joinIndex + 1]!;
    const rightFields = rightInput.fields.map<DvtSubstraitJoinWorkingField>((field) => ({
      sourceNodeId: rightInput.nodeId,
      sourceName: field.name,
      sourceFieldId: field.fieldId,
    }));
    const available = [...workingFields, ...rightFields];
    if (
      inspectedJoin == null ||
      inspectedJoin.leftKeyOrdinal < 0 ||
      inspectedJoin.leftKeyOrdinal >= workingFields.length ||
      inspectedJoin.rightKeyOrdinal < workingFields.length ||
      inspectedJoin.rightKeyOrdinal >= available.length ||
      inspectedJoin.outputMapping.length === 0 ||
      new Set(inspectedJoin.outputMapping).size !== inspectedJoin.outputMapping.length ||
      inspectedJoin.outputMapping.some((ordinal) => ordinal < 0 || ordinal >= available.length)
    ) {
      return { ok: false };
    }
    const finalStage = joinIndex === tree.joins.length - 1;
    const relationId = finalStage
      ? `relation:${targetNodeId}:join`
      : `relation:${targetNodeId}:join-stage-${joinIndex + 1}`;
    const relationBinding = sidecar.relations.find((relation) => relation.relAnchor === relAnchor);
    const stageFields = sidecar.fields
      .filter((field) => field.relationId === relationId)
      .sort((left, right) => left.outputOrdinal - right.outputOrdinal);
    const names = finalStage ? root.value.names : stageFields.map((field) => field.displayName);
    if (
      relationBinding?.relationId !== relationId ||
      relationBinding.sourceRef != null ||
      relationBinding.displayName !==
        inputs
          .slice(0, joinIndex + 2)
          .map((input) => input.table)
          .join('+') ||
      names.length !== inspectedJoin.outputMapping.length ||
      stageFields.length !== names.length
    ) {
      return { ok: false };
    }
    const nextFields = inspectedJoin.outputMapping.map((ordinal) => available[ordinal]!);
    if (
      stageFields.some((field, outputOrdinal) => {
        const name = names[outputOrdinal];
        const expectedFieldId = `field:${targetNodeId}:join-stage-${joinIndex + 1}:${nextFields[outputOrdinal]?.sourceFieldId}`;
        const hasValidFieldId = finalStage
          ? field.fieldId.startsWith(`field:${targetNodeId}:`) &&
            field.fieldId.length > `field:${targetNodeId}:`.length
          : field.fieldId === expectedFieldId;
        return (
          name == null ||
          field.outputOrdinal !== outputOrdinal ||
          field.displayName !== name ||
          !hasValidFieldId
        );
      })
    ) {
      return { ok: false };
    }
    joins.push({
      leftSourceFieldId: workingFields[inspectedJoin.leftKeyOrdinal]!.sourceFieldId,
      rightSourceFieldId: available[inspectedJoin.rightKeyOrdinal]!.sourceFieldId,
    });
    workingFields = nextFields;
    if (finalStage) {
      finalOutputs = nextFields.map((field, outputOrdinal) => ({
        name: names[outputOrdinal]!,
        fieldId: stageFields[outputOrdinal]!.fieldId,
        dataType: 'string',
        outputOrdinal,
        source: {
          nodeId: field.sourceNodeId,
          name: field.sourceName,
          fieldId: field.sourceFieldId,
        },
      }));
    }
  }

  return { ok: true, projection: { targetNodeId, inputs, joins, outputs: finalOutputs } };
}

export function inspectDvtSubstraitInnerJoinAcceptedDraft(draft: DvtSubstraitInnerJoinDraft):
  | Readonly<{
      ok: true;
      projection:
        | Readonly<{
            left: DvtSubstraitInnerJoinProjection['left'];
            right: DvtSubstraitInnerJoinProjection['right'];
            outputs: readonly Readonly<{
              name: string;
              fieldId: string;
              dataType: 'string' | 'i64';
              outputOrdinal: number;
            }>[];
          }>
        | DvtSubstraitNInputJoinProjection
        | DvtSubstraitInnerJoinGroupingProjection
        | DvtSubstraitInnerJoinGroupedWindowProjection;
    }>
  | Readonly<{ ok: false }> {
  const groupedWindow = inspectDvtSubstraitInnerJoinGroupedWindowDraft(draft);
  if (groupedWindow.ok) return groupedWindow;
  const grouping = inspectDvtSubstraitInnerJoinGroupingDraft(draft);
  if (grouping.ok) return grouping;
  const nInputJoin = inspectDvtSubstraitNInputJoinDraft(draft);
  if (nInputJoin.ok && nInputJoin.projection.inputs.length > 2) return nInputJoin;
  return inspectDvtSubstraitInnerJoinDraft(draft);
}

export function decodeDvtSubstraitInnerJoinDocument(input: unknown): DvtSubstraitInnerJoinDraft {
  const document = canonicalizeDvtSubstraitSemanticDocumentV1(input);
  const plan = fromBinary(PlanSchema, base64Bytes(document.semanticPlan.bytesBase64));
  if (!hasPinnedPlanVersion(plan)) {
    throw new Error('Substrait Plan does not match the pinned DVT profile.');
  }
  return { plan, sidecar: document.sidecar };
}

export function encodeDvtSubstraitInnerJoinDocument(
  draft: DvtSubstraitInnerJoinDraft
): DvtSubstraitSemanticDocumentV1 {
  if (!inspectDvtSubstraitInnerJoinAcceptedDraft(draft).ok) {
    throw new Error('Unsupported VTX2 INNER JOIN Substrait shape.');
  }
  const bytes = toBinary(PlanSchema, draft.plan);
  const sha256 = sha256Hex(bytes);
  return canonicalizeDvtSubstraitSemanticDocumentV1({
    schemaVersion: DVT_SUBSTRAIT_SEMANTIC_DOCUMENT_SCHEMA_VERSION,
    profile: DVT_SUBSTRAIT_PROFILE_REF_V1,
    semanticPlan: {
      encoding: DVT_SUBSTRAIT_PLAN_ENCODING,
      bytesBase64: bytesToBase64(bytes),
      sha256,
    },
    sidecar: {
      ...draft.sidecar,
      schemaVersion: DVT_SUBSTRAIT_AUTHORING_SIDECAR_SCHEMA_VERSION,
      semanticPlanSha256: sha256,
    },
  });
}
