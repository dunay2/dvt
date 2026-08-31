/** Owned concern: build and inspect only the first two-source UNION ALL shape admitted by #2634. */
import { create, fromBinary, toBinary } from '@bufbuild/protobuf';
import {
  ReadRelSchema,
  ReadRel_NamedTableSchema,
  RelCommonSchema,
  RelCommon_EmitSchema,
  RelRootSchema,
  RelSchema,
  SetRelSchema,
  SetRel_SetOp,
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
import { readDvtTransformAuthoringAuthority } from './canvasDvtTransformAuthoringAuthority';

const ZERO_SHA256 = '0'.repeat(64);
const UNION_ALL_PRODUCER = 'dvt-vtx2-union-all-card';

export type DvtSubstraitUnionAllField = Readonly<{
  name: string;
  type: 'string';
}>;

export type DvtSubstraitUnionAllSource = Readonly<{
  nodeId: string;
  schema: string;
  table: string;
  fields: readonly DvtSubstraitUnionAllField[];
  sourceRef: ConnectedSourceRef;
}>;

export type DvtSubstraitUnionAllDraft = Readonly<{
  plan: Plan;
  sidecar: DvtSubstraitAuthoringSidecarV1;
}>;

export type DvtSubstraitUnionAllProjection = Readonly<{
  inputs: readonly [
    Readonly<{ schema: string; table: string; sourceRef: ConnectedSourceRef }>,
    Readonly<{ schema: string; table: string; sourceRef: ConnectedSourceRef }>,
  ];
  outputs: readonly Readonly<{
    name: string;
    fieldId: string;
    outputOrdinal: number;
  }>[];
}>;

export type DvtSubstraitUnionAllInspection =
  Readonly<{ ok: true; projection: DvtSubstraitUnionAllProjection }> | Readonly<{ ok: false }>;

export type DvtSubstraitUnionAllEntry = Readonly<{
  inputs: readonly [DvtSubstraitUnionAllSource, DvtSubstraitUnionAllSource];
  targetNodeId: string;
}>;

function compareCodeUnits(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function sameConnectionRef(
  first: ConnectedSourceRef['connectionRef'],
  second: ConnectedSourceRef['connectionRef']
): boolean {
  return (
    first.schemaVersion === second.schemaVersion &&
    first.provider === second.provider &&
    first.connectionId === second.connectionId
  );
}

function sameSourceRef(first: ConnectedSourceRef, second: ConnectedSourceRef): boolean {
  return (
    first.schemaVersion === second.schemaVersion &&
    first.sourceObjectId === second.sourceObjectId &&
    sameConnectionRef(first.connectionRef, second.connectionRef)
  );
}

function readMetadataText(node: CanonicalNode, key: string): string | null {
  const value = node.metadata?.[key];
  return typeof value === 'string' && value.length > 0 && value === value.trim() ? value : null;
}

function readStringFields(node: CanonicalNode): readonly DvtSubstraitUnionAllField[] | null {
  const columns = node.metadata?.columns;
  if (!Array.isArray(columns) || columns.length === 0) return null;
  const fields = columns.map((column) => {
    if (column == null || typeof column !== 'object' || Array.isArray(column)) return null;
    const record = column as Record<string, unknown>;
    return typeof record.name === 'string' &&
      record.name.length > 0 &&
      record.name === record.name.trim() &&
      record.type === 'string'
      ? ({ name: record.name, type: 'string' } as const)
      : null;
  });
  if (fields.some((field) => field == null)) return null;
  const resolved = fields.filter((field) => field != null);
  return new Set(resolved.map((field) => field.name)).size === resolved.length ? resolved : null;
}

function resolveUnionSource(node: CanonicalNode): DvtSubstraitUnionAllSource | null {
  if (node.kind !== 'dvt:source' || node.role !== 'input') return null;
  const sourceRef = ConnectedSourceRefSchema.safeParse(node.metadata?.connectedSourceRef);
  const schema = readMetadataText(node, 'schema');
  const table = readMetadataText(node, 'tableName');
  const fields = readStringFields(node);
  if (
    !sourceRef.success ||
    sourceRef.data.connectionRef.provider !== 'postgres' ||
    schema == null ||
    table == null ||
    fields == null
  ) {
    return null;
  }
  return { nodeId: node.id, schema, table, fields, sourceRef: sourceRef.data };
}

function sameFields(
  first: readonly DvtSubstraitUnionAllField[],
  second: readonly DvtSubstraitUnionAllField[]
): boolean {
  return (
    first.length === second.length &&
    first.every(
      (field, index) => field.name === second[index]?.name && field.type === second[index]?.type
    )
  );
}

export function resolveDvtSubstraitUnionAllEntry(args: {
  targetNode: CanonicalNode;
  nodes: readonly CanonicalNode[];
  edges: readonly CanonicalEdge[];
  requirePersistedAuthority?: boolean;
}): DvtSubstraitUnionAllEntry | null {
  if (
    args.targetNode.pluginId !== 'dvt' ||
    args.targetNode.kind !== 'dvt:sql_transform' ||
    args.targetNode.role !== 'transform'
  ) {
    return null;
  }
  const sourceIds = [
    ...new Set(
      args.edges.filter((edge) => edge.targetId === args.targetNode.id).map((edge) => edge.sourceId)
    ),
  ].sort(compareCodeUnits);
  if (sourceIds.length !== 2) return null;
  const sources = sourceIds.map((sourceId) => {
    const node = args.nodes.find((candidate) => candidate.id === sourceId);
    return node == null ? null : resolveUnionSource(node);
  });
  const first = sources[0];
  const second = sources[1];
  if (
    first == null ||
    second == null ||
    !sameConnectionRef(first.sourceRef.connectionRef, second.sourceRef.connectionRef) ||
    sameSourceRef(first.sourceRef, second.sourceRef) ||
    !sameFields(first.fields, second.fields)
  ) {
    return null;
  }

  if (args.requirePersistedAuthority) {
    try {
      const authority = readDvtTransformAuthoringAuthority(args.targetNode);
      if (authority.mode !== DVT_TRANSFORM_AUTHORING_MODE.substrait) return null;
      const inspection = inspectDvtSubstraitUnionAllDraft(
        decodeDvtSubstraitUnionAllDocument(authority.semanticDocument)
      );
      if (
        !inspection.ok ||
        !inspection.projection.inputs.every((input, index) => {
          const source = sources[index];
          return (
            source != null &&
            input.schema === source.schema &&
            input.table === source.table &&
            sameSourceRef(input.sourceRef, source.sourceRef)
          );
        })
      ) {
        return null;
      }
    } catch {
      return null;
    }
  }

  return { inputs: [first, second], targetNodeId: args.targetNode.id };
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

function readRelation(args: { relAnchor: number; source: DvtSubstraitUnionAllSource }): Rel {
  return create(RelSchema, {
    relType: {
      case: 'read',
      value: create(ReadRelSchema, {
        common: create(RelCommonSchema, { relAnchor: args.relAnchor }),
        baseSchema: create(NamedStructSchema, {
          names: args.source.fields.map((field) => field.name),
          struct: create(Type_StructSchema, {
            types: args.source.fields.map(() => stringType()),
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
}

function requireUnionAllCapability(): void {
  const entryId = buildDvtSubstraitStandardCapabilityId('relation', {
    sourceKind: 'core',
    message: 'substrait.SetRel',
    selector: 'SetOp.SET_OP_UNION_ALL',
  });
  const capability = DVT_SUBSTRAIT_CAPABILITY_CATALOG_V1.entries.find(
    (entry) =>
      entry.kind === 'standard' &&
      entry.entryId === entryId &&
      entry.profileStatus === 'supported-profile'
  );
  if (capability == null) throw new Error(`Substrait capability ${entryId} is not supported.`);
}

function assertCompatibleSources(
  inputs: readonly [DvtSubstraitUnionAllSource, DvtSubstraitUnionAllSource]
): void {
  const [first, second] = inputs;
  if (
    first.sourceRef.connectionRef.provider !== 'postgres' ||
    second.sourceRef.connectionRef.provider !== 'postgres' ||
    !sameConnectionRef(first.sourceRef.connectionRef, second.sourceRef.connectionRef)
  ) {
    throw new Error('VTX2 UNION ALL requires two PostgreSQL sources on the same connection.');
  }
  if (sameSourceRef(first.sourceRef, second.sourceRef)) {
    throw new Error('VTX2 UNION ALL requires two distinct source identities.');
  }
  if (!sameFields(first.fields, second.fields) || first.fields.length === 0) {
    throw new Error('VTX2 UNION ALL requires identical non-empty ordered field schemas.');
  }
  const identityValues = inputs.flatMap((input) => [input.nodeId, input.schema, input.table]);
  if (
    new Set(inputs.map((input) => input.nodeId)).size !== inputs.length ||
    identityValues.some((value) => value.length === 0 || value !== value.trim()) ||
    inputs.some(
      (input) =>
        new Set(input.fields.map((field) => field.name)).size !== input.fields.length ||
        input.fields.some(
          (field) =>
            field.type !== 'string' || field.name.length === 0 || field.name !== field.name.trim()
        )
    )
  ) {
    throw new Error(
      'VTX2 UNION ALL source and field identities must be unique, non-blank and trimmed.'
    );
  }
}

export function createDvtSubstraitUnionAllDraft(
  args: DvtSubstraitUnionAllEntry
): DvtSubstraitUnionAllDraft {
  requireUnionAllCapability();
  assertCompatibleSources(args.inputs);
  if (args.targetNodeId.length === 0 || args.targetNodeId !== args.targetNodeId.trim()) {
    throw new Error('VTX2 UNION ALL target node identity must be non-blank and trimmed.');
  }

  const fieldNames = args.inputs[0].fields.map((field) => field.name);
  const inputs = args.inputs.map((source, index) => readRelation({ relAnchor: index + 1, source }));
  const setRelation = create(RelSchema, {
    relType: {
      case: 'set',
      value: create(SetRelSchema, {
        common: create(RelCommonSchema, {
          relAnchor: 3,
          emitKind: {
            case: 'emit',
            value: create(RelCommon_EmitSchema, {
              outputMapping: fieldNames.map((_, index) => index),
            }),
          },
        }),
        inputs,
        op: SetRel_SetOp.UNION_ALL,
      }),
    },
  });
  const plan = create(PlanSchema, {
    version: {
      majorNumber: 0,
      minorNumber: 101,
      patchNumber: 0,
      producer: UNION_ALL_PRODUCER,
    },
    relations: [
      create(PlanRelSchema, {
        relType: {
          case: 'root',
          value: create(RelRootSchema, { input: setRelation, names: fieldNames }),
        },
      }),
    ],
  });
  const resultRelationId = `relation:${args.targetNodeId}:union-all`;
  const sidecar: DvtSubstraitAuthoringSidecarV1 = {
    schemaVersion: DVT_SUBSTRAIT_AUTHORING_SIDECAR_SCHEMA_VERSION,
    semanticPlanSha256: ZERO_SHA256,
    relations: [
      ...args.inputs.map((source, index) => ({
        relationId: `relation:${source.nodeId}`,
        relAnchor: index + 1,
        sourceRef: source.sourceRef,
        displayName: source.table,
      })),
      {
        relationId: resultRelationId,
        relAnchor: 3,
        displayName: `${args.inputs[0].table}+${args.inputs[1].table}`,
      },
    ],
    fields: [
      ...args.inputs.flatMap((source) =>
        source.fields.map((field, outputOrdinal) => ({
          fieldId: `field:${source.nodeId}:${field.name}`,
          relationId: `relation:${source.nodeId}`,
          outputOrdinal,
          displayName: field.name,
        }))
      ),
      ...fieldNames.map((name, outputOrdinal) => ({
        fieldId: `field:${args.targetNodeId}:${name}`,
        relationId: resultRelationId,
        outputOrdinal,
        displayName: name,
      })),
    ],
  };
  return { plan, sidecar };
}

function hasPinnedPlanVersion(plan: Plan): boolean {
  return (
    plan.version?.majorNumber === 0 &&
    plan.version.minorNumber === 101 &&
    plan.version.patchNumber === 0 &&
    plan.version.producer === UNION_ALL_PRODUCER
  );
}

function tableIdentity(rel: Rel): Readonly<{
  schema: string;
  table: string;
  fields: readonly string[];
}> | null {
  if (rel.relType.case !== 'read') return null;
  const read = rel.relType.value;
  if (
    read.common?.emitKind.case !== undefined ||
    read.common?.hint != null ||
    read.common?.advancedExtension != null ||
    read.advancedExtension != null ||
    read.filter != null ||
    read.bestEffortFilter != null ||
    read.projection != null ||
    read.readType.case !== 'namedTable' ||
    read.readType.value.advancedExtension != null
  ) {
    return null;
  }
  const names = read.readType.value.names;
  const fields = read.baseSchema?.names;
  const types = read.baseSchema?.struct?.types;
  if (
    names.length !== 2 ||
    names.some((name) => name.length === 0 || name !== name.trim()) ||
    fields == null ||
    fields.length === 0 ||
    new Set(fields).size !== fields.length ||
    fields.some((name) => name.length === 0 || name !== name.trim()) ||
    types == null ||
    types.length !== fields.length ||
    !types.every(
      (type) =>
        type.kind.case === 'string' && type.kind.value.nullability === Type_Nullability.NULLABLE
    )
  ) {
    return null;
  }
  return { schema: names[0]!, table: names[1]!, fields };
}

function sourceNodeIdFromRelationId(relationId: string): string | null {
  const prefix = 'relation:';
  if (!relationId.startsWith(prefix) || relationId.endsWith(':union-all')) return null;
  const nodeId = relationId.slice(prefix.length);
  return nodeId.length > 0 && nodeId === nodeId.trim() ? nodeId : null;
}

function targetNodeIdFromResultRelationId(relationId: string): string | null {
  const prefix = 'relation:';
  const suffix = ':union-all';
  if (!relationId.startsWith(prefix) || !relationId.endsWith(suffix)) return null;
  const nodeId = relationId.slice(prefix.length, -suffix.length);
  return nodeId.length > 0 && nodeId === nodeId.trim() ? nodeId : null;
}

function validateFieldsForRelation(args: {
  sidecar: DvtSubstraitAuthoringSidecarV1;
  relationId: string;
  nodeId: string;
  names: readonly string[];
}): boolean {
  const fields = args.sidecar.fields
    .filter((field) => field.relationId === args.relationId)
    .sort((left, right) => left.outputOrdinal - right.outputOrdinal);
  return (
    fields.length === args.names.length &&
    fields.every(
      (field, index) =>
        field.outputOrdinal === index &&
        field.displayName === args.names[index] &&
        field.fieldId === `field:${args.nodeId}:${args.names[index]}`
    )
  );
}

export function inspectDvtSubstraitUnionAllDraft(
  draft: DvtSubstraitUnionAllDraft
): DvtSubstraitUnionAllInspection {
  const { plan, sidecar } = draft;
  if (
    !hasPinnedPlanVersion(plan) ||
    plan.relations.length !== 1 ||
    plan.extensionUrns.length !== 0 ||
    plan.extensions.length !== 0 ||
    sidecar.schemaVersion !== DVT_SUBSTRAIT_AUTHORING_SIDECAR_SCHEMA_VERSION ||
    sidecar.relations.length !== 3 ||
    new Set(sidecar.relations.map((relation) => relation.relationId)).size !== 3 ||
    new Set(sidecar.relations.map((relation) => relation.relAnchor)).size !== 3 ||
    new Set(sidecar.fields.map((field) => field.fieldId)).size !== sidecar.fields.length
  ) {
    return { ok: false };
  }
  const root = plan.relations[0]?.relType;
  if (root?.case !== 'root') return { ok: false };
  const names = root.value.names;
  if (
    names.length === 0 ||
    new Set(names).size !== names.length ||
    names.some((name) => name.length === 0 || name !== name.trim())
  ) {
    return { ok: false };
  }
  const setRelType = root.value.input?.relType;
  if (setRelType?.case !== 'set') return { ok: false };
  const setRelation = setRelType.value;
  if (
    setRelation.op !== SetRel_SetOp.UNION_ALL ||
    setRelation.inputs.length !== 2 ||
    setRelation.advancedExtension != null ||
    setRelation.common?.relAnchor !== 3 ||
    setRelation.common.hint != null ||
    setRelation.common.advancedExtension != null ||
    setRelation.common.emitKind.case !== 'emit' ||
    setRelation.common.emitKind.value.outputMapping.length !== names.length ||
    !setRelation.common.emitKind.value.outputMapping.every((value, index) => value === index)
  ) {
    return { ok: false };
  }

  const inputTables = setRelation.inputs.map(tableIdentity);
  if (
    inputTables.some((input) => input == null) ||
    inputTables.some((input) => input?.fields.join('\u0000') !== names.join('\u0000'))
  ) {
    return { ok: false };
  }
  const firstTable = inputTables[0];
  const secondTable = inputTables[1];
  if (firstTable == null || secondTable == null) return { ok: false };
  if (
    setRelation.inputs[0]?.relType.case !== 'read' ||
    setRelation.inputs[0].relType.value.common?.relAnchor !== 1 ||
    setRelation.inputs[1]?.relType.case !== 'read' ||
    setRelation.inputs[1].relType.value.common?.relAnchor !== 2
  ) {
    return { ok: false };
  }

  const sourceBindings = [1, 2].map((anchor) =>
    sidecar.relations.find((relation) => relation.relAnchor === anchor)
  );
  const resultBinding = sidecar.relations.find((relation) => relation.relAnchor === 3);
  const firstBinding = sourceBindings[0];
  const secondBinding = sourceBindings[1];
  if (
    firstBinding == null ||
    secondBinding == null ||
    resultBinding == null ||
    firstBinding.sourceRef == null ||
    secondBinding.sourceRef == null ||
    resultBinding.sourceRef != null ||
    firstBinding.sourceRef.connectionRef.provider !== 'postgres' ||
    secondBinding.sourceRef.connectionRef.provider !== 'postgres' ||
    !sameConnectionRef(
      firstBinding.sourceRef.connectionRef,
      secondBinding.sourceRef.connectionRef
    ) ||
    sameSourceRef(firstBinding.sourceRef, secondBinding.sourceRef)
  ) {
    return { ok: false };
  }
  const firstNodeId = sourceNodeIdFromRelationId(firstBinding.relationId);
  const secondNodeId = sourceNodeIdFromRelationId(secondBinding.relationId);
  const targetNodeId = targetNodeIdFromResultRelationId(resultBinding.relationId);
  if (firstNodeId == null || secondNodeId == null || targetNodeId == null) return { ok: false };
  if (
    !validateFieldsForRelation({
      sidecar,
      relationId: firstBinding.relationId,
      nodeId: firstNodeId,
      names,
    }) ||
    !validateFieldsForRelation({
      sidecar,
      relationId: secondBinding.relationId,
      nodeId: secondNodeId,
      names,
    }) ||
    !validateFieldsForRelation({
      sidecar,
      relationId: resultBinding.relationId,
      nodeId: targetNodeId,
      names,
    }) ||
    sidecar.fields.length !== names.length * 3
  ) {
    return { ok: false };
  }
  const planSha256 = sha256Hex(toBinary(PlanSchema, plan));
  if (sidecar.semanticPlanSha256 !== ZERO_SHA256 && sidecar.semanticPlanSha256 !== planSha256) {
    return { ok: false };
  }

  return {
    ok: true,
    projection: {
      inputs: [
        {
          schema: firstTable.schema,
          table: firstTable.table,
          sourceRef: firstBinding.sourceRef,
        },
        {
          schema: secondTable.schema,
          table: secondTable.table,
          sourceRef: secondBinding.sourceRef,
        },
      ],
      outputs: names.map((name, outputOrdinal) => ({
        name,
        fieldId: `field:${targetNodeId}:${name}`,
        outputOrdinal,
      })),
    },
  };
}

export function decodeDvtSubstraitUnionAllDocument(input: unknown): DvtSubstraitUnionAllDraft {
  const document = canonicalizeDvtSubstraitSemanticDocumentV1(input);
  const plan = fromBinary(PlanSchema, base64Bytes(document.semanticPlan.bytesBase64));
  const draft = { plan, sidecar: document.sidecar };
  if (!inspectDvtSubstraitUnionAllDraft(draft).ok) {
    throw new Error('Unsupported VTX2 UNION ALL Substrait shape.');
  }
  return draft;
}

export function encodeDvtSubstraitUnionAllDocument(
  draft: DvtSubstraitUnionAllDraft
): DvtSubstraitSemanticDocumentV1 {
  if (!inspectDvtSubstraitUnionAllDraft(draft).ok) {
    throw new Error('Unsupported VTX2 UNION ALL Substrait shape.');
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
