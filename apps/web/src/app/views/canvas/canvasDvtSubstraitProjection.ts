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
  TypeSchema,
  Type_Nullability,
  Type_StringSchema,
} from '@buf/substrait_substrait.bufbuild_es/substrait/type_pb.js';
import { base64Bytes, sha256Hex } from '@dvt/crypto';
import {
  ConnectedSourceRefSchema,
  DVT_SUBSTRAIT_AUTHORING_SIDECAR_SCHEMA_VERSION,
  DVT_SUBSTRAIT_CAPABILITY_CATALOG_V1,
  DVT_SUBSTRAIT_PLAN_ENCODING,
  DVT_SUBSTRAIT_PROFILE_REF_V1,
  DVT_SUBSTRAIT_SEMANTIC_DOCUMENT_SCHEMA_VERSION,
  canonicalizeDvtSubstraitSemanticDocumentV1,
  type ConnectedSourceRef,
  type DvtSubstraitAuthoringSidecarV1,
  type DvtSubstraitFieldBindingV1,
  type DvtSubstraitSemanticDocumentV1,
} from '@dvt/contracts';

import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';

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

export type DvtSubstraitProjectionOutput = Readonly<{
  fieldId: string;
  name: string;
  sourceFieldId: string;
  sourceFieldName: string;
  dataType: string;
  outputOrdinal: number;
  operations?: readonly string[];
}>;

