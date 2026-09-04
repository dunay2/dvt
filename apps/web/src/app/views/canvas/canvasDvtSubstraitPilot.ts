/** Owned concern: edit only the single typed Substrait shape admitted by VTX2 pilot #2598. */
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
} from '@buf/substrait_substrait.bufbuild_es/substrait/type_pb.js';
import { base64Bytes, sha256Hex } from '@dvt/crypto';
import {
  DVT_SUBSTRAIT_AUTHORING_SIDECAR_SCHEMA_VERSION,
  DVT_SUBSTRAIT_CAPABILITY_CATALOG_V1,
  DVT_SUBSTRAIT_PLAN_ENCODING,
  DVT_SUBSTRAIT_PROFILE_REF_V1,
  DVT_SUBSTRAIT_SEMANTIC_DOCUMENT_SCHEMA_VERSION,
  canonicalizeDvtSubstraitSemanticDocumentV1,
  type DvtSubstraitAuthoringSidecarV1,
  type DvtSubstraitSemanticDocumentV1,
} from '@dvt/contracts';
import { allocateDvtRelationId } from '@dvt/contracts/substrait';

import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';

const STRING_FUNCTION_URN = 'extension:io.substrait:functions_string';
const ZERO_SHA256 = '0'.repeat(64);
const PILOT_SOURCE_NAME = 'customers';
const PILOT_FIELD_NAMES = ['name', 'email', 'country'] as const;

type PilotFunctionName = 'trim' | 'upper';

export type DvtSubstraitPilotDraft = Readonly<{
  plan: Plan;
  sidecar: DvtSubstraitAuthoringSidecarV1;
}>;

export type DvtSubstraitPilotProjection = Readonly<{
  sourceName: string;
  inputFieldName: string;
  outputName: string;
  fieldId: string;
  operations: readonly PilotFunctionName[];
  outputs: readonly Readonly<{
    name: string;
    fieldId: string;
    outputOrdinal: number;
  }>[];
}>;

export type DvtSubstraitPilotInspection =
  Readonly<{ ok: true; projection: DvtSubstraitPilotProjection }> | Readonly<{ ok: false }>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function readPilotSourceColumns(node: CanonicalNode): readonly Readonly<{
  name: string;
  type: string;
}>[] {
  const readColumn = (
    candidate: unknown,
    fallbackName?: string
  ): readonly Readonly<{ name: string; type: string }>[] => {
    if (!isRecord(candidate)) return [];
    const rawName = typeof candidate.name === 'string' ? candidate.name : fallbackName;
    const rawType =
      typeof candidate.type === 'string'
        ? candidate.type
        : typeof candidate.dataType === 'string'
          ? candidate.dataType
          : undefined;
    const name = rawName?.trim();
    const type = rawType?.trim();
    return name && type ? [{ name, type }] : [];
  };
  const columns = node.metadata?.columns;
  if (Array.isArray(columns)) return columns.flatMap((column) => readColumn(column));
  if (!isRecord(columns)) return [];
  return Object.entries(columns).flatMap(([name, column]) => readColumn(column, name));
}

