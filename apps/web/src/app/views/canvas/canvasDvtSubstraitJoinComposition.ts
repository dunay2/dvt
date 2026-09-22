import {
  ZERO_SHA256,
  type DvtSubstraitJoinDataType,
  type DvtSubstraitJoinDraft,
  type DvtSubstraitJoinType,
  type DvtSubstraitNInputJoinProjection,
  type DvtSubstraitJoinPredicate,
  type JoinOriginField,
  type InspectedJoinStructure,
  hasSameConnectionRef,
  hasPinnedPlanVersion,
  hasUniqueJoinSidecarIdentity,
  hasCurrentJoinSemanticHash,
  inspectNInputJoinStructure,
  inspectDvtSubstraitJoinDraft as inspectDvtSubstraitJoinProjection,
  dvtSubstraitJoinNullExtendsLeft,
  dvtSubstraitJoinNullExtendsRight,
  dvtSubstraitJoinRetainedSide,
} from '@dvt/postgres-projection';
export {
  type DvtSubstraitJoinDataType,
  type DvtSubstraitJoinDraft,
  type DvtSubstraitJoinType,
  type DvtSubstraitNInputJoinProjection,
  type DvtSubstraitNInputJoinInspection,
  type DvtSubstraitJoinPredicate,
  inspectDvtSubstraitJoinDraft,
} from '@dvt/postgres-projection';
/** Owned concern: build and inspect the admitted DVT JOIN semantic shapes. */
import { create, fromBinary, toBinary } from '@bufbuild/protobuf';
import {
  AggregateFunction_AggregationInvocation,
  AggregateFunctionSchema,
  AggregateRelSchema,
  AggregateRel_GroupingSchema,
  AggregateRel_MeasureSchema,
  AggregationPhase,
  ExpressionSchema,
  Expression_WindowFunctionSchema,
  Expression_WindowFunction_BoundsType,
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
  type Expression,
  type Rel,
} from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import {
  PlanRelSchema,
  PlanSchema,
  type Plan,
} from '@buf/substrait_substrait.bufbuild_es/substrait/plan_pb.js';
import {
  NamedStructSchema,
  TypeSchema,
  Type_BooleanSchema,
  Type_FP64Schema,
  Type_I64Schema,
  Type_Nullability,
  Type_PrecisionTimestampTZSchema,
  Type_StringSchema,
  Type_StructSchema,
  type Type,
} from '@buf/substrait_substrait.bufbuild_es/substrait/type_pb.js';
import { base64Bytes, sha256Hex } from '@dvt/crypto';
import {
  DVT_SUBSTRAIT_AUTHORING_SIDECAR_SCHEMA_VERSION,
  DVT_SUBSTRAIT_CAPABILITY_CATALOG_V1,
  DVT_SUBSTRAIT_PLAN_ENCODING,
  DVT_SUBSTRAIT_PROFILE_REF_V1,
  DVT_SUBSTRAIT_SEMANTIC_DOCUMENT_SCHEMA_VERSION,
  PostgresIdentifierV1Schema,
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
import { resolveCanvasDvtJoinOccurrenceIdentities } from './relational-source-occurrence/joinOccurrenceIdentity';
import { resolveCanvasDvtJoinPhysicalBindings } from './relational-source-occurrence/joinPhysicalBindings';
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
import { hasSameConnectedSourceRef } from './canvasDvtSubstraitJoinSourceResolution';
import {
  DVT_SUBSTRAIT_INNER_JOIN_LEFT_FIELD_NAMES as LEFT_FIELD_NAMES,
  DVT_SUBSTRAIT_INNER_JOIN_OUTPUT_FIELDS as INNER_JOIN_OUTPUT_FIELDS,
  DVT_SUBSTRAIT_INNER_JOIN_RIGHT_FIELD_NAMES as RIGHT_FIELD_NAMES,
  hasDvtSubstraitLegacyBinaryInnerJoinShape,
} from './canvasDvtSubstraitInnerJoinShape';
import { dvtSubstraitExpression } from './canvasDvtSubstraitExpression';
import {
  appendDvtSubstraitJoinComparison,
  dvtSubstraitJoinConditionOperands,
  isDvtSubstraitJoinNullCondition,
  collectDvtSubstraitJoinConditionCombinations,
  collectDvtSubstraitJoinConditionComparisons,
  compactDvtSubstraitJoinConditionDefaults,
  dvtSubstraitJoinConditionKey,
  hasValidDvtSubstraitJoinConditionGroups,
  mapDvtSubstraitJoinConditionOperands,
  reduceDvtSubstraitJoinConditions,
  removeDvtSubstraitJoinComparison,
  updateDvtSubstraitJoinComparison,
  type DvtSubstraitJoinComparisonCondition,
  type DvtSubstraitJoinComparisonOperator,
  type DvtSubstraitJoinPredicateOperator,
  type DvtSubstraitJoinCondition,
  type DvtSubstraitJoinConditionCombination,
  type DvtSubstraitJoinPredicateCondition,
} from './canvasDvtSubstraitJoinCondition';
import {
  buildDvtSubstraitJoinOperandExpression,
  collectDvtSubstraitJoinOperandFields,
  dvtSubstraitJoinOperandCapabilityIds,
  dvtSubstraitJoinOperandContainsLiteral,
  dvtSubstraitJoinOperandKey,
  mapDvtSubstraitJoinOperandFields,
  resolveDvtSubstraitJoinOperandDataType,
  type DvtSubstraitInspectedJoinOperand,
  type DvtSubstraitJoinOperand,
  type DvtSubstraitJoinPredicateOperand,
} from './canvasDvtSubstraitJoinOperand';
import {
  comparisonFunctionIdentity,
  booleanFunctionIdentity,
  inspectJoinConditionChain,
  type InspectedJoinCondition,
} from './canvasDvtSubstraitJoinConditionInspection';
import {
  createDvtSubstraitNullableI64Type,
  DVT_SUBSTRAIT_ROW_NUMBER_CAPABILITY_ID,
  ensureDvtSubstraitRowNumberFunction,
  isDvtSubstraitRowNumberFunction,
  removeDvtSubstraitRowNumberExtension,
} from './canvasDvtSubstraitWindow';
export {
  DVT_SUBSTRAIT_JOIN_COMPARISON_OPERATORS,
  DVT_SUBSTRAIT_JOIN_CONDITION_COMBINATIONS,
  type DvtSubstraitJoinComparisonOperator,
  type DvtSubstraitJoinConditionCombination,
  type DvtSubstraitJoinPredicateCondition,
} from './canvasDvtSubstraitJoinCondition';
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
  result: Readonly<{
    name: string;
    fieldId: string;
    capabilityId: string;
    nullable: false;
  }>;
  outputs: readonly Readonly<{
    name: string;
    fieldId: string;
    dataType: 'string' | 'i64';
    outputOrdinal: number;
    nullable?: boolean;
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

export type DvtSubstraitJoinEntry = Readonly<{
  left: DvtSubstraitJoinSource;
  right: DvtSubstraitJoinSource;
  targetNodeId: string;
}>;

export type DvtSubstraitJoinInput = Readonly<{
  source: DvtSubstraitJoinSource;
  fields: readonly string[];
  fieldTypes?: readonly DvtSubstraitJoinDataType[];
  fieldNullabilities?: readonly boolean[];
}>;

/** These values are references to persisted input FieldIds, not graph node/name locators. */
export type { DvtSubstraitJoinPredicateOperand } from './canvasDvtSubstraitJoinOperand';

export type DvtSubstraitJoinOutputSelection = Readonly<{
  name: string;
  sourceFieldId: string;
  fieldId?: string;
}>;

export type DvtSubstraitNInputJoinEntry = Readonly<{
  inputs: readonly DvtSubstraitJoinInput[];
  predicates: readonly DvtSubstraitJoinPredicate[];
  joinTypes?: readonly DvtSubstraitJoinType[];
  outputs: readonly DvtSubstraitJoinOutputSelection[];
  targetNodeId: string;
}>;

export type DvtSubstraitJoinAppendInput = Readonly<{
  source: DvtSubstraitJoinSource;
  fields: readonly string[];
  fieldTypes?: readonly DvtSubstraitJoinDataType[];
  fieldNullabilities?: readonly boolean[];
  predicate: Readonly<{ leftSourceFieldId: string; rightFieldName: string }>;
  selectedFields: readonly string[];
  joinType?: DvtSubstraitJoinType;
}>;

export type DvtSubstraitStringJoinSelection = Readonly<{
  left: DvtSubstraitJoinInput;
  right: DvtSubstraitJoinInput;
  leftFieldName: string;
  rightFieldName: string;
  targetNodeId: string;
  joinType?: DvtSubstraitJoinType;
}>;

type JoinFieldLocator = Readonly<{ inputIndex: number; fieldName: string }>;
type JoinBuildSource = Readonly<{
  nodeId?: string;
  schema: string;
  table: string;
  sourceRef: ConnectedSourceRef;
}>;
type JoinBuildInput = Readonly<{
  relationId?: string;
  source: JoinBuildSource;
  fields: readonly string[];
  fieldTypes?: readonly DvtSubstraitJoinDataType[];
  fieldNullabilities?: readonly boolean[];
}>;
type JoinBuildOutput = Readonly<{
  name: string;
  source: JoinFieldLocator;
  fieldId?: string;
}>;
type JoinBuildPredicateOperand = DvtSubstraitJoinOperand<
  Readonly<{ kind: 'field'; locator: JoinFieldLocator }>
>;
type JoinBuildPredicate = Readonly<{
  conditions: readonly DvtSubstraitJoinCondition<JoinBuildPredicateOperand>[];
}>;

export function resolveDvtSubstraitNInputJoinEntry(args: {
  targetNode: CanonicalNode;
  nodes: readonly CanonicalNode[];
  edges: readonly CanonicalEdge[];
  draft?: DvtSubstraitJoinDraft;
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
      draft = decodeDvtSubstraitJoinDocument(authority.semanticDocument);
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
  const inspection = inspectDvtSubstraitJoinProjection(joinDraft);
  if (!inspection.ok) return null;
  const graphInputs = resolveCanvasDvtJoinPhysicalBindings({
    ...args,
    semanticInputs: inspection.projection.inputs,
  });
  if (graphInputs == null) return null;

  return {
    inputs: graphInputs,
    predicates: inspection.projection.joins,
    joinTypes: inspection.projection.joinRelations.map((relation) => relation.joinType),
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

const JOIN_DATA_TYPE_CAPABILITY_SELECTOR: Record<DvtSubstraitJoinDataType, string> = {
  string: 'kind.string',
  bool: 'kind.bool',
  i64: 'kind.i64',
  fp64: 'kind.fp64',
  precisionTimestampTz: 'kind.precision_timestamp_tz',
};

function resolveJoinFieldTypes(input: JoinBuildInput): readonly DvtSubstraitJoinDataType[] {
  const fieldTypes = input.fieldTypes ?? input.fields.map(() => 'string' as const);
  if (fieldTypes.length !== input.fields.length) {
    throw new Error('VTX2 JOIN field names and types must have the same length.');
  }
  return fieldTypes;
}

function resolveJoinFieldNullabilities(input: JoinBuildInput): readonly boolean[] {
  const nullabilities = input.fieldNullabilities ?? input.fields.map(() => true);
  if (nullabilities.length !== input.fields.length) {
    throw new Error('VTX2 JOIN field names and nullabilities must have the same length.');
  }
  return nullabilities;
}

function stringType(nullable = true) {
  return create(TypeSchema, {
    kind: {
      case: 'string',
      value: create(Type_StringSchema, {
        nullability: nullable ? Type_Nullability.NULLABLE : Type_Nullability.REQUIRED,
      }),
    },
  });
}

function booleanType(nullable = true) {
  return create(TypeSchema, {
    kind: {
      case: 'bool',
      value: create(Type_BooleanSchema, {
        nullability: nullable ? Type_Nullability.NULLABLE : Type_Nullability.REQUIRED,
      }),
    },
  });
}

function joinFieldType(dataType: DvtSubstraitJoinDataType, nullable: boolean): Type {
  if (dataType === 'string') return stringType(nullable);
  if (dataType === 'bool') return booleanType(nullable);
  if (dataType === 'i64')
    return nullable ? createDvtSubstraitNullableI64Type() : createDvtSubstraitRequiredI64Type();
  if (dataType === 'fp64') {
    return create(TypeSchema, {
      kind: {
        case: 'fp64',
        value: create(Type_FP64Schema, {
          nullability: nullable ? Type_Nullability.NULLABLE : Type_Nullability.REQUIRED,
        }),
      },
    });
  }
  return create(TypeSchema, {
    kind: {
      case: 'precisionTimestampTz',
      value: create(Type_PrecisionTimestampTZSchema, {
        precision: 3,
        nullability: nullable ? Type_Nullability.NULLABLE : Type_Nullability.REQUIRED,
      }),
    },
  });
}

function readRelation(args: {
  relAnchor: number;
  schema: string;
  table: string;
  fields: readonly string[];
  fieldTypes: readonly DvtSubstraitJoinDataType[];
  fieldNullabilities: readonly boolean[];
}): Rel {
  return create(RelSchema, {
    relType: {
      case: 'read',
      value: create(ReadRelSchema, {
        common: create(RelCommonSchema, { relAnchor: args.relAnchor }),
        baseSchema: create(NamedStructSchema, {
          names: [...args.fields],
          struct: create(Type_StructSchema, {
            types: args.fieldTypes.map((dataType, index) =>
              joinFieldType(dataType, args.fieldNullabilities[index]!)
            ),
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

function requireJoinCapabilities(
  joinTypes: readonly DvtSubstraitJoinType[],
  predicates: readonly JoinBuildPredicate[]
): void {
  for (const joinType of new Set(joinTypes)) {
    const selector =
      joinType === JoinRel_JoinType.INNER
        ? 'JoinType.JOIN_TYPE_INNER'
        : joinType === JoinRel_JoinType.LEFT
          ? 'JoinType.JOIN_TYPE_LEFT'
          : joinType === JoinRel_JoinType.RIGHT
            ? 'JoinType.JOIN_TYPE_RIGHT'
            : joinType === JoinRel_JoinType.OUTER
              ? 'JoinType.JOIN_TYPE_OUTER'
              : joinType === JoinRel_JoinType.LEFT_SEMI
                ? 'JoinType.JOIN_TYPE_LEFT_SEMI'
                : joinType === JoinRel_JoinType.LEFT_ANTI
                  ? 'JoinType.JOIN_TYPE_LEFT_ANTI'
                  : joinType === JoinRel_JoinType.RIGHT_SEMI
                    ? 'JoinType.JOIN_TYPE_RIGHT_SEMI'
                    : joinType === JoinRel_JoinType.RIGHT_ANTI
                      ? 'JoinType.JOIN_TYPE_RIGHT_ANTI'
                      : null;
    if (selector == null) throw new Error('The requested JOIN type is not admitted.');
    requireSupportedCapability(
      buildDvtSubstraitStandardCapabilityId('relation', {
        sourceKind: 'core',
        message: 'substrait.JoinRel',
        selector,
      })
    );
  }
  requireSupportedCapability(
    buildDvtSubstraitStandardCapabilityId('type', {
      sourceKind: 'core',
      message: 'substrait.Type',
      selector: 'kind.bool',
    })
  );
  const conditions = predicates.flatMap((predicate) => predicate.conditions);
  const conditionComparisons = conditions.flatMap(collectDvtSubstraitJoinConditionComparisons);
  const conditionOperands = conditionComparisons.flatMap(dvtSubstraitJoinConditionOperands);
  const comparisons = new Set<DvtSubstraitJoinPredicateOperator>(
    conditionComparisons.map((condition) => condition.operator ?? 'equal')
  );
  for (const comparison of comparisons) {
    requireSupportedCapability(
      buildDvtSubstraitStandardCapabilityId('scalar-function', {
        sourceKind: 'simple-extension',
        ...comparisonFunctionIdentity(comparison),
      })
    );
  }
  if (conditionOperands.some(dvtSubstraitJoinOperandContainsLiteral)) {
    requireSupportedCapability(
      buildDvtSubstraitStandardCapabilityId('expression-form', {
        sourceKind: 'core',
        message: 'substrait.Expression',
        selector: 'rex_type.literal',
      })
    );
  }
  for (const capabilityId of new Set(
    conditionOperands.flatMap(dvtSubstraitJoinOperandCapabilityIds)
  )) {
    requireSupportedCapability(capabilityId);
  }
  const combinations = new Set<DvtSubstraitJoinConditionCombination>(
    conditions.flatMap(collectDvtSubstraitJoinConditionCombinations)
  );
  for (const combination of combinations) {
    requireSupportedCapability(
      buildDvtSubstraitStandardCapabilityId('scalar-function', {
        sourceKind: 'simple-extension',
        ...booleanFunctionIdentity(combination),
      })
    );
  }
}

function assertCompatibleSourceRefs(sources: readonly JoinBuildSource[]): void {
  const first = sources[0]?.sourceRef.connectionRef;
  if (first == null || first.provider !== 'postgres') {
    throw new Error('VTX2 JOIN requires PostgreSQL sources.');
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
      throw new Error('VTX2 JOIN requires compatible PostgreSQL sources on one connection.');
    }
  }
}

function requireUniqueTrimmedFields(fields: readonly string[]): void {
  if (
    fields.length === 0 ||
    fields.some((field) => field.length === 0 || field !== field.trim()) ||
    new Set(fields).size !== fields.length
  ) {
    throw new Error('VTX2 JOIN input fields must be non-empty, unique, and trimmed.');
  }
}

function locatorKey(locator: JoinFieldLocator): string {
  return `${locator.inputIndex}\u0000${locator.fieldName}`;
}

function sameLocator(left: JoinFieldLocator, right: JoinFieldLocator): boolean {
  return left.inputIndex === right.inputIndex && left.fieldName === right.fieldName;
}

function buildOperandKey(operand: JoinBuildPredicateOperand): string {
  return dvtSubstraitJoinOperandKey(operand, (field) => locatorKey(field.locator));
}

function createNInputJoinRelation(args: {
  relAnchor: number;
  left: Rel;
  right: Rel;
  expression: Expression;
  outputMapping: readonly number[];
  joinType: DvtSubstraitJoinType;
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
        expression: args.expression,
        type: args.joinType,
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
    if (previous.inputs[index]!.relationId !== inputs[index]!.relationId) return false;
  }
  return true;
}

function createDvtSubstraitNInputJoinDraft(args: {
  inputs: readonly JoinBuildInput[];
  predicates: readonly JoinBuildPredicate[];
  joinTypes?: readonly DvtSubstraitJoinType[];
  outputs: readonly JoinBuildOutput[];
  previousDraft?: DvtSubstraitJoinDraft;
  relationIds?: readonly string[];
}): DvtSubstraitJoinDraft {
  const joinTypes =
    args.joinTypes ?? args.predicates.map(() => JoinRel_JoinType.INNER as DvtSubstraitJoinType);
  requireJoinCapabilities(joinTypes, args.predicates);
  if (args.inputs.length < 2 || args.predicates.length !== args.inputs.length - 1) {
    throw new Error('VTX2 JOIN requires N inputs and exactly N-1 predicates.');
  }
  if (joinTypes.length !== args.predicates.length) {
    throw new Error('VTX2 JOIN requires one explicit type per predicate stage.');
  }
  args.inputs.forEach((input) => requireUniqueTrimmedFields(input.fields));
  const fieldTypesByInput = args.inputs.map(resolveJoinFieldTypes);
  const fieldNullabilitiesByInput = args.inputs.map(resolveJoinFieldNullabilities);
  new Set(fieldTypesByInput.flat()).forEach((dataType) =>
    requireSupportedCapability(
      buildDvtSubstraitStandardCapabilityId('type', {
        sourceKind: 'core',
        message: 'substrait.Type',
        selector: JOIN_DATA_TYPE_CAPABILITY_SELECTOR[dataType],
      })
    )
  );
  assertCompatibleSourceRefs(args.inputs.map((input) => input.source));
  if (
    args.outputs.some(
      (output) =>
        output.name.length === 0 ||
        (output.fieldId != null &&
          (output.fieldId.length === 0 || output.fieldId !== output.fieldId.trim()))
    ) ||
    new Set(args.outputs.map((output) => output.name)).size !== args.outputs.length ||
    new Set(args.outputs.map((output) => locatorKey(output.source))).size !== args.outputs.length ||
    new Set(args.outputs.flatMap((output) => (output.fieldId == null ? [] : [output.fieldId])))
      .size !== args.outputs.filter((output) => output.fieldId != null).length
  ) {
    throw new Error('VTX2 JOIN outputs must have unique names, sources, and identities.');
  }

  const previous =
    args.previousDraft == null ? null : inspectNInputJoinStructure(args.previousDraft);
  const inputIdentities = resolveCanvasDvtJoinOccurrenceIdentities(
    args.inputs.map((input, inputIndex) => ({
      source: input.source,
      relationId: input.relationId,
      fields: input.fields.map((name, fieldIndex) => ({
        name,
        dataType: fieldTypesByInput[inputIndex]![fieldIndex]!,
        nullable: fieldNullabilitiesByInput[inputIndex]![fieldIndex]!,
      })),
    })),
    previous
  );

  const originByLocator = new Map<string, JoinOriginField>();
  inputIdentities.forEach((identity, inputIndex) => {
    identity.fields.forEach((field) =>
      originByLocator.set(locatorKey({ inputIndex, fieldName: field.name }), {
        inputIndex,
        name: field.name,
        fieldId: field.fieldId,
        dataType: field.dataType,
        nullable: field.nullable,
      })
    );
  });
  const requireOrigin = (locator: JoinFieldLocator): JoinOriginField => {
    const origin = originByLocator.get(locatorKey(locator));
    if (origin == null) throw new Error('VTX2 JOIN references an unknown input field.');
    return origin;
  };

  args.predicates.forEach((predicate, predicateIndex) => {
    const rightInputIndex = predicateIndex + 1;
    if (predicate.conditions.length === 0) {
      throw new Error('VTX2 JOIN requires at least one condition.');
    }
    const conditionKeys = new Set<string>();
    for (const condition of predicate.conditions) {
      if (!hasValidDvtSubstraitJoinConditionGroups(condition)) {
        throw new Error('VTX2 JOIN condition groups require at least two conditions.');
      }
      for (const comparison of collectDvtSubstraitJoinConditionComparisons(condition)) {
        const operands = dvtSubstraitJoinConditionOperands(comparison);
        const operandTypes = operands.map((operand) =>
          resolveDvtSubstraitJoinOperandDataType(operand, (field) => {
            const origin = requireOrigin(field.locator);
            if (origin.inputIndex > rightInputIndex) {
              throw new Error('VTX2 JOIN condition references a future input field.');
            }
            return origin.dataType;
          })
        );
        if (operandTypes.some((dataType) => dataType == null)) {
          throw new Error('VTX2 JOIN operand function is incompatible with its input.');
        }
        if (operandTypes.length === 2 && operandTypes[0] !== operandTypes[1]) {
          throw new Error('VTX2 JOIN condition operands must have the same data type.');
        }
      }
      const key = dvtSubstraitJoinConditionKey(condition, buildOperandKey);
      if (conditionKeys.has(key)) {
        throw new Error('VTX2 JOIN conditions must be unique.');
      }
      conditionKeys.add(key);
    }
  });
  args.outputs.forEach((output) => requireOrigin(output.source));

  const reads = args.inputs.map((input, index) =>
    readRelation({
      relAnchor: index + 1,
      schema: input.source.schema,
      table: input.source.table,
      fields: input.fields,
      fieldTypes: fieldTypesByInput[index]!,
      fieldNullabilities: fieldNullabilitiesByInput[index]!,
    })
  );
  const plan = create(PlanSchema, {
    version: {
      majorNumber: 0,
      minorNumber: 101,
      patchNumber: 0,
      producer: joinTypes.every((joinType) => joinType === JoinRel_JoinType.INNER)
        ? args.inputs.length === 2
          ? 'dvt-vtx2-inner-join-card'
          : 'dvt-vtx2-n-input-inner-join-card'
        : 'dvt-vtx2-join-card',
    },
  });
  const comparisonOperators = new Set<DvtSubstraitJoinPredicateOperator>(
    args.predicates.flatMap((predicate) =>
      predicate.conditions
        .flatMap(collectDvtSubstraitJoinConditionComparisons)
        .map((condition) => condition.operator ?? 'equal')
    )
  );
  const comparisonFunctionAnchors = new Map(
    Array.from(
      comparisonOperators,
      (operator) =>
        [
          operator,
          dvtSubstraitExpression.ensureScalarFunction(plan, comparisonFunctionIdentity(operator))
            .functionAnchor,
        ] as const
    )
  );
  const conditionCombinations = new Set<DvtSubstraitJoinConditionCombination>(
    args.predicates.flatMap((predicate) =>
      predicate.conditions.flatMap(collectDvtSubstraitJoinConditionCombinations)
    )
  );
  const booleanFunctionAnchors = new Map(
    Array.from(
      conditionCombinations,
      (combination) =>
        [
          combination,
          dvtSubstraitExpression.ensureScalarFunction(plan, booleanFunctionIdentity(combination))
            .functionAnchor,
        ] as const
    )
  );
  let currentRelation = reads[0]!;
  let currentFields = inputIdentities[0]!.fields.map<JoinOriginField>((field) => ({
    inputIndex: 0,
    name: field.name,
    fieldId: field.fieldId,
    dataType: field.dataType,
    nullable: field.nullable,
  }));
  const stageOutputs: JoinOriginField[][] = [];
  for (const [predicateIndex, predicate] of args.predicates.entries()) {
    const rightInputIndex = predicateIndex + 1;
    const joinType = joinTypes[predicateIndex]!;
    const leftFields = currentFields.map<JoinOriginField>((field) => ({
      ...field,
      nullable: dvtSubstraitJoinNullExtendsLeft(joinType) ? true : field.nullable,
    }));
    const rightFields = inputIdentities[rightInputIndex]!.fields.map<JoinOriginField>((field) => ({
      inputIndex: rightInputIndex,
      name: field.name,
      fieldId: field.fieldId,
      dataType: field.dataType,
      nullable: dvtSubstraitJoinNullExtendsRight(joinType) ? true : field.nullable,
    }));
    const available = [...leftFields, ...rightFields];
    const retainedSide = dvtSubstraitJoinRetainedSide(joinType);
    const emittedFields =
      retainedSide === 'left' ? leftFields : retainedSide === 'right' ? rightFields : available;
    const selectedOutputs = args.outputs
      .filter((output) => output.source.inputIndex <= rightInputIndex)
      .map((output) => {
        const origin = requireOrigin(output.source);
        return emittedFields.find((field) => field.fieldId === origin.fieldId);
      });
    const futurePredicateFields = args.predicates
      .slice(predicateIndex + 1)
      .flatMap((future) =>
        future.conditions.flatMap((condition) =>
          collectDvtSubstraitJoinConditionComparisons(condition).flatMap((comparison) =>
            dvtSubstraitJoinConditionOperands(comparison).flatMap((operand) =>
              collectDvtSubstraitJoinOperandFields(operand).map((field) => field.locator)
            )
          )
        )
      )
      .map((locator) => {
        const origin = requireOrigin(locator);
        return emittedFields.find((field) => field.fieldId === origin.fieldId);
      })
      .filter((field) => field != null);
    const selected = [...selectedOutputs, ...futurePredicateFields].filter(
      (field, index, fields) =>
        field != null &&
        fields.findIndex((candidate) => candidate?.fieldId === field.fieldId) === index
    );
    if (
      (selected.length === 0 && predicateIndex !== args.predicates.length - 1) ||
      selectedOutputs.some((field) => field == null)
    ) {
      throw new Error('VTX2 JOIN output is unavailable at its join stage.');
    }
    const nextFields = selected.filter((field) => field != null);
    const outputMapping = nextFields.map((field) =>
      emittedFields.findIndex((candidate) => candidate.fieldId === field.fieldId)
    );
    const operandExpression = (operand: JoinBuildPredicateOperand): Expression => {
      return buildDvtSubstraitJoinOperandExpression({
        plan,
        operand,
        fieldExpression: (field) => {
          const origin = requireOrigin(field.locator);
          const ordinal = available.findIndex((candidate) => candidate.fieldId === origin.fieldId);
          if (ordinal < 0) {
            throw new Error('VTX2 JOIN condition references an unavailable source field.');
          }
          return dvtSubstraitExpression.field(ordinal);
        },
      });
    };
    const comparisonExpression = (
      condition: DvtSubstraitJoinComparisonCondition<JoinBuildPredicateOperand>
    ): Expression => {
      const functionReference = comparisonFunctionAnchors.get(condition.operator ?? 'equal');
      if (functionReference == null) {
        throw new Error('VTX2 JOIN comparison capability is unavailable.');
      }
      return dvtSubstraitExpression.scalarFunction({
        functionReference,
        arguments: dvtSubstraitJoinConditionOperands(condition).map(operandExpression),
        outputType: booleanType(!isDvtSubstraitJoinNullCondition(condition)),
      });
    };
    const expression = reduceDvtSubstraitJoinConditions({
      conditions: predicate.conditions,
      comparison: comparisonExpression,
      combine: (combination, left, right) => {
        const functionReference = booleanFunctionAnchors.get(combination);
        if (functionReference == null) {
          throw new Error('VTX2 JOIN boolean capability is unavailable.');
        }
        return dvtSubstraitExpression.scalarFunction({
          functionReference,
          arguments: [left, right],
          outputType: booleanType(),
        });
      },
    });
    currentRelation = createNInputJoinRelation({
      relAnchor: args.inputs.length + predicateIndex + 1,
      left: currentRelation,
      right: reads[rightInputIndex]!,
      expression,
      outputMapping,
      joinType: joinTypes[predicateIndex]!,
    });
    currentFields = nextFields;
    stageOutputs.push(nextFields);
  }

  plan.relations = [
    create(PlanRelSchema, {
      relType: {
        case: 'root',
        value: create(RelRootSchema, {
          input: currentRelation,
          names: args.outputs.map((output) => output.name),
        }),
      },
    }),
  ];

  const previousFinal = previous?.stages.at(-1);
  const previousIntermediate = previous?.stages.slice(0, -1) ?? [];
  const canCarryFinal =
    previous != null &&
    previous.inputs.length <= args.inputs.length &&
    samePrefix(previous, args.inputs, previous.inputs.length);
  const joinRelationIds = args.predicates.map((_, stageIndex) => {
    if (args.relationIds?.[stageIndex] != null) return args.relationIds[stageIndex]!;
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
      displayName:
        args.previousDraft?.sidecar.relations.find(
          (relation) => relation.relationId === inputIdentities[index]!.relationId
        )?.displayName ?? input.source.table,
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
}): string {
  const available =
    [
      args.sourceName,
      `${args.input.table}_${args.sourceName}`,
      `${args.input.schema}_${args.input.table}_${args.sourceName}`,
      ...(args.input.nodeId == null ? [] : [`${args.input.nodeId}_${args.sourceName}`]),
    ].find((candidate) => !args.usedNames.has(candidate)) ?? null;
  if (available != null) return available;
  const prefix = `${args.input.table}_${args.sourceName}`;
  let suffix = 2;
  while (args.usedNames.has(`${prefix}_${suffix}`)) suffix += 1;
  return `${prefix}_${suffix}`;
}

export function createDvtSubstraitStringJoinDraft(
  selection: DvtSubstraitStringJoinSelection
): DvtSubstraitJoinDraft {
  if (
    !selection.left.fields.includes(selection.leftFieldName) ||
    !selection.right.fields.includes(selection.rightFieldName)
  ) {
    throw new Error('VTX2 JOIN predicate must reference selected input fields.');
  }
  const inputs: JoinBuildInput[] = [selection.left, selection.right];
  const outputs: JoinBuildOutput[] = [];
  const usedNames = new Set<string>();
  const retainedSide = dvtSubstraitJoinRetainedSide(selection.joinType ?? JoinRel_JoinType.INNER);
  inputs.forEach((input, inputIndex) => {
    if (
      (retainedSide === 'left' && inputIndex !== 0) ||
      (retainedSide === 'right' && inputIndex !== 1)
    ) {
      return;
    }
    input.fields.forEach((field) => {
      const name = createCollisionSafeOutputName({
        input: input.source,
        sourceName: field,
        usedNames,
      });
      usedNames.add(name);
      outputs.push({ name, source: { inputIndex, fieldName: field } });
    });
  });
  return createDvtSubstraitNInputJoinDraft({
    inputs,
    joinTypes: [selection.joinType ?? JoinRel_JoinType.INNER],
    predicates: [
      {
        conditions: [
          {
            left: { kind: 'field', locator: { inputIndex: 0, fieldName: selection.leftFieldName } },
            right: {
              kind: 'field',
              locator: { inputIndex: 1, fieldName: selection.rightFieldName },
            },
          },
        ],
      },
    ],
    outputs,
  });
}

export function createDvtSubstraitJoinDraft(args: {
  left: DvtSubstraitJoinSource;
  right: DvtSubstraitJoinSource;
  targetNodeId: string;
  joinType?: DvtSubstraitJoinType;
}): DvtSubstraitJoinDraft {
  if (args.targetNodeId.length === 0 || args.targetNodeId !== args.targetNodeId.trim()) {
    throw new Error('VTX2 JOIN target node identity must be non-blank and trimmed.');
  }
  const inputs: JoinBuildInput[] = [
    { source: args.left, fields: LEFT_FIELD_NAMES },
    { source: args.right, fields: RIGHT_FIELD_NAMES },
  ];
  return createDvtSubstraitNInputJoinDraft({
    inputs,
    joinTypes: [args.joinType ?? JoinRel_JoinType.INNER],
    predicates: [
      {
        conditions: [
          {
            left: { kind: 'field', locator: { inputIndex: 0, fieldName: 'customer_id' } },
            right: { kind: 'field', locator: { inputIndex: 1, fieldName: 'customer_id' } },
          },
        ],
      },
    ],
    outputs: INNER_JOIN_OUTPUT_FIELDS.filter((field) => {
      const retainedSide = dvtSubstraitJoinRetainedSide(args.joinType ?? JoinRel_JoinType.INNER);
      return (
        retainedSide === 'both' ||
        (retainedSide === 'left' && field.locator.inputIndex === 0) ||
        (retainedSide === 'right' && field.locator.inputIndex === 1)
      );
    }).map((field) => ({
      name: field.defaultName,
      source: field.locator,
    })),
  });
}

function clonePlan(plan: Plan): Plan {
  return fromBinary(PlanSchema, toBinary(PlanSchema, plan));
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

function buildInputsFromProjection(projection: DvtSubstraitNInputJoinProjection): JoinBuildInput[] {
  return projection.inputs.map((input) => ({
    relationId: input.relationId,
    source: {
      schema: input.schema,
      table: input.table,
      sourceRef: input.sourceRef,
    },
    fields: input.fields.map((field) => field.name),
    fieldTypes: input.fields.map((field) => field.dataType),
    fieldNullabilities: input.fields.map((field) => field.nullable),
  }));
}

function buildPredicatesFromProjection(
  projection: DvtSubstraitNInputJoinProjection
): JoinBuildPredicate[] | null {
  const result: JoinBuildPredicate[] = [];
  for (const predicate of projection.joins) {
    const conditions: DvtSubstraitJoinCondition<JoinBuildPredicateOperand>[] = [];
    const convertOperand = (
      operand: DvtSubstraitJoinPredicateOperand
    ): JoinBuildPredicateOperand | null => {
      return mapDvtSubstraitJoinOperandFields(operand, (field) => {
        const locator = locatorForFieldId(projection, field.sourceFieldId);
        return locator == null ? null : { kind: 'field', locator };
      });
    };
    for (const condition of predicate.conditions) {
      const converted = mapDvtSubstraitJoinConditionOperands(condition, convertOperand);
      if (converted == null) return null;
      conditions.push(converted);
    }
    result.push({ conditions });
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

/** Retain canonical inputs without inventing predicates or changing surviving identities. */
export function retainDvtSubstraitJoinInputs(
  draft: DvtSubstraitJoinDraft,
  retained: readonly number[]
): DvtSubstraitJoinDraft | null {
  const inspection = inspectDvtSubstraitJoinProjection(draft);
  if (!inspection.ok || retained.length < 2 || new Set(retained).size !== retained.length)
    return null;
  const { projection } = inspection;
  if (
    retained.some(
      (index, offset) =>
        projection.inputs[index] == null || (offset > 0 && index <= retained[offset - 1]!)
    )
  )
    return null;
  const original = buildPredicatesFromProjection(projection);
  if (original == null) return null;
  const predicates: JoinBuildPredicate[] = [];
  for (const index of retained.slice(1)) {
    const predicate = original[index - 1];
    if (predicate == null) return null;
    const conditions = predicate.conditions.map((condition) =>
      mapDvtSubstraitJoinConditionOperands(condition, (operand) =>
        mapDvtSubstraitJoinOperandFields(operand, (field) => {
          const inputIndex = retained.indexOf(field.locator.inputIndex);
          return inputIndex < 0
            ? null
            : { kind: 'field' as const, locator: { ...field.locator, inputIndex } };
        })
      )
    );
    if (conditions.some((condition) => condition == null)) return null;
    predicates.push({ conditions: conditions.filter((condition) => condition != null) });
  }
  const inputs = buildInputsFromProjection(projection);
  return createDvtSubstraitNInputJoinDraft({
    inputs: retained.map((index) => inputs[index]!),
    predicates,
    joinTypes: retained.slice(1).map((index) => projection.joinRelations[index - 1]!.joinType),
    outputs: buildOutputsFromProjection(projection)
      .filter((output) => retained.includes(output.source.inputIndex))
      .map((output) => ({
        ...output,
        source: { ...output.source, inputIndex: retained.indexOf(output.source.inputIndex) },
      })),
    previousDraft: draft,
    relationIds: retained.slice(1).map((index) => projection.joinRelations[index - 1]!.relationId),
  });
}

function binaryFieldForLocator(locator: JoinFieldLocator) {
  return INNER_JOIN_OUTPUT_FIELDS.find((field) => sameLocator(field.locator, locator));
}

export function inspectDvtSubstraitBinaryJoinDraft(
  draft: DvtSubstraitJoinDraft
): DvtSubstraitInnerJoinInspection {
  const inspection = inspectDvtSubstraitJoinProjection(draft);
  if (!inspection.ok || !hasDvtSubstraitLegacyBinaryInnerJoinShape(inspection.projection)) {
    return { ok: false };
  }
  const { projection } = inspection;
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

export function appendDvtSubstraitJoinInput(
  draft: DvtSubstraitJoinDraft,
  input: DvtSubstraitJoinAppendInput
): DvtSubstraitJoinDraft {
  const inspection = inspectDvtSubstraitJoinProjection(draft);
  if (!inspection.ok) return draft;
  const { projection } = inspection;
  const firstInput = projection.inputs[0];
  if (
    firstInput == null ||
    !hasSameConnectionRef(
      firstInput.sourceRef.connectionRef,
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
      {
        source: input.source,
        fields: input.fields,
        fieldTypes: input.fieldTypes,
        fieldNullabilities: input.fieldNullabilities,
      },
    ];
    const newInputIndex = inputs.length - 1;
    const appendJoinType = input.joinType ?? JoinRel_JoinType.INNER;
    const retainedSide = dvtSubstraitJoinRetainedSide(appendJoinType);
    const outputs = retainedSide === 'right' ? [] : buildOutputsFromProjection(projection);
    const usedNames = new Set(outputs.map((output) => output.name));
    for (const field of retainedSide === 'left' ? [] : input.selectedFields) {
      const name = createCollisionSafeOutputName({
        input: input.source,
        sourceName: field,
        usedNames,
      });
      usedNames.add(name);
      outputs.push({ name, source: { inputIndex: newInputIndex, fieldName: field } });
    }
    return createDvtSubstraitNInputJoinDraft({
      inputs,
      joinTypes: [...projection.joinRelations.map((relation) => relation.joinType), appendJoinType],
      predicates: [
        ...existingPredicates,
        {
          conditions: [
            {
              left: { kind: 'field', locator: left },
              right: {
                kind: 'field',
                locator: { inputIndex: newInputIndex, fieldName: input.predicate.rightFieldName },
              },
            },
          ],
        },
      ],
      outputs,
      previousDraft: draft,
    });
  } catch {
    return draft;
  }
}

export function addDvtSubstraitJoinPredicateCondition(args: {
  draft: DvtSubstraitJoinDraft;
  joinRelationId: string;
  condition: DvtSubstraitJoinComparisonCondition<DvtSubstraitJoinPredicateOperand>;
  groupWithPrevious?: boolean;
}): DvtSubstraitJoinDraft {
  return editDvtSubstraitJoinPredicateConditions({
    draft: args.draft,
    joinRelationId: args.joinRelationId,
    edit: (conditions) =>
      appendDvtSubstraitJoinComparison({
        conditions,
        condition: args.condition,
        groupWithPrevious: args.groupWithPrevious,
      }),
  });
}

/** Change one canonical JOIN stage without changing its operands, predicate, outputs, or identities. */
export function setDvtSubstraitJoinType(args: {
  draft: DvtSubstraitJoinDraft;
  joinRelationId: string;
  joinType: DvtSubstraitJoinType;
}): DvtSubstraitJoinDraft {
  const context = inspectDvtSubstraitJoinPredicateContext(args.draft);
  if (context == null || !context.inspection.ok) return args.draft;
  const { inspection, baseDraft } = context;
  const { projection } = inspection;
  const stageIndex = projection.joinRelations.findIndex(
    (relation) => relation.relationId === args.joinRelationId
  );
  if (stageIndex < 0 || projection.joinRelations[stageIndex]?.joinType === args.joinType) {
    return args.draft;
  }
  const predicates = buildPredicatesFromProjection(projection);
  if (predicates == null) return args.draft;
  try {
    const edited = createDvtSubstraitNInputJoinDraft({
      inputs: buildInputsFromProjection(projection),
      predicates,
      joinTypes: projection.joinRelations.map((relation, index) =>
        index === stageIndex ? args.joinType : relation.joinType
      ),
      outputs: buildOutputsFromProjection(projection),
      previousDraft: baseDraft,
    });
    return inspectDvtSubstraitJoinProjection(edited).ok
      ? restoreDvtSubstraitJoinContext(args.draft, baseDraft, edited)
      : args.draft;
  } catch {
    return args.draft;
  }
}

function editDvtSubstraitJoinPredicateConditions(args: {
  draft: DvtSubstraitJoinDraft;
  joinRelationId: string;
  edit: (
    conditions: readonly DvtSubstraitJoinPredicateCondition[]
  ) => readonly DvtSubstraitJoinPredicateCondition[] | null;
}): DvtSubstraitJoinDraft {
  const context = inspectDvtSubstraitJoinPredicateContext(args.draft);
  if (context == null || !context.inspection.ok) return args.draft;
  const { inspection, baseDraft } = context;
  const { projection } = inspection;
  const stageIndex = projection.joinRelations.findIndex(
    (relation) => relation.relationId === args.joinRelationId
  );
  const predicate = projection.joins[stageIndex];
  if (stageIndex < 0 || predicate == null) return args.draft;
  const conditions = args.edit(predicate.conditions);
  if (conditions == null || conditions.length === 0) return args.draft;
  const joins = projection.joins.map((current, index) =>
    index === stageIndex ? { conditions } : current
  );
  const predicates = buildPredicatesFromProjection({ ...projection, joins });
  if (predicates == null) return args.draft;
  try {
    const edited = createDvtSubstraitNInputJoinDraft({
      inputs: buildInputsFromProjection(projection),
      predicates,
      joinTypes: projection.joinRelations.map((relation) => relation.joinType),
      outputs: buildOutputsFromProjection(projection),
      previousDraft: baseDraft,
    });
    return inspectDvtSubstraitJoinProjection(edited).ok
      ? restoreDvtSubstraitJoinContext(args.draft, baseDraft, edited)
      : args.draft;
  } catch {
    return args.draft;
  }
}

/** Resolve predicate ownership without making the Model's root its editing identity. */
export function inspectDvtSubstraitJoinPredicateContext(draft: DvtSubstraitJoinDraft) {
  const window = inspectValidInnerJoinGroupedWindow(draft);
  const grouped = window?.baseDraft ?? draft;
  const baseDraft = inspectValidInnerJoinGrouping(grouped)?.baseDraft ?? grouped;
  const inspection = inspectDvtSubstraitJoinProjection(baseDraft);
  return inspection.ok ? { baseDraft, inspection } : null;
}

export function restoreDvtSubstraitJoinContext(
  original: DvtSubstraitJoinDraft,
  baseDraft: DvtSubstraitJoinDraft,
  edited: DvtSubstraitJoinDraft
): DvtSubstraitJoinDraft {
  if (baseDraft === original) return edited;
  const window = inspectValidInnerJoinGroupedWindow(original);
  const grouping = inspectValidInnerJoinGrouping(window?.baseDraft ?? original);
  const inspection = inspectDvtSubstraitJoinProjection(edited);
  if (grouping == null || !inspection.ok) return original;
  const groupField = inspection.projection.outputs.find(
    (field) => field.fieldId === grouping.projection.groupField.fieldId
  );
  const joinBinding = innerJoinResultBinding(edited);
  if (groupField == null || joinBinding == null) return original;
  const plan = clonePlan(original.plan);
  const root = plan.relations[0]?.relType;
  const editedRoot = edited.plan.relations[0]?.relType;
  if (root?.case !== 'root' || editedRoot?.case !== 'root' || editedRoot.value.input == null)
    return original;
  // The rebuilt predicate owns its extension anchors. Rebind the retained wrappers
  // to those anchors; never regenerate their relation/field identities.
  const editedPlan = clonePlan(edited.plan);
  plan.extensions = editedPlan.extensions;
  plan.extensionUrns = editedPlan.extensionUrns;
  let relation = root.value.input;
  if (relation?.relType.case === 'project') {
    for (const expression of relation.relType.value.expressions) {
      if (expression.rexType.case === 'windowFunction')
        expression.rexType.value.functionReference = ensureDvtSubstraitRowNumberFunction(plan);
    }
    relation = relation.relType.value.input;
  }
  if (relation?.relType.case !== 'aggregate') return original;
  const measure = relation.relType.value.measures[0]?.measure;
  if (measure == null) return original;
  measure.functionReference = ensureDvtSubstraitCountFunction(plan);
  relation.relType.value.groupingExpressions = [
    createDvtSubstraitFieldReference(groupField.outputOrdinal),
  ];
  relation.relType.value.input = editedRoot.value.input;
  const baseIds = new Set(baseDraft.sidecar.relations.map((binding) => binding.relationId));
  const wrappers = original.sidecar.relations.filter((binding) => !baseIds.has(binding.relationId));
  const wrapperIds = new Set(wrappers.map((binding) => binding.relationId));
  const wrapperFields = original.sidecar.fields.filter((field) => wrapperIds.has(field.relationId));
  const wrapperFieldIds = new Set(wrapperFields.map((field) => field.fieldId));
  const fields = new Map(
    [
      ...edited.sidecar.fields.filter((field) => !wrapperFieldIds.has(field.fieldId)),
      ...wrapperFields,
    ].map((field) => [field.fieldId, field])
  );
  const next = {
    plan,
    sidecar: {
      ...original.sidecar,
      semanticPlanSha256: ZERO_SHA256,
      relations: [
        ...edited.sidecar.relations,
        ...wrappers.map((binding) => ({ ...binding, displayName: joinBinding.displayName })),
      ],
      fields: original.sidecar.fields.flatMap((field) => {
        const retained = fields.get(field.fieldId);
        return retained == null ? [] : [retained];
      }),
    },
  };
  return inspectDvtSubstraitJoinAcceptedDraft(next).ok ? next : original;
}

const projectedJoinOperandKey = (operand: DvtSubstraitJoinPredicateOperand) =>
  dvtSubstraitJoinOperandKey(operand, (field) => field.sourceFieldId);

export function updateDvtSubstraitJoinPredicateCondition(args: {
  draft: DvtSubstraitJoinDraft;
  joinRelationId: string;
  conditionKey: string;
  condition: DvtSubstraitJoinComparisonCondition<DvtSubstraitJoinPredicateOperand>;
}): DvtSubstraitJoinDraft {
  return editDvtSubstraitJoinPredicateConditions({
    draft: args.draft,
    joinRelationId: args.joinRelationId,
    edit: (conditions) =>
      updateDvtSubstraitJoinComparison({
        conditions,
        conditionKey: args.conditionKey,
        condition: args.condition,
        operandKey: projectedJoinOperandKey,
      }),
  });
}

export function removeDvtSubstraitJoinPredicateCondition(args: {
  draft: DvtSubstraitJoinDraft;
  joinRelationId: string;
  conditionKey: string;
}): DvtSubstraitJoinDraft {
  return editDvtSubstraitJoinPredicateConditions({
    draft: args.draft,
    joinRelationId: args.joinRelationId,
    edit: (conditions) =>
      removeDvtSubstraitJoinComparison({
        conditions,
        conditionKey: args.conditionKey,
        operandKey: projectedJoinOperandKey,
      }),
  });
}

export function applyDvtSubstraitInnerJoinFieldEdit(
  draft: DvtSubstraitJoinDraft,
  edit: DvtSubstraitInnerJoinFieldEdit
): DvtSubstraitJoinDraft {
  const nInputInspection = inspectDvtSubstraitJoinProjection(draft);
  const binaryInspection = inspectDvtSubstraitBinaryJoinDraft(draft);
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
      const name = edit.outputName;
      if (
        current == null ||
        name.length === 0 ||
        !PostgresIdentifierV1Schema.safeParse(name).success ||
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
        joinTypes: projection.joinRelations.map((relation) => relation.joinType),
        outputs,
        previousDraft: draft,
      });
      const next = inspectDvtSubstraitJoinProjection(edited);
      return next.ok ? edited : draft;
    } catch {
      return draft;
    }
  }

  if (
    !binaryInspection.ok ||
    !nInputInspection.ok ||
    !('fieldKey' in edit) ||
    edit.fieldKey == null
  ) {
    return draft;
  }
  const projection = nInputInspection.projection;
  let outputs: JoinBuildOutput[] = binaryInspection.projection.outputs.map((output) => {
    const field = INNER_JOIN_OUTPUT_FIELDS.find(
      (candidate) => candidate.fieldKey === output.fieldKey
    )!;
    return { name: output.name, fieldId: output.fieldId, source: field.locator };
  });
  const field = INNER_JOIN_OUTPUT_FIELDS.find((candidate) => candidate.fieldKey === edit.fieldKey);
  if (field == null) return draft;
  const currentIndex = outputs.findIndex((output) => sameLocator(output.source, field.locator));
  if (edit.kind === 'set-selected') {
    if (edit.selected === currentIndex >= 0) return draft;
    if (!edit.selected) {
      outputs = outputs.filter((output) => !sameLocator(output.source, field.locator));
    } else {
      outputs.push({ name: field.defaultName, source: field.locator });
    }
  } else if (edit.kind === 'rename') {
    const current = outputs[currentIndex];
    const name = edit.outputName;
    if (
      current == null ||
      name.length === 0 ||
      !PostgresIdentifierV1Schema.safeParse(name).success ||
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
      joinTypes: projection.joinRelations.map((relation) => relation.joinType),
      outputs,
      previousDraft: draft,
    });
    return inspectDvtSubstraitBinaryJoinDraft(edited).ok ? edited : draft;
  } catch {
    return draft;
  }
}

export function setDvtSubstraitJoinConnectionFieldSelected(args: {
  draft: DvtSubstraitJoinDraft;
  sourceNode: CanonicalNode;
  targetNode: CanonicalNode;
  edge: CanonicalEdge;
  columnName: string;
  selected: boolean;
}): DvtSubstraitJoinDraft {
  if (
    args.edge.sourceId !== args.sourceNode.id ||
    args.edge.targetId !== args.targetNode.id ||
    args.targetNode.pluginId !== 'dvt' ||
    args.targetNode.kind !== 'dvt:transform' ||
    args.targetNode.role !== 'transform'
  ) {
    return args.draft;
  }
  const sourceRef = ConnectedSourceRefSchema.safeParse(
    args.sourceNode.metadata?.connectedSourceRef
  );
  const inspection = inspectDvtSubstraitJoinProjection(args.draft);
  if (!sourceRef.success || !inspection.ok) return args.draft;
  const matching = inspection.projection.inputs.filter((input) =>
    hasSameConnectedSourceRef(input.sourceRef, sourceRef.data)
  );
  if (matching.length !== 1) return args.draft;
  const inputIndex = inspection.projection.inputs.indexOf(matching[0]!);
  const field = inspection.projection.inputs[inputIndex]?.fields.find(
    (candidate) => candidate.name === args.columnName
  );
  if (inputIndex < 0 || field == null) return args.draft;

  const binaryInspection = inspectDvtSubstraitBinaryJoinDraft(args.draft);
  if (binaryInspection.ok && inspection.projection.inputs.length === 2) {
    const configuredField = INNER_JOIN_OUTPUT_FIELDS.find(
      (candidate) =>
        candidate.locator.inputIndex === inputIndex &&
        candidate.locator.fieldName === args.columnName
    );
    return configuredField == null
      ? args.draft
      : applyDvtSubstraitInnerJoinFieldEdit(args.draft, {
          kind: 'set-selected',
          fieldKey: configuredField.fieldKey,
          selected: args.selected,
        });
  }

  return applyDvtSubstraitInnerJoinFieldEdit(args.draft, {
    kind: 'set-selected',
    sourceFieldId: field.fieldId,
    selected: args.selected,
  });
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
    return aggregate?.relType.case === 'aggregate' &&
      aggregate.relType.value.input?.relType.case === 'join'
      ? aggregate.relType.value.input
      : null;
  }
  return null;
}

function innerJoinResultBinding(
  draft: DvtSubstraitJoinDraft
): DvtSubstraitAuthoringSidecarV1['relations'][number] | null {
  const join = baseJoinRel(draft.plan);
  const relAnchor =
    join?.relType.case === 'join' ? join.relType.value.common?.relAnchor : undefined;
  if (relAnchor == null) return null;
  const bindings = draft.sidecar.relations.filter(
    (relation) => relation.relAnchor === relAnchor && relation.sourceRef == null
  );
  return bindings.length === 1 ? bindings[0]! : null;
}

type ValidInnerJoinGrouping = Readonly<{
  baseDraft: DvtSubstraitJoinDraft;
  projection: DvtSubstraitInnerJoinGroupingProjection;
}>;

function inspectValidInnerJoinGrouping(
  draft: DvtSubstraitJoinDraft
): ValidInnerJoinGrouping | null {
  if (
    !hasPinnedPlanVersion(draft.plan) ||
    draft.plan.relations.length !== 1 ||
    draft.sidecar.schemaVersion !== DVT_SUBSTRAIT_AUTHORING_SIDECAR_SCHEMA_VERSION ||
    !hasUniqueJoinSidecarIdentity(draft) ||
    !hasCurrentJoinSemanticHash(draft)
  ) {
    return null;
  }
  const root = draft.plan.relations[0]?.relType;
  if (
    root?.case !== 'root' ||
    root.value.names.length !== 2 ||
    root.value.names.some((name) => name.length === 0) ||
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
  const baseDraft: DvtSubstraitJoinDraft = {
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
  const nInputBase = inspectDvtSubstraitJoinProjection(baseDraft);
  const binaryBase = inspectDvtSubstraitBinaryJoinDraft(baseDraft);
  const base =
    nInputBase.ok && (nInputBase.projection.inputs.length > 2 || !binaryBase.ok)
      ? nInputBase
      : binaryBase;
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
      {
        name: groupName,
        fieldId: groupField.fieldId,
        dataType: 'string' as const,
        outputOrdinal: 0,
      },
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
  draft: DvtSubstraitJoinDraft
): DvtSubstraitInnerJoinGroupingInspection {
  const valid = inspectValidInnerJoinGrouping(draft);
  return valid == null ? { ok: false } : { ok: true, projection: valid.projection };
}

export function applyDvtSubstraitInnerJoinGrouping(
  draft: DvtSubstraitJoinDraft,
  args: Readonly<{ groupFieldId: string; countOutputName: string }>
): DvtSubstraitJoinDraft {
  const nInput = inspectDvtSubstraitJoinProjection(draft);
  const binary = inspectDvtSubstraitBinaryJoinDraft(draft);
  const inspection =
    nInput.ok && (nInput.projection.inputs.length > 2 || !binary.ok) ? nInput : binary;
  const countOutputName = args.countOutputName;
  if (!inspection.ok || !PostgresIdentifierV1Schema.safeParse(countOutputName).success)
    return draft;
  const groupField = inspection.projection.outputs.find(
    (output) => output.fieldId === args.groupFieldId
  );
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
  draft: DvtSubstraitJoinDraft,
  outputName: string
): DvtSubstraitJoinDraft {
  const valid = inspectValidInnerJoinGrouping(draft);
  const normalized = outputName;
  if (
    valid == null ||
    !PostgresIdentifierV1Schema.safeParse(normalized).success ||
    normalized === valid.projection.groupField.name
  ) {
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
  draft: DvtSubstraitJoinDraft
): DvtSubstraitJoinDraft {
  return inspectValidInnerJoinGrouping(draft)?.baseDraft ?? draft;
}

type ValidInnerJoinGroupedWindow = Readonly<{
  baseDraft: DvtSubstraitJoinDraft;
  projection: DvtSubstraitInnerJoinGroupedWindowProjection;
}>;

function inspectValidInnerJoinGroupedWindow(
  draft: DvtSubstraitJoinDraft
): ValidInnerJoinGroupedWindow | null {
  if (
    !hasPinnedPlanVersion(draft.plan) ||
    draft.plan.relations.length !== 1 ||
    draft.sidecar.schemaVersion !== DVT_SUBSTRAIT_AUTHORING_SIDECAR_SCHEMA_VERSION ||
    !hasUniqueJoinSidecarIdentity(draft) ||
    !hasCurrentJoinSemanticHash(draft)
  ) {
    return null;
  }
  const root = draft.plan.relations[0]?.relType;
  if (
    root?.case !== 'root' ||
    root.value.names.length !== 3 ||
    root.value.names.some((name) => name.length === 0) ||
    new Set(root.value.names).size !== 3 ||
    root.value.input?.relType.case !== 'project'
  ) {
    return null;
  }
  const project = root.value.input.relType.value;
  const aggregate =
    project.input?.relType.case === 'aggregate' ? project.input.relType.value : null;
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
        field.outputOrdinal !== outputOrdinal ||
        field.displayName !== root.value.names[outputOrdinal]
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
  const baseDraft: DvtSubstraitJoinDraft = {
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
      nullable: false as const,
    },
    outputs: [
      {
        name: root.value.names[0]!,
        fieldId: groupField.fieldId,
        dataType: 'string' as const,
        outputOrdinal: 0,
      },
      {
        name: root.value.names[1]!,
        fieldId: measureField.fieldId,
        dataType: 'i64' as const,
        outputOrdinal: 1,
      },
      {
        name: root.value.names[2]!,
        fieldId: resultField.fieldId,
        dataType: 'i64' as const,
        outputOrdinal: 2,
        nullable: false as const,
      },
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
  draft: DvtSubstraitJoinDraft
): DvtSubstraitInnerJoinGroupedWindowInspection {
  const valid = inspectValidInnerJoinGroupedWindow(draft);
  return valid == null ? { ok: false } : { ok: true, projection: valid.projection };
}

export function applyDvtSubstraitInnerJoinGroupedRowNumber(
  draft: DvtSubstraitJoinDraft,
  args: Readonly<{ outputName: string }>
): DvtSubstraitJoinDraft {
  const grouping = inspectDvtSubstraitInnerJoinGroupingDraft(draft);
  const outputName = args.outputName;
  if (
    !grouping.ok ||
    !PostgresIdentifierV1Schema.safeParse(outputName).success ||
    grouping.projection.outputs.some((output) => output.name === outputName)
  ) {
    return draft;
  }
  const joinBinding = innerJoinResultBinding(draft);
  const plan = clonePlan(draft.plan);
  const root = plan.relations[0]?.relType;
  if (
    joinBinding == null ||
    root?.case !== 'root' ||
    root.value.input?.relType.case !== 'aggregate'
  ) {
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
  draft: DvtSubstraitJoinDraft,
  outputName: string
): DvtSubstraitJoinDraft {
  const valid = inspectValidInnerJoinGroupedWindow(draft);
  const normalized = outputName;
  if (
    valid == null ||
    !PostgresIdentifierV1Schema.safeParse(normalized).success ||
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
  draft: DvtSubstraitJoinDraft
): DvtSubstraitJoinDraft {
  return inspectValidInnerJoinGroupedWindow(draft)?.baseDraft ?? draft;
}

export function inspectDvtSubstraitJoinAcceptedDraft(draft: DvtSubstraitJoinDraft):
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
  const binary = inspectDvtSubstraitBinaryJoinDraft(draft);
  if (binary.ok) return binary;
  return inspectDvtSubstraitJoinProjection(draft);
}

export function decodeDvtSubstraitJoinDocument(input: unknown): DvtSubstraitJoinDraft {
  const document = canonicalizeDvtSubstraitSemanticDocumentV1(input);
  const plan = fromBinary(PlanSchema, base64Bytes(document.semanticPlan.bytesBase64));
  if (!hasPinnedPlanVersion(plan)) {
    throw new Error('Substrait Plan does not match the pinned DVT profile.');
  }
  return { plan, sidecar: document.sidecar };
}

export function encodeDvtSubstraitJoinDocument(
  draft: DvtSubstraitJoinDraft
): DvtSubstraitSemanticDocumentV1 {
  if (!inspectDvtSubstraitJoinAcceptedDraft(draft).ok) {
    throw new Error('Unsupported VTX2 JOIN Substrait shape.');
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
