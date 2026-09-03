/** Owned concern: build and inspect the N-source UNION ALL shape admitted by #2634 and #2765. */
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
  ProjectRelSchema,
  ReadRelSchema,
  ReadRel_NamedTableSchema,
  RelCommonSchema,
  RelCommon_EmitSchema,
  RelRootSchema,
  RelSchema,
  SetRelSchema,
  SetRel_SetOp,
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

export type DvtSubstraitUnionAllFieldEdit =
  | Readonly<{ kind: 'set-selected'; fieldKey: string; selected: boolean }>
  | Readonly<{ kind: 'rename'; fieldKey: string; outputName: string }>
  | Readonly<{ kind: 'move'; fieldKey: string; direction: 'up' | 'down' }>;

export type DvtSubstraitUnionAllProjection = Readonly<{
  inputs: readonly Readonly<{
    nodeId: string;
    schema: string;
    table: string;
    sourceRef: ConnectedSourceRef;
  }>[];
  availableFields: readonly Readonly<{ fieldKey: string; defaultName: string }>[];
  outputs: readonly Readonly<{
    fieldKey: string;
    name: string;
    fieldId: string;
    outputOrdinal: number;
  }>[];
}>;

export type DvtSubstraitUnionAllInspection =
  Readonly<{ ok: true; projection: DvtSubstraitUnionAllProjection }> | Readonly<{ ok: false }>;

export type DvtSubstraitUnionAllGroupingProjection = Readonly<{
  inputs: DvtSubstraitUnionAllProjection['inputs'];
  groupField: Readonly<{
    fieldKey: string;
    name: string;
    fieldId: string;
    inputOrdinal: number;
  }>;
  measure: Readonly<{
    name: string;
    fieldId: string;
    capabilityId: string;
  }>;
  outputs: readonly Readonly<{
    name: string;
    fieldId: string;
    outputOrdinal: number;
  }>[];
}>;

export type DvtSubstraitUnionAllGroupingInspection =
  | Readonly<{ ok: true; projection: DvtSubstraitUnionAllGroupingProjection }>
  | Readonly<{ ok: false }>;

export type DvtSubstraitUnionAllGroupedWindowProjection = Readonly<{
  inputs: DvtSubstraitUnionAllProjection['inputs'];
  groupField: DvtSubstraitUnionAllGroupingProjection['groupField'];
  measure: Readonly<{
    name: string;
    fieldId: string;
  }>;
  result: Readonly<{
    name: string;
    fieldId: string;
    capabilityId: string;
  }>;
  outputs: readonly Readonly<{
    name: string;
    fieldId: string;
    outputOrdinal: number;
  }>[];
}>;

export type DvtSubstraitUnionAllGroupedWindowInspection =
  | Readonly<{ ok: true; projection: DvtSubstraitUnionAllGroupedWindowProjection }>
  | Readonly<{ ok: false }>;

