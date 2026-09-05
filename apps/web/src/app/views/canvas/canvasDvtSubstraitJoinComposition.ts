/** Owned concern: build and inspect the admitted DVT INNER JOIN semantic shapes. */
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
  ConnectedSourceRefSchema,
  allocateDvtFieldId,
  allocateDvtRelationId,
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
    locator: { inputIndex: 0, fieldName: 'customer_id' },
  },
  {
    fieldKey: 'left.name',
    outputMapping: 1,
    defaultName: 'name',
    source: { relation: 'left', name: 'name' },
    locator: { inputIndex: 0, fieldName: 'name' },
  },
  {
    fieldKey: 'right.order_id',
    outputMapping: 2,
    defaultName: 'order_id',
    source: { relation: 'right', name: 'order_id' },
    locator: { inputIndex: 1, fieldName: 'order_id' },
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
  | Readonly<{ ok: true; projection: DvtSubstraitInnerJoinProjection }>
  | Readonly<{ ok: false }>;

export type DvtSubstraitNInputJoinProjection = Readonly<{
  inputs: readonly Readonly<{
    relationId: string;
    schema: string;
    table: string;
    sourceRef: ConnectedSourceRef;
    fields: readonly Readonly<{ name: string; fieldId: string }>[];
  }>[];
  joinRelations: readonly Readonly<{ relationId: string; relAnchor: number }>[];
  joins: readonly DvtSubstraitJoinPredicate[];
  outputs: readonly Readonly<{
    name: string;
    fieldId: string;
    dataType: 'string';
    outputOrdinal: number;
    source: Readonly<{ inputIndex: number; name: string; fieldId: string }>;
  }>[];
}>;

export type DvtSubstraitNInputJoinInspection =
  | Readonly<{ ok: true; projection: DvtSubstraitNInputJoinProjection }>
  | Readonly<{ ok: false }>;

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

/** These values are references to persisted input FieldIds, not graph node/name locators. */
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

export type DvtSubstraitJoinAppendInput = Readonly<{
  source: DvtSubstraitJoinSource;
  fields: readonly string[];
  predicate: Readonly<{ leftSourceFieldId: string; rightFieldName: string }>;
  selectedFields: readonly string[];
}>;

export type DvtSubstraitStringJoinSelection = Readonly<{
  left: DvtSubstraitJoinInput;
  right: DvtSubstraitJoinInput;
  leftFieldName: string;
  rightFieldName: string;
  targetNodeId: string;
}>;

type JoinFieldLocator = Readonly<{ inputIndex: number; fieldName: string }>;
type JoinBuildSource = Readonly<{
  nodeId?: string;
  schema: string;
  table: string;
  sourceRef: ConnectedSourceRef;
}>;
type JoinBuildInput = Readonly<{ source: JoinBuildSource; fields: readonly string[] }>;
type JoinBuildOutput = Readonly<{
  name: string;
  source: JoinFieldLocator;
  fieldId?: string;
}>;
type JoinBuildPredicate = Readonly<{ left: JoinFieldLocator; right: JoinFieldLocator }>;
type JoinOriginField = Readonly<{
  inputIndex: number;
  name: string;
  fieldId: string;
}>;
type InspectedJoinStage = Readonly<{
  relationId: string;
  relAnchor: number;
  fields: readonly Readonly<{
    fieldId: string;
    displayName: string;
    sourceFieldId: string;
  }>[];
}>;
type InspectedJoinStructure = Readonly<{
  inputs: DvtSubstraitNInputJoinProjection['inputs'];
  stages: readonly InspectedJoinStage[];
  joins: readonly DvtSubstraitJoinPredicate[];
  outputs: DvtSubstraitNInputJoinProjection['outputs'];
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
  return input == null || input.fields.join('\u0000') !== expectedColumns.join('\u0000')
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

function sameInputShape(
  left: Readonly<{
    schema: string;
    table: string;
    sourceRef: ConnectedSourceRef;
    fields: readonly Readonly<{ name: string }>[];
  }>,
  right: JoinBuildInput
): boolean {
  return (
    left.schema === right.source.schema &&
    left.table === right.source.table &&
    hasSameConnectedSourceRef(left.sourceRef, right.source.sourceRef) &&
    left.fields.map((field) => field.name).join('\u0000') === right.fields.join('\u0000')
  );
}

function matchesSemanticInput(
  semantic: DvtSubstraitNInputJoinProjection['inputs'][number],
  graph: DvtSubstraitJoinInput
): boolean {
  return (
    semantic.schema === graph.source.schema &&
    semantic.table === graph.source.table &&
    hasSameConnectedSourceRef(semantic.sourceRef, graph.source.sourceRef) &&
    semantic.fields.map((field) => field.name).join('\u0000') === graph.fields.join('\u0000')
  );
}

function resolveGraphInputs(args: {
  targetNode: CanonicalNode;
  nodes: readonly CanonicalNode[];
  edges: readonly CanonicalEdge[];
  semanticInputs: DvtSubstraitNInputJoinProjection['inputs'];
}): DvtSubstraitJoinInput[] | null {
  const incomingIds = [
    ...new Set(
      args.edges.filter((edge) => edge.targetId === args.targetNode.id).map((edge) => edge.sourceId)
    ),
  ];
  if (incomingIds.length !== args.semanticInputs.length) return null;
  const candidates = incomingIds
    .map((nodeId) => args.nodes.find((node) => node.id === nodeId))
    .map((node) => (node == null ? null : resolveJoinInput(node)))
    .filter((input): input is DvtSubstraitJoinInput => input != null);
  if (candidates.length !== args.semanticInputs.length) return null;

  const used = new Set<string>();
  const resolved: DvtSubstraitJoinInput[] = [];
  for (const semantic of args.semanticInputs) {
    const matches = candidates.filter(
      (candidate) => !used.has(candidate.source.nodeId) && matchesSemanticInput(semantic, candidate)
    );
    if (matches.length !== 1) return null;
    const match = matches[0]!;
    used.add(match.source.nodeId);
    resolved.push(match);
  }
  return resolved;
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
  const firstInput = inspection.projection.inputs[0];
  if (firstInput == null) return [];
  const connectedIds = new Set(
    args.edges.filter((edge) => edge.targetId === args.targetNode.id).map((edge) => edge.sourceId)
  );
  return args.nodes
    .filter((node) => connectedIds.has(node.id))
    .map(resolveJoinInput)
    .filter(
      (input): input is DvtSubstraitJoinInput =>
        input != null &&
        hasSameConnectionRef(firstInput.sourceRef.connectionRef, input.source.sourceRef.connectionRef) &&
        !inspection.projection.inputs.some((existing) =>
          hasSameConnectedSourceRef(existing.sourceRef, input.source.sourceRef)
        )
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

  const left = sources.map((candidate) => resolveJoinSource(candidate, LEFT_FIELD_NAMES)).find(Boolean);
  const right = sources.map((candidate) => resolveJoinSource(candidate, RIGHT_FIELD_NAMES)).find(Boolean);
  if (left == null || right == null || left.nodeId === right.nodeId) return null;
  if (!hasSameConnectionRef(left.sourceRef.connectionRef, right.sourceRef.connectionRef)) return null;

  if (args.requirePersistedAuthority) {
    try {
      const authority = readDvtTransformAuthoringAuthority(args.targetNode);
      if (authority == null) return null;
      const inspection = inspectDvtSubstraitInnerJoinDraft(
        decodeDvtSubstraitInnerJoinDocument(authority.semanticDocument)
      );
      if (!inspection.ok) return null;
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
      if (authority == null) return null;
      draft = decodeDvtSubstraitInnerJoinDocument(authority.semanticDocument);
    } catch {
      return null;
    }
  }
  const groupedWindow = inspectDvtSubstraitInnerJoinGroupedWindowDraft(draft);
  const grouping = inspectDvtSubstraitInnerJoinGroupingDraft(draft);
  const joinDraft = groupedWindow.ok
    ? removeDvtSubstraitInnerJoinGrouping(removeDvtSubstraitInnerJoinGroupedRowNumber(draft))
    : grouping.ok
      ? removeDvtSubstraitInnerJoinGrouping(draft)
      : draft;
  const inspection = inspectDvtSubstraitNInputJoinDraft(joinDraft);
  if (!inspection.ok) return null;
  const graphInputs = resolveGraphInputs({
    ...args,
    semanticInputs: inspection.projection.inputs,
  });
  if (graphInputs == null) return null;

  return {
    inputs: graphInputs,
    predicates: inspection.projection.joins,
    outputs: inspection.projection.outputs.map((output) => ({
      name: output.name,
      sourceFieldId: output.source.fieldId,
      fieldId: output.fieldId,
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
}): Rel {
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

function assertCompatibleSourceRefs(sources: readonly JoinBuildSource[]): void {
  const first = sources[0]?.sourceRef.connectionRef;
  if (first == null || first.provider !== 'postgres') {
    throw new Error('VTX2 INNER JOIN requires PostgreSQL sources.');
  }
  for (const source of sources) {
    const connection = source.sourceRef.connectionRef;
    if (
      source.schema.length === 0 ||
      source.schema !== source.schema.trim() ||
      source.table.length === 0 ||
      source.table !== source.table.trim() ||
      connection.provider !== 'postgres' ||
      !hasSameConnectionRef(first, connection)
    ) {
      throw new Error('VTX2 INNER JOIN requires compatible PostgreSQL sources on one connection.');
    }
  }
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

function locatorKey(locator: JoinFieldLocator): string {
  return `${locator.inputIndex}\u0000${locator.fieldName}`;
}

function sameLocator(left: JoinFieldLocator, right: JoinFieldLocator): boolean {
  return left.inputIndex === right.inputIndex && left.fieldName === right.fieldName;
}

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

function samePrefix(
  previous: InspectedJoinStructure,
  inputs: readonly JoinBuildInput[],
  count: number
): boolean {
  if (previous.inputs.length < count || inputs.length < count) return false;
  for (let index = 0; index < count; index += 1) {
    if (!sameInputShape(previous.inputs[index]!, inputs[index]!)) return false;
  }
  return true;
}

function createDvtSubstraitNInputJoinDraft(args: {
  inputs: readonly JoinBuildInput[];
  predicates: readonly JoinBuildPredicate[];
  outputs: readonly JoinBuildOutput[];
  previousDraft?: DvtSubstraitInnerJoinDraft;
}): DvtSubstraitInnerJoinDraft {
  requireInnerJoinCapabilities();
  if (args.inputs.length < 2 || args.predicates.length !== args.inputs.length - 1) {
    throw new Error('VTX2 INNER JOIN requires N inputs and exactly N-1 predicates.');
  }
  args.inputs.forEach((input) => requireUniqueTrimmedFields(input.fields));
  assertCompatibleSourceRefs(args.inputs.map((input) => input.source));
  if (
    new Set(
      args.inputs.map(
        (input) =>
          `${input.source.sourceRef.connectionRef.connectionId}:${input.source.sourceRef.sourceObjectId}`
      )
    ).size !== args.inputs.length
  ) {
    throw new Error('VTX2 INNER JOIN requires distinct source identities.');
  }
  if (
    args.outputs.length === 0 ||
    args.outputs.some(
      (output) =>
        output.name.length === 0 ||
        output.name !== output.name.trim() ||
        (output.fieldId != null &&
          (output.fieldId.length === 0 || output.fieldId !== output.fieldId.trim()))
    ) ||
    new Set(args.outputs.map((output) => output.name)).size !== args.outputs.length ||
    new Set(args.outputs.map((output) => locatorKey(output.source))).size !== args.outputs.length ||
    new Set(args.outputs.flatMap((output) => (output.fieldId == null ? [] : [output.fieldId]))).size !==
      args.outputs.filter((output) => output.fieldId != null).length
  ) {
    throw new Error('VTX2 INNER JOIN outputs must have unique names, sources, and identities.');
  }

  const previous = args.previousDraft == null ? null : inspectNInputJoinStructure(args.previousDraft);
  const inputIdentities = args.inputs.map((input) => {
    const prior = previous?.inputs.find((candidate) => sameInputShape(candidate, input));
    const relationId = prior?.relationId ?? allocateDvtRelationId();
    const priorFields = new Map(prior?.fields.map((field) => [field.name, field.fieldId] as const));
    return {
      relationId,
      fields: input.fields.map((name) => ({
        name,
        fieldId: priorFields.get(name) ?? allocateDvtFieldId(),
      })),
    };
  });

  const originByLocator = new Map<string, JoinOriginField>();
  inputIdentities.forEach((identity, inputIndex) => {
    identity.fields.forEach((field) =>
      originByLocator.set(locatorKey({ inputIndex, fieldName: field.name }), {
        inputIndex,
        name: field.name,
        fieldId: field.fieldId,
      })
    );
  });
  const requireOrigin = (locator: JoinFieldLocator): JoinOriginField => {
    const origin = originByLocator.get(locatorKey(locator));
    if (origin == null) throw new Error('VTX2 INNER JOIN references an unknown input field.');
    return origin;
  };

  args.predicates.forEach((predicate, predicateIndex) => {
    const rightInputIndex = predicateIndex + 1;
    if (
      predicate.left.inputIndex >= rightInputIndex ||
      predicate.right.inputIndex !== rightInputIndex
    ) {
      throw new Error('VTX2 INNER JOIN predicate does not match the left-deep input order.');
    }
    requireOrigin(predicate.left);
    requireOrigin(predicate.right);
  });
  args.outputs.forEach((output) => requireOrigin(output.source));

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
  let currentFields = inputIdentities[0]!.fields.map<JoinOriginField>((field) => ({
    inputIndex: 0,
    name: field.name,
    fieldId: field.fieldId,
  }));
  const stageOutputs: JoinOriginField[][] = [];
  for (const [predicateIndex, predicate] of args.predicates.entries()) {
    const rightInputIndex = predicateIndex + 1;
    const rightFields = inputIdentities[rightInputIndex]!.fields.map<JoinOriginField>((field) => ({
      inputIndex: rightInputIndex,
      name: field.name,
      fieldId: field.fieldId,
    }));
    const leftOrigin = requireOrigin(predicate.left);
    const rightOrigin = requireOrigin(predicate.right);
    const leftKeyOrdinal = currentFields.findIndex((field) => field.fieldId === leftOrigin.fieldId);
    const rightFieldIndex = rightFields.findIndex((field) => field.fieldId === rightOrigin.fieldId);
    if (leftKeyOrdinal < 0 || rightFieldIndex < 0) {
      throw new Error('VTX2 INNER JOIN predicate references an unavailable source field.');
    }
    const available = [...currentFields, ...rightFields];
    const selectedOutputs = args.outputs
      .filter((output) => output.source.inputIndex <= rightInputIndex)
      .map((output) => {
        const origin = requireOrigin(output.source);
        return available.find((field) => field.fieldId === origin.fieldId);
      });
    const futurePredicateFields = args.predicates
      .slice(predicateIndex + 1)
      .map((future) => {
        const origin = requireOrigin(future.left);
        return available.find((field) => field.fieldId === origin.fieldId);
      })
      .filter((field) => field != null);
    const selected = [...selectedOutputs, ...futurePredicateFields].filter(
      (field, index, fields) =>
        field != null && fields.findIndex((candidate) => candidate?.fieldId === field.fieldId) === index
    );
    if (selected.length === 0 || selectedOutputs.some((field) => field == null)) {
      throw new Error('VTX2 INNER JOIN output is unavailable at its join stage.');
    }
    const nextFields = selected.filter((field) => field != null);
    const outputMapping = nextFields.map((field) =>
      available.findIndex((candidate) => candidate.fieldId === field.fieldId)
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
          value: create(RelRootSchema, {
            input: currentRelation,
            names: args.outputs.map((output) => output.name),
          }),
        },
      }),
    ],
  });

  const previousFinal = previous?.stages.at(-1);
  const previousIntermediate = previous?.stages.slice(0, -1) ?? [];
  const canCarryFinal =
    previous != null &&
    previous.inputs.length <= args.inputs.length &&
    samePrefix(previous, args.inputs, previous.inputs.length);
  const joinRelationIds = args.predicates.map((_, stageIndex) => {
    const finalStage = stageIndex === args.predicates.length - 1;
    if (finalStage && canCarryFinal && previousFinal != null) return previousFinal.relationId;
    const priorStage = previousIntermediate[stageIndex];
    return priorStage != null && samePrefix(previous!, args.inputs, stageIndex + 2)
      ? priorStage.relationId
      : allocateDvtRelationId();
  });

  const finalOutputByOrigin = new Map(
    args.outputs.map((output) => [requireOrigin(output.source).fieldId, output] as const)
  );
  const relations: DvtSubstraitAuthoringSidecarV1['relations'] = [
    ...args.inputs.map((input, index) => ({
      relationId: inputIdentities[index]!.relationId,
      relAnchor: index + 1,
      sourceRef: input.source.sourceRef,
      displayName: input.source.table,
    })),
    ...joinRelationIds.map((relationId, stageIndex) => ({
      relationId,
      relAnchor: args.inputs.length + stageIndex + 1,
      displayName: args.inputs
        .slice(0, stageIndex + 2)
        .map((input) => input.source.table)
        .join('+'),
    })),
  ];
  const fields: DvtSubstraitAuthoringSidecarV1['fields'] = [
    ...args.inputs.flatMap((_, inputIndex) =>
      inputIdentities[inputIndex]!.fields.map((field, outputOrdinal) => ({
        fieldId: field.fieldId,
        relationId: inputIdentities[inputIndex]!.relationId,
        outputOrdinal,
        displayName: field.name,
      }))
    ),
    ...stageOutputs.flatMap((stageFields, stageIndex) => {
      const relationId = joinRelationIds[stageIndex]!;
      const finalStage = stageIndex === stageOutputs.length - 1;
      const previousStage = previous?.stages.find((stage) => stage.relationId === relationId);
      const previousFieldBySource = new Map(
        previousStage?.fields.map((field) => [field.sourceFieldId, field.fieldId] as const)
      );
      return stageFields.map((origin, outputOrdinal) => {
        const output = finalOutputByOrigin.get(origin.fieldId);
        const displayName = output?.name ?? origin.name;
        const fieldId = finalStage
          ? (output?.fieldId ?? previousFieldBySource.get(origin.fieldId) ?? allocateDvtFieldId())
          : (previousFieldBySource.get(origin.fieldId) ?? allocateDvtFieldId());
        return {
          fieldId,
          relationId,
          outputOrdinal,
          displayName,
          sourceFieldId: origin.fieldId,
        };
      });
    }),
  ];

  return {
    plan,
    sidecar: {
      schemaVersion: DVT_SUBSTRAIT_AUTHORING_SIDECAR_SCHEMA_VERSION,
      semanticPlanSha256: ZERO_SHA256,
      relations,
      fields,
    },
  };
}

function createCollisionSafeOutputName(args: {
  input: JoinBuildSource;
  sourceName: string;
  usedNames: ReadonlySet<string>;
}): string | null {
  return [
    args.sourceName,
    `${args.input.table}_${args.sourceName}`,
    `${args.input.schema}_${args.input.table}_${args.sourceName}`,
    ...(args.input.nodeId == null ? [] : [`${args.input.nodeId}_${args.sourceName}`]),
  ].find((candidate) => !args.usedNames.has(candidate)) ?? null;
}

export function createDvtSubstraitStringInnerJoinDraft(
  selection: DvtSubstraitStringJoinSelection
): DvtSubstraitInnerJoinDraft {
  if (
    !selection.left.fields.includes(selection.leftFieldName) ||
    !selection.right.fields.includes(selection.rightFieldName)
  ) {
    throw new Error('VTX2 INNER JOIN predicate must reference selected input fields.');
  }
  const inputs: JoinBuildInput[] = [selection.left, selection.right];
  const outputs: JoinBuildOutput[] = [];
  const usedNames = new Set<string>();
  inputs.forEach((input, inputIndex) => {
    input.fields.forEach((field) => {
      const name = createCollisionSafeOutputName({
        input: input.source,
        sourceName: field,
        usedNames,
      });
      if (name == null) throw new Error('VTX2 INNER JOIN could not create a collision-safe output.');
      usedNames.add(name);
      outputs.push({ name, source: { inputIndex, fieldName: field } });
    });
  });
  return createDvtSubstraitNInputJoinDraft({
    inputs,
    predicates: [
      {
        left: { inputIndex: 0, fieldName: selection.leftFieldName },
        right: { inputIndex: 1, fieldName: selection.rightFieldName },
      },
    ],
    outputs,
  });
}

export function createDvtSubstraitInnerJoinDraft(args: {
  left: DvtSubstraitJoinSource;
  right: DvtSubstraitJoinSource;
  targetNodeId: string;
}): DvtSubstraitInnerJoinDraft {
  if (args.targetNodeId.length === 0 || args.targetNodeId !== args.targetNodeId.trim()) {
    throw new Error('VTX2 INNER JOIN target node identity must be non-blank and trimmed.');
  }
  const inputs: JoinBuildInput[] = [
    { source: args.left, fields: LEFT_FIELD_NAMES },
    { source: args.right, fields: RIGHT_FIELD_NAMES },
  ];
  return createDvtSubstraitNInputJoinDraft({
    inputs,
    predicates: [
      {
        left: { inputIndex: 0, fieldName: 'customer_id' },
        right: { inputIndex: 1, fieldName: 'customer_id' },
      },
    ],
    outputs: INNER_JOIN_OUTPUT_FIELDS.map((field) => ({
      name: field.defaultName,
      source: field.locator,
    })),
  });
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
  if (read.readType.case !== 'namedTable' || read.readType.value.advancedExtension != null) return null;
  const names = read.readType.value.names;
  if (names.some((name) => name.trim().length === 0 || name !== name.trim())) return null;
  return names.length === 2 && names[0] != null && names[1] != null
    ? { schema: names[0], table: names[1] }
    : null;
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

function inspectNInputJoinNode(
  plan: Plan,
  rel: Rel,
  relAnchor: number
): Readonly<{ leftKeyOrdinal: number; rightKeyOrdinal: number; outputMapping: readonly number[] }> | null {
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

function inspectNInputJoinStructure(draft: DvtSubstraitInnerJoinDraft): InspectedJoinStructure | null {
  const { plan, sidecar } = draft;
  if (
    !hasPinnedPlanVersion(plan) ||
    plan.relations.length !== 1 ||
    sidecar.schemaVersion !== DVT_SUBSTRAIT_AUTHORING_SIDECAR_SCHEMA_VERSION ||
    !hasUniqueInnerJoinSidecarIdentity(draft) ||
    !hasCurrentInnerJoinSemanticHash(draft)
  ) {
    return null;
  }
  const root = plan.relations[0]?.relType;
  if (
    root?.case !== 'root' ||
    root.value.input == null ||
    root.value.names.length === 0 ||
    root.value.names.some((name) => name.length === 0 || name !== name.trim()) ||
    new Set(root.value.names).size !== root.value.names.length
  ) {
    return null;
  }
  const tree = flattenNInputJoinTree(root.value.input);
  if (
    tree == null ||
    tree.reads.length < 2 ||
    tree.joins.length !== tree.reads.length - 1 ||
    sidecar.relations.length !== tree.reads.length + tree.joins.length
  ) {
    return null;
  }

  const inputs: DvtSubstraitNInputJoinProjection['inputs'][number][] = [];
  for (const [index, readRel] of tree.reads.entries()) {
    if (readRel.relType.case !== 'read' || readRel.relType.value.common?.relAnchor !== index + 1) {
      return null;
    }
    const table = namedTableIdentity(readRel);
    const fieldNames = readRel.relType.value.baseSchema?.names;
    const fieldTypes = readRel.relType.value.baseSchema?.struct?.types;
    const binding = sidecar.relations.find((relation) => relation.relAnchor === index + 1);
    if (
      table == null ||
      fieldNames == null ||
      fieldNames.length === 0 ||
      fieldNames.some((name) => name.length === 0 || name !== name.trim()) ||
      new Set(fieldNames).size !== fieldNames.length ||
      fieldTypes == null ||
      fieldTypes.length !== fieldNames.length ||
      fieldTypes.some((type) => type.kind.case !== 'string') ||
      binding == null ||
      binding.sourceRef == null ||
      binding.displayName !== table.table
    ) {
      return null;
    }
    const fields = sidecar.fields
      .filter((field) => field.relationId === binding.relationId)
      .sort((left, right) => left.outputOrdinal - right.outputOrdinal);
    if (
      fields.length !== fieldNames.length ||
      fields.some(
        (field, fieldIndex) =>
          field.outputOrdinal !== fieldIndex || field.displayName !== fieldNames[fieldIndex]
      )
    ) {
      return null;
    }
    inputs.push({
      relationId: binding.relationId,
      ...table,
      sourceRef: binding.sourceRef,
      fields: fields.map((field, fieldIndex) => ({
        name: fieldNames[fieldIndex]!,
        fieldId: field.fieldId,
      })),
    });
  }
  if (
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
    return null;
  }

  let workingFields = inputs[0]!.fields.map<JoinOriginField>((field) => ({
    inputIndex: 0,
    name: field.name,
    fieldId: field.fieldId,
  }));
  const joins: DvtSubstraitJoinPredicate[] = [];
  const stages: InspectedJoinStage[] = [];
  let outputs: DvtSubstraitNInputJoinProjection['outputs'][number][] = [];
  for (const [joinIndex, joinRel] of tree.joins.entries()) {
    const relAnchor = inputs.length + joinIndex + 1;
    const inspectedJoin = inspectNInputJoinNode(plan, joinRel, relAnchor);
    const rightInput = inputs[joinIndex + 1]!;
    const rightFields = rightInput.fields.map<JoinOriginField>((field) => ({
      inputIndex: joinIndex + 1,
      name: field.name,
      fieldId: field.fieldId,
    }));
    const available = [...workingFields, ...rightFields];
    const relationBinding = sidecar.relations.find((relation) => relation.relAnchor === relAnchor);
    if (
      inspectedJoin == null ||
      relationBinding == null ||
      relationBinding.sourceRef != null ||
      relationBinding.displayName !==
        inputs
          .slice(0, joinIndex + 2)
          .map((input) => input.table)
          .join('+') ||
      inspectedJoin.leftKeyOrdinal < 0 ||
      inspectedJoin.leftKeyOrdinal >= workingFields.length ||
      inspectedJoin.rightKeyOrdinal < workingFields.length ||
      inspectedJoin.rightKeyOrdinal >= available.length ||
      inspectedJoin.outputMapping.length === 0 ||
      new Set(inspectedJoin.outputMapping).size !== inspectedJoin.outputMapping.length ||
      inspectedJoin.outputMapping.some((ordinal) => ordinal < 0 || ordinal >= available.length)
    ) {
      return null;
    }
    const nextFields = inspectedJoin.outputMapping.map((ordinal) => available[ordinal]!);
    const stageFields = sidecar.fields
      .filter((field) => field.relationId === relationBinding.relationId)
      .sort((left, right) => left.outputOrdinal - right.outputOrdinal);
    const finalStage = joinIndex === tree.joins.length - 1;
    const names = finalStage ? root.value.names : stageFields.map((field) => field.displayName);
    if (
      names.length !== nextFields.length ||
      stageFields.length !== nextFields.length ||
      stageFields.some((field, outputOrdinal) => {
        const name = names[outputOrdinal];
        const expectedOrigin = nextFields[outputOrdinal];
        return (
          name == null ||
          field.outputOrdinal !== outputOrdinal ||
          field.displayName !== name ||
          expectedOrigin == null ||
          (field.sourceFieldId != null && field.sourceFieldId !== expectedOrigin.fieldId)
        );
      })
    ) {
      return null;
    }
    stages.push({
      relationId: relationBinding.relationId,
      relAnchor,
      fields: stageFields.map((field, outputOrdinal) => ({
        fieldId: field.fieldId,
        displayName: names[outputOrdinal]!,
        sourceFieldId: nextFields[outputOrdinal]!.fieldId,
      })),
    });
    joins.push({
      leftSourceFieldId: workingFields[inspectedJoin.leftKeyOrdinal]!.fieldId,
      rightSourceFieldId: available[inspectedJoin.rightKeyOrdinal]!.fieldId,
    });
    workingFields = nextFields;
    if (finalStage) {
      outputs = nextFields.map((origin, outputOrdinal) => ({
        name: names[outputOrdinal]!,
        fieldId: stageFields[outputOrdinal]!.fieldId,
        dataType: 'string',
        outputOrdinal,
        source: {
          inputIndex: origin.inputIndex,
          name: origin.name,
          fieldId: origin.fieldId,
        },
      }));
    }
  }
  return { inputs, stages, joins, outputs };
}

export function inspectDvtSubstraitNInputJoinDraft(
  draft: DvtSubstraitInnerJoinDraft
): DvtSubstraitNInputJoinInspection {
  const structure = inspectNInputJoinStructure(draft);
  return structure == null
    ? { ok: false }
    : {
        ok: true,
        projection: {
          inputs: structure.inputs,
          joinRelations: structure.stages.map((stage) => ({
            relationId: stage.relationId,
            relAnchor: stage.relAnchor,
          })),
          joins: structure.joins,
          outputs: structure.outputs,
        },
      };
}

function fieldIdForLocator(
  projection: DvtSubstraitNInputJoinProjection,
  locator: JoinFieldLocator
): string | null {
  return projection.inputs[locator.inputIndex]?.fields.find(
    (field) => field.name === locator.fieldName
  )?.fieldId ?? null;
}

function locatorForFieldId(
  projection: DvtSubstraitNInputJoinProjection,
  fieldId: string
): JoinFieldLocator | null {
  for (const [inputIndex, input] of projection.inputs.entries()) {
    const field = input.fields.find((candidate) => candidate.fieldId === fieldId);
    if (field != null) return { inputIndex, fieldName: field.name };
  }
  return null;
}

function buildInputsFromProjection(
  projection: DvtSubstraitNInputJoinProjection
): JoinBuildInput[] {
  return projection.inputs.map((input) => ({
    source: {
      schema: input.schema,
      table: input.table,
      sourceRef: input.sourceRef,
    },
    fields: input.fields.map((field) => field.name),
  }));
}

function buildPredicatesFromProjection(
  projection: DvtSubstraitNInputJoinProjection
): JoinBuildPredicate[] | null {
  const result: JoinBuildPredicate[] = [];
  for (const predicate of projection.joins) {
    const left = locatorForFieldId(projection, predicate.leftSourceFieldId);
    const right = locatorForFieldId(projection, predicate.rightSourceFieldId);
    if (left == null || right == null) return null;
    result.push({ left, right });
  }
  return result;
}

function buildOutputsFromProjection(
  projection: DvtSubstraitNInputJoinProjection
): JoinBuildOutput[] {
  return projection.outputs.map((output) => ({
    name: output.name,
    fieldId: output.fieldId,
    source: { inputIndex: output.source.inputIndex, fieldName: output.source.name },
  }));
}

function binaryFieldForLocator(locator: JoinFieldLocator) {
  return INNER_JOIN_OUTPUT_FIELDS.find((field) => sameLocator(field.locator, locator));
}

export function inspectDvtSubstraitInnerJoinDraft(
  draft: DvtSubstraitInnerJoinDraft
): DvtSubstraitInnerJoinInspection {
  const inspection = inspectDvtSubstraitNInputJoinDraft(draft);
  if (!inspection.ok) return { ok: false };
  const { projection } = inspection;
  if (
    projection.inputs.length !== 2 ||
    projection.inputs[0]?.fields.map((field) => field.name).join(',') !== LEFT_FIELD_NAMES.join(',') ||
    projection.inputs[1]?.fields.map((field) => field.name).join(',') !== RIGHT_FIELD_NAMES.join(',') ||
    projection.joins.length !== 1
  ) {
    return { ok: false };
  }
  const leftKeyId = fieldIdForLocator(projection, { inputIndex: 0, fieldName: 'customer_id' });
  const rightKeyId = fieldIdForLocator(projection, { inputIndex: 1, fieldName: 'customer_id' });
  const predicate = projection.joins[0];
  if (
    leftKeyId == null ||
    rightKeyId == null ||
    predicate?.leftSourceFieldId !== leftKeyId ||
    predicate.rightSourceFieldId !== rightKeyId
  ) {
    return { ok: false };
  }
  const outputs = projection.outputs.map((output) => {
    const field = binaryFieldForLocator({
      inputIndex: output.source.inputIndex,
      fieldName: output.source.name,
    });
    return field == null
      ? null
      : {
          fieldKey: field.fieldKey,
          name: output.name,
          fieldId: output.fieldId,
          dataType: 'string' as const,
          outputOrdinal: output.outputOrdinal,
          source: field.source,
        };
  });
  if (outputs.some((output) => output == null)) return { ok: false };
  return {
    ok: true,
    projection: {
      left: {
        schema: projection.inputs[0]!.schema,
        table: projection.inputs[0]!.table,
        sourceRef: projection.inputs[0]!.sourceRef,
      },
      right: {
        schema: projection.inputs[1]!.schema,
        table: projection.inputs[1]!.table,
        sourceRef: projection.inputs[1]!.sourceRef,
      },
      leftKey: 'customer_id',
      rightKey: 'customer_id',
      outputs: outputs.filter((output) => output != null),
    },
  };
}

export function appendDvtSubstraitInnerJoinInput(
  draft: DvtSubstraitInnerJoinDraft,
  input: DvtSubstraitJoinAppendInput
): DvtSubstraitInnerJoinDraft {
  const inspection = inspectDvtSubstraitNInputJoinDraft(draft);
  if (!inspection.ok) return draft;
  const { projection } = inspection;
  const firstInput = projection.inputs[0];
  if (
    firstInput == null ||
    projection.inputs.some((existing) =>
      hasSameConnectedSourceRef(existing.sourceRef, input.source.sourceRef)
    ) ||
    !hasSameConnectionRef(firstInput.sourceRef.connectionRef, input.source.sourceRef.connectionRef) ||
    !projection.outputs.some((output) => output.source.fieldId === input.predicate.leftSourceFieldId)
  ) {
    return draft;
  }
  try {
    requireUniqueTrimmedFields(input.fields);
    if (
      !input.fields.includes(input.predicate.rightFieldName) ||
      input.selectedFields.length === 0 ||
      new Set(input.selectedFields).size !== input.selectedFields.length ||
      input.selectedFields.some((field) => !input.fields.includes(field))
    ) {
      return draft;
    }
    const existingPredicates = buildPredicatesFromProjection(projection);
    const left = locatorForFieldId(projection, input.predicate.leftSourceFieldId);
    if (existingPredicates == null || left == null) return draft;
    const inputs = [
      ...buildInputsFromProjection(projection),
      { source: input.source, fields: input.fields },
    ];
    const newInputIndex = inputs.length - 1;
    const outputs = buildOutputsFromProjection(projection);
    const usedNames = new Set(outputs.map((output) => output.name));
    for (const field of input.selectedFields) {
      const name = createCollisionSafeOutputName({
        input: input.source,
        sourceName: field,
        usedNames,
      });
      if (name == null) return draft;
      usedNames.add(name);
      outputs.push({ name, source: { inputIndex: newInputIndex, fieldName: field } });
    }
    return createDvtSubstraitNInputJoinDraft({
      inputs,
      predicates: [
        ...existingPredicates,
        {
          left,
          right: { inputIndex: newInputIndex, fieldName: input.predicate.rightFieldName },
        },
      ],
      outputs,
      previousDraft: draft,
    });
  } catch {
    return draft;
  }
}

export function applyDvtSubstraitInnerJoinFieldEdit(
  draft: DvtSubstraitInnerJoinDraft,
  edit: DvtSubstraitInnerJoinFieldEdit
): DvtSubstraitInnerJoinDraft {
  const nInputInspection = inspectDvtSubstraitNInputJoinDraft(draft);
  const binaryInspection = inspectDvtSubstraitInnerJoinDraft(draft);
  if (
    nInputInspection.ok &&
    (nInputInspection.projection.inputs.length > 2 || !binaryInspection.ok)
  ) {
    if (!('sourceFieldId' in edit) || typeof edit.sourceFieldId !== 'string') return draft;
    const projection = nInputInspection.projection;
    const locator = locatorForFieldId(projection, edit.sourceFieldId);
    if (locator == null) return draft;
    let outputs = buildOutputsFromProjection(projection);
    const currentIndex = outputs.findIndex((output) => sameLocator(output.source, locator));
    if (edit.kind === 'set-selected') {
      if (edit.selected === currentIndex >= 0) return draft;
      if (!edit.selected) {
        if (outputs.length === 1) return draft;
        outputs = outputs.filter((output) => !sameLocator(output.source, locator));
      } else {
        const input = projection.inputs[locator.inputIndex];
        if (input == null) return draft;
        const usedNames = new Set(outputs.map((output) => output.name));
        const name = createCollisionSafeOutputName({
          input: { schema: input.schema, table: input.table, sourceRef: input.sourceRef },
          sourceName: locator.fieldName,
          usedNames,
        });
        if (name == null) return draft;
        outputs.push({ name, source: locator });
      }
    } else if (edit.kind === 'rename') {
      const current = outputs[currentIndex];
      const name = edit.outputName.trim();
      if (
        current == null ||
        name.length === 0 ||
        outputs.some((output, index) => index !== currentIndex && output.name === name)
      ) {
        return draft;
      }
      outputs[currentIndex] = { ...current, name };
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
    const predicates = buildPredicatesFromProjection(projection);
    if (predicates == null) return draft;
    try {
      const edited = createDvtSubstraitNInputJoinDraft({
        inputs: buildInputsFromProjection(projection),
        predicates,
        outputs,
        previousDraft: draft,
      });
      const next = inspectDvtSubstraitNInputJoinDraft(edited);
      return next.ok ? edited : draft;
    } catch {
      return draft;
    }
  }

  if (!binaryInspection.ok || !nInputInspection.ok || !('fieldKey' in edit) || edit.fieldKey == null) {
    return draft;
  }
  const projection = nInputInspection.projection;
  let outputs: JoinBuildOutput[] = binaryInspection.projection.outputs.map((output) => {
    const field = INNER_JOIN_OUTPUT_FIELDS.find((candidate) => candidate.fieldKey === output.fieldKey)!;
    return { name: output.name, fieldId: output.fieldId, source: field.locator };
  });
  const field = INNER_JOIN_OUTPUT_FIELDS.find((candidate) => candidate.fieldKey === edit.fieldKey);
  if (field == null) return draft;
  const currentIndex = outputs.findIndex((output) => sameLocator(output.source, field.locator));
  if (edit.kind === 'set-selected') {
    if (edit.selected === currentIndex >= 0) return draft;
    if (!edit.selected) {
      if (outputs.length === 1) return draft;
      outputs = outputs.filter((output) => !sameLocator(output.source, field.locator));
    } else {
      outputs.push({ name: field.defaultName, source: field.locator });
    }
  } else if (edit.kind === 'rename') {
    const current = outputs[currentIndex];
    const name = edit.outputName.trim();
    if (
      current == null ||
      name.length === 0 ||
      outputs.some((output, index) => index !== currentIndex && output.name === name)
    ) {
      return draft;
    }
    outputs[currentIndex] = { ...current, name };
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
  const predicates = buildPredicatesFromProjection(projection);
  if (predicates == null) return draft;
  try {
    const edited = createDvtSubstraitNInputJoinDraft({
      inputs: buildInputsFromProjection(projection),
      predicates,
      outputs,
      previousDraft: draft,
    });
    return inspectDvtSubstraitInnerJoinDraft(edited).ok ? edited : draft;
  } catch {
    return draft;
  }
}

function baseJoinRel(plan: Plan): Rel | null {
  const root = plan.relations[0]?.relType;
  if (root?.case !== 'root' || root.value.input == null) return null;
  const first = root.value.input;
  if (first.relType.case === 'join') return first;
  if (first.relType.case === 'aggregate') {
    return first.relType.value.input?.relType.case === 'join' ? first.relType.value.input : null;
  }
  if (first.relType.case === 'project') {
    const aggregate = first.relType.value.input;
    return aggregate?.relType.case === 'aggregate' && aggregate.relType.value.input?.relType.case === 'join'
      ? aggregate.relType.value.input
      : null;
  }
  return null;
}

function innerJoinResultBinding(
  draft: DvtSubstraitInnerJoinDraft
): DvtSubstraitAuthoringSidecarV1['relations'][number] | null {
  const join = baseJoinRel(draft.plan);
  const relAnchor = join?.relType.case === 'join' ? join.relType.value.common?.relAnchor : undefined;
  if (relAnchor == null) return null;
  const bindings = draft.sidecar.relations.filter(
    (relation) => relation.relAnchor === relAnchor && relation.sourceRef == null
  );
  return bindings.length === 1 ? bindings[0]! : null;
}

type ValidInnerJoinGrouping = Readonly<{
  baseDraft: DvtSubstraitInnerJoinDraft;
  projection: DvtSubstraitInnerJoinGroupingProjection;
}>;

function inspectValidInnerJoinGrouping(
  draft: DvtSubstraitInnerJoinDraft
): ValidInnerJoinGrouping | null {
  if (
    !hasPinnedPlanVersion(draft.plan) ||
    draft.plan.relations.length !== 1 ||
    draft.sidecar.schemaVersion !== DVT_SUBSTRAIT_AUTHORING_SIDECAR_SCHEMA_VERSION ||
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
  const joinBinding = innerJoinResultBinding(draft);
  const aggregateBinding = draft.sidecar.relations.find(
    (relation) => relation.relAnchor === aggregate.common?.relAnchor
  );
  if (
    groupInputOrdinal == null ||
    groupInputOrdinal < 0 ||
    joinBinding == null ||
    aggregateBinding == null ||
    aggregateBinding.sourceRef != null ||
    aggregate.common.relAnchor <= joinBinding.relAnchor ||
    aggregateBinding.displayName !== joinBinding.displayName
  ) {
    return null;
  }
  const aggregateFields = draft.sidecar.fields
    .filter((field) => field.relationId === aggregateBinding.relationId)
    .sort((left, right) => left.outputOrdinal - right.outputOrdinal);
  const groupField = aggregateFields[0];
  const countField = aggregateFields[1];
  const groupName = groupField?.displayName;
  const countName = countField?.displayName;
  if (
    aggregateFields.length !== 2 ||
    groupField?.outputOrdinal !== 0 ||
    countField?.outputOrdinal !== 1 ||
    typeof groupName !== 'string' ||
    typeof countName !== 'string' ||
    groupName !== root.value.names[0] ||
    countName !== root.value.names[1]
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
        displayName: groupName,
      },
    ];
  });
  const baseOutputFields = baseFields
    .filter((field) => field.relationId === joinBinding.relationId)
    .sort((left, right) => left.outputOrdinal - right.outputOrdinal);
  if (
    baseOutputFields.length === 0 ||
    baseOutputFields.some((field, outputOrdinal) => field.outputOrdinal !== outputOrdinal) ||
    baseOutputFields.some((field) => field.displayName == null)
  ) {
    return null;
  }
  baseRoot.value.names = baseOutputFields.map((field) => field.displayName!);
  const baseDraft: DvtSubstraitInnerJoinDraft = {
    plan: basePlan,
    sidecar: {
      ...draft.sidecar,
      semanticPlanSha256: ZERO_SHA256,
      relations: draft.sidecar.relations.filter(
        (relation) => relation.relationId !== aggregateBinding.relationId
      ),
      fields: baseFields,
    },
  };
  const nInputBase = inspectDvtSubstraitNInputJoinDraft(baseDraft);
  const binaryBase = inspectDvtSubstraitInnerJoinDraft(baseDraft);
  const base = nInputBase.ok && nInputBase.projection.inputs.length > 2 ? nInputBase : binaryBase;
  const baseGroupField = base.ok ? base.projection.outputs[groupInputOrdinal] : null;
  if (
    !base.ok ||
    baseGroupField == null ||
    baseGroupField.fieldId !== groupField.fieldId ||
    baseGroupField.name !== groupName
  ) {
    return null;
  }
  const common = {
    measure: {
      name: countName,
      fieldId: countField.fieldId,
      capabilityId: DVT_SUBSTRAIT_COUNT_CAPABILITY_ID,
    },
    outputs: [
      { name: groupName, fieldId: groupField.fieldId, dataType: 'string' as const, outputOrdinal: 0 },
      { name: countName, fieldId: countField.fieldId, dataType: 'i64' as const, outputOrdinal: 1 },
    ],
  };
  if (nInputBase.ok && (nInputBase.projection.inputs.length > 2 || !binaryBase.ok)) {
    const nInputGroup = nInputBase.projection.outputs[groupInputOrdinal];
    if (nInputGroup == null) return null;
    return {
      baseDraft,
      projection: {
        kind: 'n-input',
        inputs: nInputBase.projection.inputs,
        joins: nInputBase.projection.joins,
        groupField: {
          name: nInputGroup.name,
          fieldId: nInputGroup.fieldId,
          inputOrdinal: groupInputOrdinal,
          source: nInputGroup.source,
        },
        ...common,
      },
    };
  }
  if (!binaryBase.ok) return null;
  const binaryGroup = binaryBase.projection.outputs[groupInputOrdinal];
  if (binaryGroup == null) return null;
  return {
    baseDraft,
    projection: {
      kind: 'binary',
      left: binaryBase.projection.left,
      right: binaryBase.projection.right,
      leftKey: binaryBase.projection.leftKey,
      rightKey: binaryBase.projection.rightKey,
      groupField: {
        fieldKey: binaryGroup.fieldKey,
        name: binaryGroup.name,
        fieldId: binaryGroup.fieldId,
        inputOrdinal: groupInputOrdinal,
        source: binaryGroup.source,
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
  const nInput = inspectDvtSubstraitNInputJoinDraft(draft);
  const binary = inspectDvtSubstraitInnerJoinDraft(draft);
  const inspection = nInput.ok && (nInput.projection.inputs.length > 2 || !binary.ok) ? nInput : binary;
  const countOutputName = args.countOutputName.trim();
  if (!inspection.ok || countOutputName.length === 0) return draft;
  const groupField = inspection.projection.outputs.find((output) => output.fieldId === args.groupFieldId);
  if (groupField == null || groupField.name === countOutputName) return draft;
  const joinBinding = innerJoinResultBinding(draft);
  if (joinBinding == null) return draft;

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
  const aggregateRelationId = allocateDvtRelationId();
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
        fieldId: allocateDvtFieldId(),
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
  const aggregate = project.input?.relType.case === 'aggregate' ? project.input.relType.value : null;
  if (
    project.common?.relAnchor == null ||
    project.common.emitKind.case !== 'emit' ||
    project.common.emitKind.value.outputMapping.join(',') !== '0,1,2' ||
    project.common.hint != null ||
    project.common.advancedExtension != null ||
    project.advancedExtension != null ||
    aggregate == null ||
    aggregate.common?.relAnchor == null ||
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
  const joinBinding = innerJoinResultBinding(draft);
  const aggregateBinding = draft.sidecar.relations.find(
    (relation) => relation.relAnchor === aggregate.common?.relAnchor
  );
  const windowBinding = draft.sidecar.relations.find(
    (relation) => relation.relAnchor === project.common?.relAnchor
  );
  if (
    joinBinding == null ||
    aggregateBinding == null ||
    aggregateBinding.sourceRef != null ||
    windowBinding == null ||
    windowBinding.sourceRef != null ||
    project.common.relAnchor <= aggregateBinding.relAnchor ||
    windowBinding.displayName !== joinBinding.displayName
  ) {
    return null;
  }
  const outerFields = draft.sidecar.fields
    .filter((field) => field.relationId === windowBinding.relationId)
    .sort((left, right) => left.outputOrdinal - right.outputOrdinal);
  if (
    outerFields.length !== 3 ||
    outerFields.some(
      (field, outputOrdinal) =>
        field.outputOrdinal !== outputOrdinal || field.displayName !== root.value.names[outputOrdinal]
    )
  ) {
    return null;
  }
  const groupField = outerFields[0]!;
  const measureField = outerFields[1]!;
  const resultField = outerFields[2]!;

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
        (relation) => relation.relationId !== windowBinding.relationId
      ),
      fields: draft.sidecar.fields.flatMap((field) => {
        if (field.fieldId === resultField.fieldId) return [];
        if (field.relationId !== windowBinding.relationId) return [field];
        return [{ ...field, relationId: aggregateBinding.relationId }];
      }),
    },
  };
  const baseInspection = inspectDvtSubstraitInnerJoinGroupingDraft(baseDraft);
  if (
    !baseInspection.ok ||
    groupField.fieldId !== baseInspection.projection.groupField.fieldId ||
    measureField.fieldId !== baseInspection.projection.measure.fieldId
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
      fieldId: resultField.fieldId,
      capabilityId: DVT_SUBSTRAIT_ROW_NUMBER_CAPABILITY_ID,
    },
    outputs: [
      { name: root.value.names[0]!, fieldId: groupField.fieldId, dataType: 'string' as const, outputOrdinal: 0 },
      { name: root.value.names[1]!, fieldId: measureField.fieldId, dataType: 'i64' as const, outputOrdinal: 1 },
      { name: root.value.names[2]!, fieldId: resultField.fieldId, dataType: 'i64' as const, outputOrdinal: 2 },
    ],
  };
  return baseInspection.projection.kind === 'n-input'
    ? {
        baseDraft,
        projection: {
          kind: 'n-input',
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
  const grouping = inspectDvtSubstraitInnerJoinGroupingDraft(draft);
  const outputName = args.outputName.trim();
  if (
    !grouping.ok ||
    outputName.length === 0 ||
    grouping.projection.outputs.some((output) => output.name === outputName)
  ) {
    return draft;
  }
  const joinBinding = innerJoinResultBinding(draft);
  const plan = clonePlan(draft.plan);
  const root = plan.relations[0]?.relType;
  if (joinBinding == null || root?.case !== 'root' || root.value.input?.relType.case !== 'aggregate') {
    return draft;
  }
  const aggregateInput = root.value.input;
  if (aggregateInput.relType.case !== 'aggregate') return draft;
  const aggregateAnchor = aggregateInput.relType.value.common?.relAnchor;
  const aggregateBinding = draft.sidecar.relations.find(
    (relation) => relation.relAnchor === aggregateAnchor
  );
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
  const windowRelationId = allocateDvtRelationId();
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
        field.relationId === aggregateBinding.relationId
          ? { ...field, relationId: windowRelationId }
          : field
      ),
      {
        fieldId: allocateDvtFieldId(),
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
  const binary = inspectDvtSubstraitInnerJoinDraft(draft);
  if (binary.ok) return binary;
  return inspectDvtSubstraitNInputJoinDraft(draft);
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