export type DvtSubstraitColumnFunction = Readonly<{
  capabilityId: string;
  name: string;
  category: 'text';
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

export type DvtSubstraitProjectionInspection =
  Readonly<{ ok: true; projection: DvtSubstraitProjection }> | Readonly<{ ok: false }>;

export function resolveDvtSubstraitColumnFunctions(args: {
  dataType: string;
  provider: string;
}): readonly DvtSubstraitColumnFunction[] {
  const normalizedType = args.dataType.trim().toLowerCase().replaceAll(/\s+/g, ' ');
  const stringTypes = new Set([
    'text',
    'string',
    'varchar',
    'character varying',
    'char',
    'character',
    'bpchar',
  ]);
  if (args.provider !== 'postgres' || !stringTypes.has(normalizedType)) return [];

  return DVT_SUBSTRAIT_CAPABILITY_CATALOG_V1.entries.flatMap((entry) =>
    entry.kind === 'standard' &&
    entry.category === 'scalar-function' &&
    entry.profileStatus === 'supported-profile' &&
    entry.identity.sourceKind === 'simple-extension' &&
    entry.identity.urn === 'extension:io.substrait:functions_string'
      ? [{ capabilityId: entry.entryId, name: entry.identity.name, category: 'text' as const }]
      : []
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

function sourceRelationId(nodeId: string): string {
  return `relation:${nodeId}`;
}

function projectRelationId(nodeId: string): string {
  return `relation:${nodeId}:project`;
}

function sourceFieldId(nodeId: string, fieldName: string): string {
  return `field:${nodeId}:${fieldName}`;
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
    read.baseSchema == null &&
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

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
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

  const read = create(RelSchema, {
    relType: {
      case: 'read',
      value: create(ReadRelSchema, {
        common: create(RelCommonSchema, { relAnchor: 1 }),
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
  const sourceId = sourceRelationId(args.source.nodeId);
  const targetId = projectRelationId(args.targetNodeId);
  const sidecar: DvtSubstraitAuthoringSidecarV1 = {
    schemaVersion: DVT_SUBSTRAIT_AUTHORING_SIDECAR_SCHEMA_VERSION,
    semanticPlanSha256: ZERO_SHA256,
    relations: [
      {
        relationId: sourceId,
        relAnchor: 1,
        sourceRef: args.source.sourceRef,
        displayName: args.source.table,
      },
      { relationId: targetId, relAnchor: 2, displayName: args.targetNodeId },
    ],
    fields: [
      ...args.source.fields.map((field, outputOrdinal) => ({
        fieldId: sourceFieldId(args.source.nodeId, field.name),
        relationId: sourceId,
        outputOrdinal,
        displayName: field.name,
      })),
      ...args.outputs.map((output, outputOrdinal) => ({
        fieldId: output.fieldId,
        relationId: targetId,
        outputOrdinal,
        displayName: output.name,
      })),
    ],
  };
  return { plan, sidecar };
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
  const sourceBinding = draft.sidecar.relations.find(
    (relation) => relation.relAnchor === readAnchor
  );
  const targetBinding = draft.sidecar.relations.find(
    (relation) => relation.relAnchor === projectAnchor
  );
  if (
    draft.sidecar.relations.length !== 2 ||
    sourceBinding?.sourceRef == null ||
    sourceBinding.sourceRef.connectionRef.provider !== 'postgres' ||
    targetBinding == null ||
    targetBinding.sourceRef != null ||
    !sourceBinding.relationId.startsWith('relation:') ||
    !targetBinding.relationId.startsWith('relation:') ||
    !targetBinding.relationId.endsWith(':project')
  ) {
    return { ok: false };
  }
  const sourceNodeId = sourceBinding.relationId.slice('relation:'.length);
  const targetNodeId = targetBinding.relationId.slice('relation:'.length, -':project'.length);
  if (sourceNodeId.length === 0 || targetNodeId.length === 0) return { ok: false };
  const sourceFields = sortedRelationFields(draft.sidecar, sourceBinding.relationId);
  const targetFields = sortedRelationFields(draft.sidecar, targetBinding.relationId);
  const mappings = project.common?.emitKind;
  if (
    mappings?.case !== 'emit' ||
    sourceFields.length === 0 ||
    targetFields.length !== rootRelation.value.names.length ||
    mappings.value.outputMapping.length !== targetFields.length ||
    sourceFields.some(
      (field, ordinal) =>
        field.outputOrdinal !== ordinal ||
        field.displayName == null ||
        field.fieldId !== sourceFieldId(sourceNodeId, field.displayName)
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
  const inspectExpression = (
    expression: (typeof project.expressions)[number]
  ): Readonly<{ sourceOrdinal: number; operations: readonly string[] }> | null => {
    const outerToInner: string[] = [];
    let current = expression;
    while (current.rexType.case === 'scalarFunction') {
      const scalarFunction = current.rexType.value;
      const declaration = draft.plan.extensions.find(
        (entry) =>
          entry.mappingType.case === 'extensionFunction' &&
          entry.mappingType.value.functionAnchor === scalarFunction.functionReference
      );
      if (declaration?.mappingType.case !== 'extensionFunction') return null;
      const declarationValue = declaration.mappingType.value;
      if (declarationValue == null) return null;
      const urn = draft.plan.extensionUrns.find(
        (entry) => entry.extensionUrnAnchor === declarationValue.extensionUrnReference
      )?.urn;
      const functionName = declarationValue.name.endsWith(':str')
        ? declarationValue.name.slice(0, -':str'.length)
        : null;
      const capability =
        functionName == null
          ? null
          : resolveDvtSubstraitColumnFunctions({ dataType: 'text', provider: 'postgres' }).find(
              (entry) => entry.name === functionName
            );
      const argument = scalarFunction.arguments[0]?.argType;
      const outputType = scalarFunction.outputType?.kind;
      if (
        capability == null ||
        urn !== 'extension:io.substrait:functions_string' ||
        scalarFunction.arguments.length !== 1 ||
        argument?.case !== 'value' ||
        scalarFunction.options.length !== 0 ||
        outputType?.case !== 'string' ||
        outputType.value.typeVariationReference !== 0 ||
        outputType.value.nullability !== Type_Nullability.NULLABLE
      ) {
        return null;
      }
      usedFunctionAnchors.add(scalarFunction.functionReference);
      outerToInner.push(capability.name);
      current = argument.value;
    }
    if (current.rexType.case !== 'selection') return null;
    const fieldReference = current.rexType.value;
    const segment =
      fieldReference.referenceType.case === 'directReference'
        ? fieldReference.referenceType.value.referenceType
        : undefined;
    if (
      fieldReference.rootType.case !== 'rootReference' ||
      segment?.case !== 'structField' ||
      segment.value.child != null ||
      segment.value.field < 0 ||
      segment.value.field >= sourceFields.length
    ) {
      return null;
    }
    return { sourceOrdinal: segment.value.field, operations: outerToInner.reverse() };
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
      resolvedExpression == null ? undefined : sourceFields[resolvedExpression.sourceOrdinal];
    const targetField = targetFields[outputOrdinal];
    if (
      resolvedExpression == null ||
      sourceField == null ||
      targetField == null ||
      sourceField.displayName == null
    ) {
      return null;
    }
    return {
      fieldId: targetField.fieldId,
      name: targetField.displayName ?? rootRelation.value.names[outputOrdinal]!,
      sourceFieldId: sourceField.fieldId,
      sourceFieldName: sourceField.displayName,
      dataType: 'unknown',
      outputOrdinal,
      ...(resolvedExpression.operations.length > 0
        ? { operations: resolvedExpression.operations }
        : {}),
    };
  });
  const declaredFunctionAnchors = draft.plan.extensions.flatMap((entry) =>
    entry.mappingType.case === 'extensionFunction' ? [entry.mappingType.value.functionAnchor] : []
  );
  if (
    outputs.some((output) => output == null) ||
    usedExpressionOrdinals.size !== project.expressions.length ||
    draft.plan.extensions.length !== declaredFunctionAnchors.length ||
    new Set(declaredFunctionAnchors).size !== declaredFunctionAnchors.length ||
    declaredFunctionAnchors.some((anchor) => !usedFunctionAnchors.has(anchor)) ||
    usedFunctionAnchors.size !== declaredFunctionAnchors.length ||
    (usedFunctionAnchors.size === 0
      ? draft.plan.extensionUrns.length !== 0
      : draft.plan.extensionUrns.length !== 1 ||
        draft.plan.extensionUrns[0]?.urn !== 'extension:io.substrait:functions_string')
  ) {
    return { ok: false };
  }

  return {
    ok: true,
    projection: {
      targetNodeId,
      source: {
        nodeId: sourceNodeId,
        schema,
        table,
        sourceRef: sourceBinding.sourceRef,
        fields: sourceFields.map((field) => ({
          name: field.displayName!,
          dataType: 'unknown',
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
    inputFieldId?: string;
    capabilityId: string;
    alias: string;
    dataType: string;
    provider: string;
  }
): DvtSubstraitProjectionDraft {
  const inspection = inspectDvtSubstraitProjectionDraft(draft);
  const alias = args.alias.trim();
  const capability = resolveDvtSubstraitColumnFunctions({
    dataType: args.dataType,
    provider: args.provider,
  }).find((entry) => entry.capabilityId === args.capabilityId);
  const output = inspection.ok
    ? inspection.projection.outputs.find((candidate) => candidate.fieldId === args.fieldId)
    : undefined;
  const inputOutput = inspection.ok
    ? args.inputFieldId == null
      ? output
      : inspection.projection.outputs.find((candidate) => candidate.fieldId === args.inputFieldId)
    : undefined;
  const aliasShadowsAnotherSourceField = inspection.ok
    ? inspection.projection.source.fields.some(
        (field) => field.name === alias && field.name !== output?.sourceFieldName
      )
    : false;
  if (
    !inspection.ok ||
    capability == null ||
    alias.length === 0 ||
    output == null ||
    inputOutput == null ||
    inspection.projection.outputs.some(
      (candidate) => candidate.fieldId !== args.fieldId && candidate.name === alias
    ) ||
    aliasShadowsAnotherSourceField ||
    (args.inputFieldId != null && args.inputFieldId === args.fieldId)
  ) {
    return draft;
  }

  const plan = fromBinary(PlanSchema, toBinary(PlanSchema, draft.plan));
  const rootRelation = plan.relations[0]?.relType;
  if (rootRelation?.case !== 'root') return draft;
  const projectRelation = rootRelation.value.input?.relType;
  if (projectRelation?.case !== 'project') {
    return draft;
  }
  const project = projectRelation.value;
  const emitKind = project.common?.emitKind;
  if (emitKind?.case !== 'emit') return draft;
  const outputMapping = emitKind.value.outputMapping;
  const targetMapping = outputMapping[output.outputOrdinal];
  const inputMapping = outputMapping[inputOutput.outputOrdinal];
  const sourceFieldCount = inspection.projection.source.fields.length;
  if (targetMapping == null || inputMapping == null) return draft;

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
  const buildStringType = () =>
    create(TypeSchema, {
      kind: {
        case: 'string',
        value: create(Type_StringSchema, { nullability: Type_Nullability.NULLABLE }),
      },
    });
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
  const signature = `${functionIdentity.name}:str`;
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
  const targetExpressionOrdinal = targetMapping - sourceFieldCount;
  const inputExpressionOrdinal = inputMapping - sourceFieldCount;
  const inputExpression =
    inputMapping < sourceFieldCount
      ? buildFieldReference(inputMapping)
      : inputExpressionOrdinal >= 0 && inputExpressionOrdinal < project.expressions.length
        ? fromBinary(
            ExpressionSchema,
            toBinary(ExpressionSchema, project.expressions[inputExpressionOrdinal]!)
          )
        : undefined;
  if (inputExpression == null) return draft;
  const nextExpression = create(ExpressionSchema, {
    rexType: {
      case: 'scalarFunction',
      value: create(Expression_ScalarFunctionSchema, {
        functionReference: extensionFunction.mappingType.value.functionAnchor,
        arguments: [
          create(FunctionArgumentSchema, { argType: { case: 'value', value: inputExpression } }),
        ],
        outputType: buildStringType(),
      }),
    },
  });
  const mappingReferenceCount = outputMapping.filter(
    (candidate) => candidate === targetMapping
  ).length;
  if (targetMapping < sourceFieldCount) {
    project.expressions.push(nextExpression);
    outputMapping[output.outputOrdinal] = sourceFieldCount + project.expressions.length - 1;
  } else if (mappingReferenceCount > 1) {
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
  const usedExtensionUrnAnchors = new Set(
    plan.extensions.flatMap((entry) =>
      entry.mappingType.case === 'extensionFunction'
        ? [entry.mappingType.value.extensionUrnReference]
        : []
    )
  );
  plan.extensionUrns = plan.extensionUrns.filter((entry) =>
    usedExtensionUrnAnchors.has(entry.extensionUrnAnchor)
  );
  const nextDraft = {
    plan,
    sidecar: {
      ...draft.sidecar,
      fields: draft.sidecar.fields.map((field) =>
        field.fieldId === output.fieldId ? { ...field, displayName: alias } : field
      ),
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
  if (!inspection.ok || inspection.projection.targetNodeId !== args.targetNode.id) return null;
  const incomingSourceIds = [
    ...new Set(
      args.edges.filter((edge) => edge.targetId === args.targetNode.id).map((edge) => edge.sourceId)
    ),
  ];
  if (
    incomingSourceIds.length !== 1 ||
    incomingSourceIds[0] !== inspection.projection.source.nodeId
  ) {
    return null;
  }
  const sourceNode = args.nodes.find((node) => node.id === inspection.projection.source.nodeId);
  const source = sourceNode == null ? null : resolveDvtSubstraitProjectionSource(sourceNode);
  return source != null &&
    source.schema === inspection.projection.source.schema &&
    source.table === inspection.projection.source.table &&
    sameConnectedSourceRef(source.sourceRef, inspection.projection.source.sourceRef) &&
    source.fields.map((field) => field.name).join('\u0000') ===
      inspection.projection.source.fields.map((field) => field.name).join('\u0000')
    ? {
        ...inspection.projection,
        source,
        outputs: inspection.projection.outputs.map((output) => ({
          ...output,
          dataType:
            source.fields.find((field) => field.name === output.sourceFieldName)?.dataType ??
            'unknown',
        })),
      }
    : null;
}

export function decodeDvtSubstraitProjectionDocument(input: unknown): DvtSubstraitProjectionDraft {
  const document = canonicalizeDvtSubstraitSemanticDocumentV1(input);
  const plan = fromBinary(PlanSchema, base64Bytes(document.semanticPlan.bytesBase64));
  if (!hasPinnedPlanVersion(plan)) {
    throw new Error('Substrait Plan does not match the pinned DVT profile.');
  }
  return { plan, sidecar: document.sidecar };
}

export function encodeDvtSubstraitProjectionDocument(
  draft: DvtSubstraitProjectionDraft
): DvtSubstraitSemanticDocumentV1 {
  if (!inspectDvtSubstraitProjectionDraft(draft).ok) {
    throw new Error('Substrait connected-source projection is invalid.');
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
