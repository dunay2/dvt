/** Owned concern: build and inspect only the first two-source INNER JOIN shape admitted by #2634. */
import { create, fromBinary, toBinary } from '@bufbuild/protobuf';
import {
  ExpressionSchema,
  Expression_FieldReferenceSchema,
  Expression_FieldReference_RootReferenceSchema,
  Expression_ReferenceSegmentSchema,
  Expression_ReferenceSegment_StructFieldSchema,
  Expression_ScalarFunctionSchema,
  FunctionArgumentSchema,
  JoinRelSchema,
  JoinRel_JoinType,
  ReadRelSchema,
  ReadRel_NamedTableSchema,
  RelCommonSchema,
  RelCommon_EmitSchema,
  RelRootSchema,
  RelSchema,
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
  buildDvtSubstraitStandardCapabilityId,
  canonicalizeDvtSubstraitSemanticDocumentV1,
  type ConnectedSourceRef,
  type DvtSubstraitAuthoringSidecarV1,
  type DvtSubstraitSemanticDocumentV1,
} from '@dvt/contracts';

const ZERO_SHA256 = '0'.repeat(64);
const COMPARISON_FUNCTION_URN = 'extension:io.substrait:functions_comparison';
const EQUAL_FUNCTION_NAME = 'equal';
const LEFT_FIELD_NAMES = ['customer_id', 'name'] as const;
const RIGHT_FIELD_NAMES = ['order_id', 'customer_id'] as const;
const OUTPUT_FIELD_NAMES = ['customer_id', 'name', 'order_id'] as const;

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
  outputs: readonly Readonly<{ name: string; fieldId: string; outputOrdinal: number }>[];
}>;

export type DvtSubstraitInnerJoinInspection =
  | Readonly<{ ok: true; projection: DvtSubstraitInnerJoinProjection }>
  | Readonly<{ ok: false }>;

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

function assertCompatibleSources(left: DvtSubstraitJoinSource, right: DvtSubstraitJoinSource): void {
  const leftConnection = left.sourceRef.connectionRef;
  const rightConnection = right.sourceRef.connectionRef;
  if (
    leftConnection.provider !== 'postgres' ||
    rightConnection.provider !== 'postgres' ||
    leftConnection.connectionId !== rightConnection.connectionId
  ) {
    throw new Error('VTX2 INNER JOIN requires two PostgreSQL sources on the same connection.');
  }
  for (const value of [left.nodeId, left.schema, left.table, right.nodeId, right.schema, right.table]) {
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

function directStructFieldOrdinal(expression: ReturnType<typeof fieldReference>): number | null {
  if (expression.rexType.case !== 'selection') return null;
  const selection = expression.rexType.value;
  if (selection.rootType.case !== 'rootReference') return null;
  if (selection.referenceType.case !== 'directReference') return null;
  const segment = selection.referenceType.value.referenceType;
  if (segment.case !== 'structField' || segment.value.child != null) return null;
  return segment.value.field;
}

function tableIdentity(rel: Rel): { schema: string; table: string } | null {
  if (rel.relType.case !== 'read') return null;
  const read = rel.relType.value;
  if (read.common?.emitKind.case !== undefined || read.common?.hint != null) return null;
  if (read.common?.advancedExtension != null || read.advancedExtension != null) return null;
  if (read.filter != null || read.bestEffortFilter != null || read.projection != null) return null;
  if (read.readType.case !== 'namedTable' || read.readType.value.advancedExtension != null) return null;
  if (read.baseSchema?.names.length !== 2) return null;
  if (read.baseSchema.struct?.types.length !== 2) return null;
  if (!read.baseSchema.struct.types.every((type) => type.kind.case === 'string')) return null;
  const names = read.readType.value.names;
  return names.length === 2 && names[0] != null && names[1] != null
    ? { schema: names[0], table: names[1] }
    : null;
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

export function inspectDvtSubstraitInnerJoinDraft(
  draft: DvtSubstraitInnerJoinDraft
): DvtSubstraitInnerJoinInspection {
  const { plan, sidecar } = draft;
  if (!hasPinnedPlanVersion(plan) || plan.relations.length !== 1) return { ok: false };
  const rootRelation = plan.relations[0]?.relType;
  if (rootRelation?.case !== 'root') return { ok: false };
  if (rootRelation.value.names.join(',') !== OUTPUT_FIELD_NAMES.join(',')) return { ok: false };
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
  if (join.common.emitKind.value.outputMapping.join(',') !== '0,1,2') return { ok: false };
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
  const urn = plan.extensionUrns.find(
    (entry) => entry.extensionUrnAnchor === declaration.mappingType.value.extensionUrnReference
  )?.urn;
  if (urn !== COMPARISON_FUNCTION_URN || declaration.mappingType.value.name !== EQUAL_FUNCTION_NAME) {
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
  if (leftSourceRef == null || rightSourceRef == null || resultBinding == null) return { ok: false };
  if (
    leftSourceRef.connectionRef.provider !== 'postgres' ||
    rightSourceRef.connectionRef.provider !== 'postgres' ||
    leftSourceRef.connectionRef.connectionId !== rightSourceRef.connectionRef.connectionId
  ) {
    return { ok: false };
  }
  const outputs = OUTPUT_FIELD_NAMES.map((name, outputOrdinal) => {
    const binding = sidecar.fields.find(
      (field) => field.relationId === resultBinding.relationId && field.outputOrdinal === outputOrdinal
    );
    return binding == null || binding.displayName !== name
      ? null
      : { name, fieldId: binding.fieldId, outputOrdinal };
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
  const inspection = inspectDvtSubstraitInnerJoinDraft(draft);
  if (!inspection.ok) throw new Error('Unsupported VTX2 INNER JOIN Substrait shape.');
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