export function resolveDvtSubstraitPilotEntry(args: {
  targetNode: CanonicalNode;
  nodes: readonly CanonicalNode[];
  edges: readonly CanonicalEdge[];
}): string | null {
  const sourceIds = [
    ...new Set(
      args.edges.filter((edge) => edge.targetId === args.targetNode.id).map((edge) => edge.sourceId)
    ),
  ];
  if (sourceIds.length !== 1) return null;
  const source = args.nodes.find((node) => node.id === sourceIds[0]);
  if (
    source?.kind !== 'dvt:source' ||
    source.role !== 'input' ||
    source.name !== PILOT_SOURCE_NAME
  ) {
    return null;
  }
  const columns = readPilotSourceColumns(source);
  return columns.length === PILOT_FIELD_NAMES.length &&
    columns.every(
      (column, index) =>
        column.name === PILOT_FIELD_NAMES[index] && column.type.toLowerCase() === 'string'
    )
    ? source.id
    : null;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function clonePlan(plan: Plan): Plan {
  return fromBinary(PlanSchema, toBinary(PlanSchema, plan));
}

function hasPinnedPlanVersion(plan: Plan): boolean {
  return (
    plan.version?.majorNumber === 0 &&
    plan.version.minorNumber === 101 &&
    plan.version.patchNumber === 0
  );
}

function resolveExtensionUrn(plan: Plan, extensionUrnReference: number): string | null {
  return (
    plan.extensionUrns.find((entry) => entry.extensionUrnAnchor === extensionUrnReference)?.urn ??
    null
  );
}

function findStringFunctionDeclaration(plan: Plan, functionReference: number): string | null {
  const declaration = plan.extensions.find(
    (entry) =>
      entry.mappingType.case === 'extensionFunction' &&
      entry.mappingType.value.functionAnchor === functionReference
  );
  if (declaration?.mappingType.case !== 'extensionFunction') return null;
  return resolveExtensionUrn(plan, declaration.mappingType.value.extensionUrnReference) ===
    STRING_FUNCTION_URN
    ? declaration.mappingType.value.name
    : null;
}

function rootProject(plan: Plan): ProjectRel | null {
  const rootRelation = plan.relations.length === 1 ? plan.relations[0]?.relType : undefined;
  if (rootRelation?.case !== 'root') return null;
  const project = rootRelation.value.input?.relType;
  if (project?.case !== 'project') return null;
  return project.value;
}

function stringType() {
  return create(TypeSchema, {
    kind: {
      case: 'string',
      value: create(Type_StringSchema, { nullability: Type_Nullability.NULLABLE }),
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

/**
 * Create only the exact production-entry fixture owned by #2598. The caller is
 * responsible for admitting the matching connected source before invoking it.
 */
export function createDvtSubstraitPilotDraft(args: {
  sourceNodeId: string;
  targetNodeId: string;
}): DvtSubstraitPilotDraft {
  const read = create(RelSchema, {
    relType: {
      case: 'read',
      value: create(ReadRelSchema, {
        common: create(RelCommonSchema, { relAnchor: 1 }),
        baseSchema: create(NamedStructSchema, {
          names: [...PILOT_FIELD_NAMES],
          struct: create(Type_StructSchema, {
            types: PILOT_FIELD_NAMES.map(() => stringType()),
            nullability: Type_Nullability.REQUIRED,
          }),
        }),
        readType: {
          case: 'namedTable',
          value: create(ReadRel_NamedTableSchema, { names: [PILOT_SOURCE_NAME] }),
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
            value: create(RelCommon_EmitSchema, { outputMapping: [3, 1, 2] }),
          },
        }),
        input: read,
        expressions: [fieldReference(0)],
      }),
    },
  });
  const plan = create(PlanSchema, {
    version: {
      majorNumber: 0,
      minorNumber: 101,
      patchNumber: 0,
      producer: 'dvt-vtx2-card-pilot',
    },
    relations: [
      create(PlanRelSchema, {
        relType: {
          case: 'root',
          value: create(RelRootSchema, { input: project, names: [...PILOT_FIELD_NAMES] }),
        },
      }),
    ],
  });
  const sourceRelationId = allocateDvtRelationId();
  const projectRelationId = allocateDvtRelationId();
  const sidecar: DvtSubstraitAuthoringSidecarV1 = {
    schemaVersion: DVT_SUBSTRAIT_AUTHORING_SIDECAR_SCHEMA_VERSION,
    semanticPlanSha256: ZERO_SHA256,
    relations: [
      {
        relationId: sourceRelationId,
        relAnchor: 1,
        displayName: PILOT_SOURCE_NAME,
      },
      { relationId: projectRelationId, relAnchor: 2, displayName: PILOT_SOURCE_NAME },
    ],
    fields: PILOT_FIELD_NAMES.map((name, outputOrdinal) => ({
      fieldId: `field:${args.targetNodeId}:${name}`,
      relationId: projectRelationId,
      outputOrdinal,
      displayName: name,
    })),
  };
  return { plan, sidecar };
}

function inspectExpression(
  plan: Plan,
  expression: NonNullable<ReturnType<typeof rootProject>>['expressions'][number]
): readonly PilotFunctionName[] | null {
  const outerToInner: PilotFunctionName[] = [];
  let current = expression;

  while (current.rexType.case === 'scalarFunction') {
    const signature = findStringFunctionDeclaration(plan, current.rexType.value.functionReference);
    const name = signature === 'trim:str' ? 'trim' : signature === 'upper:str' ? 'upper' : null;
    if (name == null || current.rexType.value.arguments.length !== 1) return null;
    const argument = current.rexType.value.arguments[0]?.argType;
    if (argument?.case !== 'value') return null;
    outerToInner.push(name);
    current = argument.value;
  }

  if (current.rexType.case !== 'selection') return null;
  const field = current.rexType.value;
  if (field.rootType.case !== 'rootReference') return null;
  if (field.referenceType.case !== 'directReference') return null;
  const segment = field.referenceType.value.referenceType;
  if (segment.case !== 'structField' || segment.value.field !== 0 || segment.value.child != null) {
    return null;
  }

  const operations = outerToInner.reverse();
  if (operations.length === 0) return operations;
  if (operations.length === 1 && operations[0] === 'trim') return operations;
  if (operations.length === 2 && operations[0] === 'trim' && operations[1] === 'upper') {
    return operations;
  }
  return null;
}

function hasPilotInputSchema(read: ReadRel): boolean {
  const baseSchema = read.baseSchema;
  if (baseSchema == null || baseSchema.names.join(',') !== PILOT_FIELD_NAMES.join(','))
    return false;
  const types = baseSchema.struct?.types;
  return (
    types != null &&
    types.length === PILOT_FIELD_NAMES.length &&
    types.every((type) => type.kind.case === 'string')
  );
}

function commonHasNoHiddenSemantics(common: RelCommon | undefined): boolean {
  return common != null && common.hint == null && common.advancedExtension == null;
}

function readHasOnlyPilotSemantics(read: ReadRel): boolean {
  if (!commonHasNoHiddenSemantics(read.common) || read.common?.emitKind.case !== undefined) {
    return false;
  }
  if (
    read.filter != null ||
    read.bestEffortFilter != null ||
    read.projection != null ||
    read.advancedExtension != null
  ) {
    return false;
  }
  return (
    read.readType.case === 'namedTable' &&
    read.readType.value.advancedExtension == null &&
    read.readType.value.names.join('.') === PILOT_SOURCE_NAME
  );
}

function projectHasOnlyPilotSemantics(project: ProjectRel): boolean {
  return (
    commonHasNoHiddenSemantics(project.common) &&
    project.common?.emitKind.case === 'emit' &&
    project.advancedExtension == null
  );
}

export function inspectDvtSubstraitPilotDraft(
  draft: DvtSubstraitPilotDraft
): DvtSubstraitPilotInspection {
  const { plan, sidecar } = draft;
  if (!hasPinnedPlanVersion(plan)) return { ok: false };

  const rootRelation = plan.relations.length === 1 ? plan.relations[0]?.relType : undefined;
  if (rootRelation?.case !== 'root') return { ok: false };
  const root = rootRelation.value;
  if (root.names.length !== 3 || root.names[1] !== 'email' || root.names[2] !== 'country') {
    return { ok: false };
  }

  const projectRel = root.input?.relType;
  if (projectRel?.case !== 'project') return { ok: false };
  const project = projectRel.value;
  if (!projectHasOnlyPilotSemantics(project) || project.expressions.length !== 1) {
    return { ok: false };
  }
  if (project.common?.emitKind.case !== 'emit') return { ok: false };
  if (project.common.emitKind.value.outputMapping.join(',') !== '3,1,2') return { ok: false };
  const projectAnchor = project.common.relAnchor;
  if (projectAnchor == null || projectAnchor <= 0) return { ok: false };

  const readRel = project.input?.relType;
  if (readRel?.case !== 'read') return { ok: false };
  const read = readRel.value;
  if (!readHasOnlyPilotSemantics(read)) return { ok: false };
  if (read.common?.relAnchor == null || read.common.relAnchor <= 0) return { ok: false };
  if (!hasPilotInputSchema(read)) return { ok: false };

  const operations = inspectExpression(plan, project.expressions[0]!);
  if (operations == null) return { ok: false };

  const projectBinding = sidecar.relations.find((relation) => relation.relAnchor === projectAnchor);
  if (projectBinding == null) return { ok: false };
  const outputs = root.names.map((name, outputOrdinal) => {
    const binding = sidecar.fields.find(
      (field) =>
        field.relationId === projectBinding.relationId && field.outputOrdinal === outputOrdinal
    );
    return binding == null ? null : { name, fieldId: binding.fieldId, outputOrdinal };
  });
  if (outputs.some((output) => output == null)) return { ok: false };
  const resolvedOutputs = outputs.filter((output) => output != null);
  const firstOutput = resolvedOutputs[0];
  if (firstOutput == null) return { ok: false };

  return {
    ok: true,
    projection: {
      sourceName: PILOT_SOURCE_NAME,
      inputFieldName: PILOT_FIELD_NAMES[0],
      outputName: firstOutput.name,
      fieldId: firstOutput.fieldId,
      operations,
      outputs: resolvedOutputs,
    },
  };
}

function requirePilotFunctionCapability(name: PilotFunctionName): void {
  const capability = DVT_SUBSTRAIT_CAPABILITY_CATALOG_V1.entries.find(
    (entry) =>
      entry.kind === 'standard' &&
      entry.category === 'scalar-function' &&
      entry.identity.sourceKind === 'simple-extension' &&
      entry.identity.urn === STRING_FUNCTION_URN &&
      entry.identity.name === name &&
      entry.profileStatus === 'supported-profile'
  );
  if (capability == null) throw new Error(`Substrait capability ${name} is not supported.`);
}

function ensureStringFunction(plan: Plan, name: PilotFunctionName): number {
  requirePilotFunctionCapability(name);
  const signature = `${name}:str`;
  const existing = plan.extensions.find(
    (entry) =>
      entry.mappingType.case === 'extensionFunction' &&
      entry.mappingType.value.name === signature &&
      resolveExtensionUrn(plan, entry.mappingType.value.extensionUrnReference) ===
        STRING_FUNCTION_URN
  );
  if (existing?.mappingType.case === 'extensionFunction') {
    return existing.mappingType.value.functionAnchor;
  }

  let urn = plan.extensionUrns.find((entry) => entry.urn === STRING_FUNCTION_URN);
  if (urn == null) {
    const extensionUrnAnchor =
      Math.max(0, ...plan.extensionUrns.map((entry) => entry.extensionUrnAnchor)) + 1;
    urn = create(SimpleExtensionURNSchema, { extensionUrnAnchor, urn: STRING_FUNCTION_URN });
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
          name: signature,
        }),
      },
    })
  );
  return functionAnchor;
}