export type DvtSubstraitUnionAllEntry = Readonly<{
  inputs: readonly DvtSubstraitUnionAllSource[];
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
    args.targetNode.kind !== 'dvt:transform' ||
    args.targetNode.role !== 'transform'
  ) {
    return null;
  }
  const sourceIds = [
    ...new Set(
      args.edges.filter((edge) => edge.targetId === args.targetNode.id).map((edge) => edge.sourceId)
    ),
  ].sort(compareCodeUnits);
  if (sourceIds.length < 2) return null;
  const sources = sourceIds.map((sourceId) => {
    const node = args.nodes.find((candidate) => candidate.id === sourceId);
    return node == null ? null : resolveUnionSource(node);
  });
  const resolvedSources = sources.filter(
    (source): source is DvtSubstraitUnionAllSource => source != null
  );
  const first = resolvedSources[0];
  if (
    first == null ||
    resolvedSources.length !== sourceIds.length ||
    resolvedSources.some(
      (source, index) =>
        !sameConnectionRef(first.sourceRef.connectionRef, source.sourceRef.connectionRef) ||
        !sameFields(first.fields, source.fields) ||
        resolvedSources.some(
          (candidate, candidateIndex) =>
            candidateIndex !== index && sameSourceRef(source.sourceRef, candidate.sourceRef)
        )
    )
  ) {
    return null;
  }

  if (args.requirePersistedAuthority) {
    try {
      const authority = readDvtTransformAuthoringAuthority(args.targetNode);
      if (authority == null) return null;
      const inspection = inspectDvtSubstraitUnionAllAcceptedDraft(
        decodeDvtSubstraitUnionAllDocument(authority.semanticDocument)
      );
      if (
        !inspection.ok ||
        inspection.projection.inputs.length !== resolvedSources.length ||
        !inspection.projection.inputs.every((input, index) => {
          const source = resolvedSources[index];
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

  return { inputs: resolvedSources, targetNodeId: args.targetNode.id };
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

function assertCompatibleSources(inputs: readonly DvtSubstraitUnionAllSource[]): void {
  const first = inputs[0];
  if (
    first == null ||
    inputs.length < 2 ||
    inputs.some(
      (input) =>
        input.sourceRef.connectionRef.provider !== 'postgres' ||
        !sameConnectionRef(first.sourceRef.connectionRef, input.sourceRef.connectionRef)
    )
  ) {
    throw new Error('VTX2 UNION ALL requires PostgreSQL sources on the same connection.');
  }
  if (
    inputs.some((input, index) =>
      inputs.some(
        (candidate, candidateIndex) =>
          candidateIndex !== index && sameSourceRef(input.sourceRef, candidate.sourceRef)
      )
    )
  ) {
    throw new Error('VTX2 UNION ALL requires distinct source identities.');
  }
  if (
    first.fields.length === 0 ||
    inputs.some((input) => !sameFields(first.fields, input.fields))
  ) {
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

  const fieldNames = args.inputs[0]!.fields.map((field) => field.name);
  const inputs = args.inputs.map((source, index) => readRelation({ relAnchor: index + 1, source }));
  const resultRelAnchor = args.inputs.length + 1;
  const setRelation = create(RelSchema, {
    relType: {
      case: 'set',
      value: create(SetRelSchema, {
        common: create(RelCommonSchema, {
          relAnchor: resultRelAnchor,
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
        relAnchor: resultRelAnchor,
        displayName: args.inputs.map((input) => input.table).join('+'),
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

function clonePlan(plan: Plan): Plan {
  return fromBinary(PlanSchema, toBinary(PlanSchema, plan));
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

function unionResultBinding(draft: DvtSubstraitUnionAllDraft) {
  const inputCount = nestedUnionInputCount(draft);
  return inputCount == null
    ? undefined
    : draft.sidecar.relations.find((relation) => relation.relAnchor === inputCount + 1);
}

function nestedUnionInputCount(draft: DvtSubstraitUnionAllDraft): number | null {
  const root = draft.plan.relations[0]?.relType;
  if (root?.case !== 'root' || root.value.input == null) return null;
  const rootInput = root.value.input.relType;
  const setType =
    rootInput.case === 'set'
      ? rootInput
      : rootInput.case === 'aggregate'
        ? rootInput.value.input?.relType
        : rootInput.case === 'project' && rootInput.value.input?.relType.case === 'aggregate'
          ? rootInput.value.input.relType.value.input?.relType
          : undefined;
  return setType?.case === 'set' && setType.value.inputs.length >= 2
    ? setType.value.inputs.length
    : null;
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
  const root = plan.relations[0]?.relType;
  const setRelType = root?.case === 'root' ? root.value.input?.relType : undefined;
  const inputCount = setRelType?.case === 'set' ? setRelType.value.inputs.length : 0;
  const resultRelAnchor = inputCount + 1;
  if (
    !hasPinnedPlanVersion(plan) ||
    plan.relations.length !== 1 ||
    plan.extensionUrns.length !== 0 ||
    plan.extensions.length !== 0 ||
    sidecar.schemaVersion !== DVT_SUBSTRAIT_AUTHORING_SIDECAR_SCHEMA_VERSION ||
    inputCount < 2 ||
    sidecar.relations.length !== resultRelAnchor ||
    new Set(sidecar.relations.map((relation) => relation.relationId)).size !== resultRelAnchor ||
    new Set(sidecar.relations.map((relation) => relation.relAnchor)).size !== resultRelAnchor ||
    new Set(sidecar.fields.map((field) => field.fieldId)).size !== sidecar.fields.length
  ) {
    return { ok: false };
  }
  if (root?.case !== 'root') return { ok: false };
  const names = root.value.names;
  if (
    names.length === 0 ||
    new Set(names).size !== names.length ||
    names.some((name) => name.length === 0 || name !== name.trim())
  ) {
    return { ok: false };
  }
  if (setRelType?.case !== 'set') return { ok: false };
  const setRelation = setRelType.value;
  if (
    setRelation.op !== SetRel_SetOp.UNION_ALL ||
    setRelation.advancedExtension != null ||
    setRelation.common?.relAnchor !== resultRelAnchor ||
    setRelation.common.hint != null ||
    setRelation.common.advancedExtension != null ||
    setRelation.common.emitKind.case !== 'emit'
  ) {
    return { ok: false };
  }

  const inputTables = setRelation.inputs.map(tableIdentity);
  if (
    inputTables.some((input) => input == null) ||
    inputTables.some(
      (input) => input?.fields.join('\u0000') !== inputTables[0]?.fields.join('\u0000')
    )
  ) {
    return { ok: false };
  }
  const firstTable = inputTables[0];
  if (firstTable == null) return { ok: false };
  const availableFields = firstTable.fields;
  const outputMapping = setRelation.common.emitKind.value.outputMapping;
  if (
    outputMapping.length !== names.length ||
    new Set(outputMapping).size !== outputMapping.length ||
    outputMapping.some(
      (mapping) => !Number.isInteger(mapping) || mapping < 0 || mapping >= availableFields.length
    )
  ) {
    return { ok: false };
  }
  if (
    setRelation.inputs.some(
      (input, index) =>
        input.relType.case !== 'read' || input.relType.value.common?.relAnchor !== index + 1
    )
  ) {
    return { ok: false };
  }

  const sourceBindings = Array.from({ length: inputCount }, (_, index) => index + 1).map((anchor) =>
    sidecar.relations.find((relation) => relation.relAnchor === anchor)
  );
  const resultBinding = sidecar.relations.find(
    (relation) => relation.relAnchor === resultRelAnchor
  );
  const firstBinding = sourceBindings[0];
  if (
    firstBinding == null ||
    resultBinding == null ||
    firstBinding.sourceRef == null ||
    resultBinding.sourceRef != null ||
    firstBinding.sourceRef.connectionRef.provider !== 'postgres' ||
    sourceBindings.some(
      (binding, index) =>
        binding?.sourceRef == null ||
        binding.sourceRef.connectionRef.provider !== 'postgres' ||
        !sameConnectionRef(
          firstBinding.sourceRef!.connectionRef,
          binding.sourceRef.connectionRef
        ) ||
        sourceBindings.some(
          (candidate, candidateIndex) =>
            candidateIndex !== index &&
            candidate?.sourceRef != null &&
            sameSourceRef(binding.sourceRef!, candidate.sourceRef)
        )
    )
  ) {
    return { ok: false };
  }
  const sourceNodeIds = sourceBindings.map((binding) =>
    binding == null ? null : sourceNodeIdFromRelationId(binding.relationId)
  );
  const targetNodeId = targetNodeIdFromResultRelationId(resultBinding.relationId);
  if (sourceNodeIds.some((nodeId) => nodeId == null) || targetNodeId == null) {
    return { ok: false };
  }
  if (
    sourceBindings.some((binding, index) => {
      const nodeId = sourceNodeIds[index];
      return (
        binding == null ||
        nodeId == null ||
        !validateFieldsForRelation({
          sidecar,
          relationId: binding.relationId,
          nodeId,
          names: availableFields,
        })
      );
    })
  ) {
    return { ok: false };
  }
  const resultFields = sidecar.fields
    .filter((field) => field.relationId === resultBinding.relationId)
    .sort((left, right) => left.outputOrdinal - right.outputOrdinal);
  if (
    resultFields.length !== names.length ||
    sidecar.fields.length !== availableFields.length * inputCount + names.length
  ) {
    return { ok: false };
  }
  const outputs = outputMapping.map((mapping, outputOrdinal) => {
    const fieldKey = availableFields[mapping];
    const name = names[outputOrdinal];
    const binding = resultFields[outputOrdinal];
    return fieldKey == null ||
      name == null ||
      binding == null ||
      binding.outputOrdinal !== outputOrdinal ||
      binding.fieldId !== `field:${targetNodeId}:${fieldKey}` ||
      binding.displayName !== name
      ? null
      : {
          fieldKey,
          name,
          fieldId: binding.fieldId,
          outputOrdinal,
        };
  });
  if (outputs.some((output) => output == null)) return { ok: false };
  const planSha256 = sha256Hex(toBinary(PlanSchema, plan));
  if (sidecar.semanticPlanSha256 !== ZERO_SHA256 && sidecar.semanticPlanSha256 !== planSha256) {
    return { ok: false };
  }

  return {
    ok: true,
    projection: {
      inputs: inputTables.map((table, index) => ({
        nodeId: sourceNodeIds[index]!,
        schema: table!.schema,
        table: table!.table,
        sourceRef: sourceBindings[index]!.sourceRef!,
      })),
      availableFields: availableFields.map((fieldKey) => ({
        fieldKey,
        defaultName: fieldKey,
      })),
      outputs: outputs.filter((output) => output != null),
    },
  };
}

export function applyDvtSubstraitUnionAllFieldEdit(
  draft: DvtSubstraitUnionAllDraft,
  edit: DvtSubstraitUnionAllFieldEdit
): DvtSubstraitUnionAllDraft {
  const inspection = inspectDvtSubstraitUnionAllDraft(draft);
  if (!inspection.ok) return draft;
  const resultBinding = unionResultBinding(draft);
  if (resultBinding == null) return draft;
  const targetNodeId = targetNodeIdFromResultRelationId(resultBinding.relationId);
  if (targetNodeId == null) return draft;

  let outputs = inspection.projection.outputs.map((output) => ({ ...output }));
  const currentIndex = outputs.findIndex((output) => output.fieldKey === edit.fieldKey);
  const availableField = inspection.projection.availableFields.find(
    (field) => field.fieldKey === edit.fieldKey
  );
  if (availableField == null) return draft;

  if (edit.kind === 'set-selected') {
    if (edit.selected === currentIndex >= 0) return draft;
    if (!edit.selected) {
      if (outputs.length === 1) return draft;
      outputs = outputs.filter((output) => output.fieldKey !== edit.fieldKey);
    } else {
      if (outputs.some((output) => output.name === availableField.defaultName)) return draft;
      outputs.push({
        fieldKey: availableField.fieldKey,
        name: availableField.defaultName,
        fieldId: `field:${targetNodeId}:${availableField.fieldKey}`,
        outputOrdinal: outputs.length,
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
    const current = outputs[currentIndex];
    const next = outputs[nextIndex];
    if (nextIndex < 0 || nextIndex >= outputs.length || current == null || next == null) {
      return draft;
    }
    outputs[currentIndex] = next;
    outputs[nextIndex] = current;
  }

  const plan = clonePlan(draft.plan);
  const root = plan.relations[0]?.relType;
  if (root?.case !== 'root' || root.value.input?.relType.case !== 'set') return draft;
  const setRelation = root.value.input.relType.value;
  if (setRelation.common?.emitKind.case !== 'emit') return draft;
  const outputMapping = outputs.map((output) =>
    inspection.projection.availableFields.findIndex(
      (available) => available.fieldKey === output.fieldKey
    )
  );
  if (outputMapping.some((mapping) => mapping < 0)) return draft;
  root.value.names = outputs.map((output) => output.name);
  setRelation.common.emitKind.value.outputMapping = outputMapping;

  const sidecar: DvtSubstraitAuthoringSidecarV1 = {
    ...draft.sidecar,
    semanticPlanSha256: ZERO_SHA256,
    fields: [
      ...draft.sidecar.fields.filter((field) => field.relationId !== resultBinding.relationId),
      ...outputs.map((output, outputOrdinal) => ({
        fieldId: output.fieldId,
        relationId: resultBinding.relationId,
        outputOrdinal,
        displayName: output.name,
      })),
    ],
  };
  const edited = { plan, sidecar };
  return inspectDvtSubstraitUnionAllDraft(edited).ok ? edited : draft;
}

type ValidUnionAllGrouping = Readonly<{
  baseDraft: DvtSubstraitUnionAllDraft;
  baseProjection: DvtSubstraitUnionAllProjection;
  projection: DvtSubstraitUnionAllGroupingProjection;
}>;

function hasUniqueSidecarIdentity(draft: DvtSubstraitUnionAllDraft): boolean {
  return (
    new Set(draft.sidecar.relations.map((relation) => relation.relationId)).size ===
      draft.sidecar.relations.length &&
    new Set(draft.sidecar.relations.map((relation) => relation.relAnchor)).size ===
      draft.sidecar.relations.length &&
    new Set(draft.sidecar.fields.map((field) => field.fieldId)).size === draft.sidecar.fields.length
  );
}

function hasCurrentSemanticHash(draft: DvtSubstraitUnionAllDraft): boolean {
  const planSha256 = sha256Hex(toBinary(PlanSchema, draft.plan));
  return (
    draft.sidecar.semanticPlanSha256 === ZERO_SHA256 ||
    draft.sidecar.semanticPlanSha256 === planSha256
  );
}

function unionTargetNodeId(draft: DvtSubstraitUnionAllDraft): string | null {
  const resultBinding = unionResultBinding(draft);
  return resultBinding == null ? null : targetNodeIdFromResultRelationId(resultBinding.relationId);
}

function inspectValidUnionAllGrouping(
  draft: DvtSubstraitUnionAllDraft
): ValidUnionAllGrouping | null {
  const inputCount = nestedUnionInputCount(draft);
  if (
    !hasPinnedPlanVersion(draft.plan) ||
    draft.plan.relations.length !== 1 ||
    draft.sidecar.schemaVersion !== DVT_SUBSTRAIT_AUTHORING_SIDECAR_SCHEMA_VERSION ||
    inputCount == null ||
    draft.sidecar.relations.length !== inputCount + 2 ||
    !hasUniqueSidecarIdentity(draft) ||
    !hasCurrentSemanticHash(draft)
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
    aggregate.common.relAnchor !== inputCount + 2 ||
    aggregate.common.emitKind.case !== undefined ||
    aggregate.common.hint != null ||
    aggregate.common.advancedExtension != null ||
    aggregate.advancedExtension != null ||
    aggregate.input?.relType.case !== 'set' ||
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
  const targetNodeId = unionTargetNodeId(draft);
  const unionBinding = unionResultBinding(draft);
  const aggregateBinding = draft.sidecar.relations.find(
    (relation) => relation.relAnchor === aggregate.common?.relAnchor
  );
  const aggregateRelationId =
    targetNodeId == null ? null : `relation:${targetNodeId}:union-all-aggregate`;
  if (
    targetNodeId == null ||
    unionBinding == null ||
    aggregateBinding == null ||
    aggregateBinding.relationId !== aggregateRelationId ||
    aggregateBinding.sourceRef != null ||
    aggregateBinding.displayName !== unionBinding.displayName
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
    countField.fieldId !== `field:${targetNodeId}:union-all-count` ||
    typeof countDisplayName !== 'string' ||
    countDisplayName !== root.value.names[1]
  ) {
    return null;
  }

  const basePlan = clonePlan(draft.plan);
  const baseRoot = basePlan.relations[0]?.relType;
  if (baseRoot?.case !== 'root' || baseRoot.value.input?.relType.case !== 'aggregate') {
    return null;
  }
  baseRoot.value.input = baseRoot.value.input.relType.value.input;
  removeDvtSubstraitCountExtension(basePlan);
  const baseFields = draft.sidecar.fields.flatMap((field) => {
    if (field.fieldId === countField.fieldId) return [];
    if (field.fieldId !== groupField.fieldId) return [field];
    return [
      {
        ...field,
        relationId: unionBinding.relationId,
        outputOrdinal: groupInputOrdinal,
        displayName: root.value.names[0]!,
      },
    ];
  });
  const baseOutputFields = baseFields
    .filter((field) => field.relationId === unionBinding.relationId)
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
  const baseDraft: DvtSubstraitUnionAllDraft = {
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
  const baseInspection = inspectDvtSubstraitUnionAllDraft(baseDraft);
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
  return {
    baseDraft,
    baseProjection: baseInspection.projection,
    projection: {
      inputs: baseInspection.projection.inputs,
      groupField: {
        fieldKey: baseGroupField.fieldKey,
        name: baseGroupField.name,
        fieldId: baseGroupField.fieldId,
        inputOrdinal: groupInputOrdinal,
      },
      measure: {
        name: countDisplayName,
        fieldId: countField.fieldId,
        capabilityId: DVT_SUBSTRAIT_COUNT_CAPABILITY_ID,
      },
      outputs: [
        { name: groupDisplayName, fieldId: groupField.fieldId, outputOrdinal: 0 },
        { name: countDisplayName, fieldId: countField.fieldId, outputOrdinal: 1 },
      ],
    },
  };
}

export function inspectDvtSubstraitUnionAllGroupingDraft(
  draft: DvtSubstraitUnionAllDraft
): DvtSubstraitUnionAllGroupingInspection {
  const valid = inspectValidUnionAllGrouping(draft);
  return valid == null ? { ok: false } : { ok: true, projection: valid.projection };
}

export function applyDvtSubstraitUnionAllGrouping(
  draft: DvtSubstraitUnionAllDraft,
  args: Readonly<{ groupFieldId: string; countOutputName: string }>
): DvtSubstraitUnionAllDraft {
  const inspection = inspectDvtSubstraitUnionAllDraft(draft);
  const countOutputName = args.countOutputName.trim();
  if (!inspection.ok || countOutputName.length === 0) return draft;
  const groupField = inspection.projection.outputs.find(
    (output) => output.fieldId === args.groupFieldId
  );
  if (groupField == null || groupField.name === countOutputName) return draft;
  const targetNodeId = unionTargetNodeId(draft);
  const unionBinding = unionResultBinding(draft);
  if (targetNodeId == null || unionBinding == null) return draft;

  const plan = clonePlan(draft.plan);
  const root = plan.relations[0]?.relType;
  if (root?.case !== 'root' || root.value.input?.relType.case !== 'set') return draft;
  const setInput = root.value.input;
  const aggregateAnchor =
    Math.max(0, ...draft.sidecar.relations.map((relation) => relation.relAnchor)) + 1;
  const countFunctionReference = ensureDvtSubstraitCountFunction(plan);
  root.value.input = create(RelSchema, {
    relType: {
      case: 'aggregate',
      value: create(AggregateRelSchema, {
        common: create(RelCommonSchema, { relAnchor: aggregateAnchor }),
        input: setInput,
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
  const aggregateRelationId = `relation:${targetNodeId}:union-all-aggregate`;
  const sidecar: DvtSubstraitAuthoringSidecarV1 = {
    ...draft.sidecar,
    semanticPlanSha256: ZERO_SHA256,
    relations: [
      ...draft.sidecar.relations,
      {
        relationId: aggregateRelationId,
        relAnchor: aggregateAnchor,
        displayName: unionBinding.displayName,
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
        fieldId: `field:${targetNodeId}:union-all-count`,
        relationId: aggregateRelationId,
        outputOrdinal: 1,
        displayName: countOutputName,
      },
    ],
  };
  const grouped = { plan, sidecar };
  return inspectValidUnionAllGrouping(grouped) == null ? draft : grouped;
}

export function renameDvtSubstraitUnionAllCountOutput(
  draft: DvtSubstraitUnionAllDraft,
  outputName: string
): DvtSubstraitUnionAllDraft {
  const valid = inspectValidUnionAllGrouping(draft);
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
  return inspectValidUnionAllGrouping(renamed) == null ? draft : renamed;
}

export function removeDvtSubstraitUnionAllGrouping(
  draft: DvtSubstraitUnionAllDraft
): DvtSubstraitUnionAllDraft {
  return inspectValidUnionAllGrouping(draft)?.baseDraft ?? draft;
}

type ValidUnionAllGroupedWindow = Readonly<{
  baseDraft: DvtSubstraitUnionAllDraft;
  projection: DvtSubstraitUnionAllGroupedWindowProjection;
}>;

function inspectValidUnionAllGroupedWindow(
  draft: DvtSubstraitUnionAllDraft
): ValidUnionAllGroupedWindow | null {
  const inputCount = nestedUnionInputCount(draft);
  if (
    !hasPinnedPlanVersion(draft.plan) ||
    draft.plan.relations.length !== 1 ||
    draft.sidecar.schemaVersion !== DVT_SUBSTRAIT_AUTHORING_SIDECAR_SCHEMA_VERSION ||
    inputCount == null ||
    draft.sidecar.relations.length !== inputCount + 3 ||
    !hasUniqueSidecarIdentity(draft) ||
    !hasCurrentSemanticHash(draft)
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
    project.common.relAnchor !== inputCount + 3 ||
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
  const targetNodeId = unionTargetNodeId(draft);
  const windowBinding = draft.sidecar.relations.find(
    (relation) => relation.relAnchor === project.common?.relAnchor
  );
  const unionBinding = unionResultBinding(draft);
  const windowRelationId =
    targetNodeId == null ? null : `relation:${targetNodeId}:union-all-aggregate-window`;
  const aggregateRelationId =
    targetNodeId == null ? null : `relation:${targetNodeId}:union-all-aggregate`;
  const resultFieldId = targetNodeId == null ? null : `field:${targetNodeId}:union-all-count-rank`;
  if (
    targetNodeId == null ||
    windowBinding == null ||
    unionBinding == null ||
    windowBinding.relationId !== windowRelationId ||
    windowBinding.sourceRef != null ||
    windowBinding.displayName !== unionBinding.displayName ||
    aggregateRelationId == null ||
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
  const baseDraft: DvtSubstraitUnionAllDraft = {
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
  const baseInspection = inspectDvtSubstraitUnionAllGroupingDraft(baseDraft);
  if (
    !baseInspection.ok ||
    outerFields[0]?.fieldId !== baseInspection.projection.groupField.fieldId ||
    outerFields[1]?.fieldId !== baseInspection.projection.measure.fieldId
  ) {
    return null;
  }
  return {
    baseDraft,
    projection: {
      inputs: baseInspection.projection.inputs,
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
          outputOrdinal: 0,
        },
        {
          name: root.value.names[1]!,
          fieldId: outerFields[1]!.fieldId,
          outputOrdinal: 1,
        },
        { name: root.value.names[2]!, fieldId: resultFieldId, outputOrdinal: 2 },
      ],
    },
  };
}

export function inspectDvtSubstraitUnionAllGroupedWindowDraft(
  draft: DvtSubstraitUnionAllDraft
): DvtSubstraitUnionAllGroupedWindowInspection {
  const valid = inspectValidUnionAllGroupedWindow(draft);
  return valid == null ? { ok: false } : { ok: true, projection: valid.projection };
}

export function applyDvtSubstraitUnionAllGroupedRowNumber(
  draft: DvtSubstraitUnionAllDraft,
  args: Readonly<{ outputName: string }>
): DvtSubstraitUnionAllDraft {
  const groupingInspection = inspectDvtSubstraitUnionAllGroupingDraft(draft);
  const outputName = args.outputName.trim();
  if (
    !groupingInspection.ok ||
    outputName.length === 0 ||
    groupingInspection.projection.outputs.some((output) => output.name === outputName)
  ) {
    return draft;
  }
  const targetNodeId = unionTargetNodeId(draft);
  const unionBinding = unionResultBinding(draft);
  if (targetNodeId == null || unionBinding == null) return draft;
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
  const aggregateRelationId = `relation:${targetNodeId}:union-all-aggregate`;
  const windowRelationId = `relation:${targetNodeId}:union-all-aggregate-window`;
  const resultFieldId = `field:${targetNodeId}:union-all-count-rank`;
  const sidecar: DvtSubstraitAuthoringSidecarV1 = {
    ...draft.sidecar,
    semanticPlanSha256: ZERO_SHA256,
    relations: [
      ...draft.sidecar.relations,
      {
        relationId: windowRelationId,
        relAnchor: relationAnchor,
        displayName: unionBinding.displayName,
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
  return inspectValidUnionAllGroupedWindow(composed) == null ? draft : composed;
}

export function renameDvtSubstraitUnionAllGroupedRowNumberOutput(
  draft: DvtSubstraitUnionAllDraft,
  outputName: string
): DvtSubstraitUnionAllDraft {
  const valid = inspectValidUnionAllGroupedWindow(draft);
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
  return inspectValidUnionAllGroupedWindow(renamed) == null ? draft : renamed;
}

export function removeDvtSubstraitUnionAllGroupedRowNumber(
  draft: DvtSubstraitUnionAllDraft
): DvtSubstraitUnionAllDraft {
  return inspectValidUnionAllGroupedWindow(draft)?.baseDraft ?? draft;
}

export function inspectDvtSubstraitUnionAllAcceptedDraft(draft: DvtSubstraitUnionAllDraft):
  | Readonly<{
      ok: true;
      projection: Readonly<{
        inputs: DvtSubstraitUnionAllProjection['inputs'];
        outputs: readonly Readonly<{
          name: string;
          fieldId: string;
          outputOrdinal: number;
        }>[];
      }>;
    }>
  | Readonly<{ ok: false }> {
  const groupedWindow = inspectDvtSubstraitUnionAllGroupedWindowDraft(draft);
  if (groupedWindow.ok) return groupedWindow;
  const grouping = inspectDvtSubstraitUnionAllGroupingDraft(draft);
  if (grouping.ok) return grouping;
  return inspectDvtSubstraitUnionAllDraft(draft);
}

export function decodeDvtSubstraitUnionAllDocument(input: unknown): DvtSubstraitUnionAllDraft {
  const document = canonicalizeDvtSubstraitSemanticDocumentV1(input);
  const plan = fromBinary(PlanSchema, base64Bytes(document.semanticPlan.bytesBase64));
  const draft = { plan, sidecar: document.sidecar };
  if (!inspectDvtSubstraitUnionAllAcceptedDraft(draft).ok) {
    throw new Error('Unsupported VTX2 UNION ALL Substrait shape.');
  }
  return draft;
}

export function encodeDvtSubstraitUnionAllDocument(
  draft: DvtSubstraitUnionAllDraft
): DvtSubstraitSemanticDocumentV1 {
  if (!inspectDvtSubstraitUnionAllAcceptedDraft(draft).ok) {
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
