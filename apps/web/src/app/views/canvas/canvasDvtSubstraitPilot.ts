/** Owned concern: edit only the single typed Substrait shape admitted by VTX2 pilot #2598. */
import { create, fromBinary, toBinary } from '@bufbuild/protobuf';
import {
  ExpressionSchema,
  Expression_ScalarFunctionSchema,
  FunctionArgumentSchema,
} from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import { PlanSchema, type Plan } from '@buf/substrait_substrait.bufbuild_es/substrait/plan_pb.js';
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
  DVT_SUBSTRAIT_AUTHORING_SIDECAR_SCHEMA_VERSION,
  DVT_SUBSTRAIT_CAPABILITY_CATALOG_V1,
  DVT_SUBSTRAIT_PLAN_ENCODING,
  DVT_SUBSTRAIT_PROFILE_REF_V1,
  DVT_SUBSTRAIT_SEMANTIC_DOCUMENT_SCHEMA_VERSION,
  canonicalizeDvtSubstraitSemanticDocumentV1,
  type DvtSubstraitAuthoringSidecarV1,
  type DvtSubstraitSemanticDocumentV1,
} from '@dvt/contracts/substrait';

const STRING_FUNCTION_URN = 'extension:io.substrait:functions_string';

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
}>;

export type DvtSubstraitPilotInspection =
  | Readonly<{ ok: true; projection: DvtSubstraitPilotProjection }>
  | Readonly<{ ok: false }>;

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

function findFunctionDeclaration(plan: Plan, functionReference: number): string | null {
  const declaration = plan.extensions.find(
    (entry) =>
      entry.mappingType.case === 'extensionFunction' &&
      entry.mappingType.value.functionAnchor === functionReference
  );
  return declaration?.mappingType.case === 'extensionFunction'
    ? declaration.mappingType.value.name
    : null;
}

function inspectExpression(plan: Plan, expression: NonNullable<ReturnType<typeof rootProject>>['expressions'][number]): readonly PilotFunctionName[] | null {
  const outerToInner: PilotFunctionName[] = [];
  let current = expression;

  while (current.rexType.case === 'scalarFunction') {
    const signature = findFunctionDeclaration(plan, current.rexType.value.functionReference);
    const name = signature === 'trim:str' ? 'trim' : signature === 'upper:str' ? 'upper' : null;
    if (name == null || current.rexType.value.arguments.length !== 1) return null;
    const argument = current.rexType.value.arguments[0]?.argType;
    if (argument?.case !== 'value') return null;
    outerToInner.push(name);
    current = argument.value;
  }

  if (current.rexType.case !== 'selection') return null;
  const fieldReference = current.rexType.value;
  if (fieldReference.rootType.case !== 'rootReference') return null;
  if (fieldReference.referenceType.case !== 'directReference') return null;
  const segment = fieldReference.referenceType.value.referenceType;
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

function rootProject(plan: Plan) {
  const rootRelation = plan.relations.length === 1 ? plan.relations[0]?.relType : undefined;
  if (rootRelation?.case !== 'root') return null;
  const project = rootRelation.value.input?.relType;
  if (project?.case !== 'project') return null;
  return project.value;
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
  if (project.expressions.length !== 1 || project.common?.emitKind.case !== 'emit') {
    return { ok: false };
  }
  if (project.common.emitKind.value.outputMapping.join(',') !== '3,1,2') return { ok: false };
  const projectAnchor = project.common.relAnchor;
  if (projectAnchor == null || projectAnchor <= 0) return { ok: false };

  const readRel = project.input?.relType;
  if (readRel?.case !== 'read') return { ok: false };
  const read = readRel.value;
  if (read.readType.case !== 'namedTable' || read.readType.value.names.join('.') !== 'customers') {
    return { ok: false };
  }
  if (read.baseSchema?.names.join(',') !== 'name,email,country') return { ok: false };

  const operations = inspectExpression(plan, project.expressions[0]!);
  if (operations == null) return { ok: false };

  const projectBinding = sidecar.relations.find((relation) => relation.relAnchor === projectAnchor);
  if (projectBinding == null) return { ok: false };
  const fieldBinding = sidecar.fields.find(
    (field) => field.relationId === projectBinding.relationId && field.outputOrdinal === 0
  );
  if (fieldBinding == null) return { ok: false };

  return {
    ok: true,
    projection: {
      sourceName: 'customers',
      inputFieldName: 'name',
      outputName: root.names[0] ?? '',
      fieldId: fieldBinding.fieldId,
      operations,
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
      entry.profileStatus !== 'out-of-scope'
  );
  if (capability == null) throw new Error(`Substrait capability ${name} is not catalogued.`);
}

function ensureStringFunction(plan: Plan, name: PilotFunctionName): number {
  requirePilotFunctionCapability(name);
  const signature = `${name}:str`;
  const existing = plan.extensions.find(
    (entry) => entry.mappingType.case === 'extensionFunction' && entry.mappingType.value.name === signature
  );
  if (existing?.mappingType.case === 'extensionFunction') return existing.mappingType.value.functionAnchor;

  let urn = plan.extensionUrns.find((entry) => entry.urn === STRING_FUNCTION_URN);
  if (urn == null) {
    const extensionUrnAnchor = Math.max(0, ...plan.extensionUrns.map((entry) => entry.extensionUrnAnchor)) + 1;
    urn = create(SimpleExtensionURNSchema, { extensionUrnAnchor, urn: STRING_FUNCTION_URN });
    plan.extensionUrns.push(urn);
  }

  const functionAnchor =
    Math.max(
      0,
      ...plan.extensions.flatMap((entry) =>
        entry.mappingType.case === 'extensionFunction' ? [entry.mappingType.value.functionAnchor] : []
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

function stringType() {
  return create(TypeSchema, {
    kind: {
      case: 'string',
      value: create(Type_StringSchema, { nullability: Type_Nullability.NULLABLE }),
    },
  });
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

  const fields = draft.sidecar.fields.map((field) =>
    field.fieldId === inspection.projection.fieldId
      ? {
          ...field,
          ...(outputName.trim().length > 0 ? { displayName: outputName } : { displayName: undefined }),
        }
      : field
  );
  return { plan, sidecar: { ...draft.sidecar, fields } };
}

export function decodeDvtSubstraitPilotDocument(
  input: unknown
): DvtSubstraitPilotDraft {
  const document = canonicalizeDvtSubstraitSemanticDocumentV1(input);
  const plan = fromBinary(PlanSchema, base64Bytes(document.semanticPlan.bytesBase64));
  if (!hasPinnedPlanVersion(plan)) throw new Error('Substrait Plan does not match the pinned DVT profile.');
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