export function applyDvtSubstraitPilotFunction(
  draft: DvtSubstraitPilotDraft,
  name: PilotFunctionName
): DvtSubstraitPilotDraft {
  const inspection = inspectDvtSubstraitPilotDraft(draft);
  if (!inspection.ok) return draft;
  const expected = name === 'trim' ? [] : ['trim'];
  if (inspection.projection.operations.join(',') !== expected.join(',')) return draft;

  const plan = clonePlan(draft.plan);
  const project = rootProject(plan);
  if (project == null || project.expressions[0] == null) return draft;
  const functionReference = ensureStringFunction(plan, name);
  const input = project.expressions[0];
  project.expressions[0] = create(ExpressionSchema, {
    rexType: {
      case: 'scalarFunction',
      value: create(Expression_ScalarFunctionSchema, {
        functionReference,
        arguments: [create(FunctionArgumentSchema, { argType: { case: 'value', value: input } })],
        outputType: stringType(),
      }),
    },
  });
  return { plan, sidecar: draft.sidecar };
}

export function renameDvtSubstraitPilotOutput(
  draft: DvtSubstraitPilotDraft,
  outputName: string
): DvtSubstraitPilotDraft {
  const inspection = inspectDvtSubstraitPilotDraft(draft);
  if (!inspection.ok) return draft;

  const plan = clonePlan(draft.plan);
  const rootRelation = plan.relations[0]?.relType;
  if (rootRelation?.case !== 'root') return draft;
  rootRelation.value.names[0] = outputName;

  const fields = draft.sidecar.fields.map((field) => {
    if (field.fieldId !== inspection.projection.fieldId) return field;
    const { displayName: _displayName, ...fieldWithoutDisplayName } = field;
    return outputName.trim().length > 0
      ? { ...fieldWithoutDisplayName, displayName: outputName }
      : fieldWithoutDisplayName;
  });
  return { plan, sidecar: { ...draft.sidecar, fields } };
}

export function decodeDvtSubstraitPilotDocument(input: unknown): DvtSubstraitPilotDraft {
  const document = canonicalizeDvtSubstraitSemanticDocumentV1(input);
  const plan = fromBinary(PlanSchema, base64Bytes(document.semanticPlan.bytesBase64));
  if (!hasPinnedPlanVersion(plan)) {
    throw new Error('Substrait Plan does not match the pinned DVT profile.');
  }
  return { plan, sidecar: document.sidecar };
}

export function encodeDvtSubstraitPilotDocument(
  draft: DvtSubstraitPilotDraft
): DvtSubstraitSemanticDocumentV1 {
  if (!hasPinnedPlanVersion(draft.plan)) {
    throw new Error('Substrait Plan does not match the pinned DVT profile.');
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
