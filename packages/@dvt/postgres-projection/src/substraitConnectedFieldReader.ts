import type {
  ProjectRel,
  ReadRel,
  RelCommon,
} from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import {
  Type_Nullability,
  type Type,
} from '@buf/substrait_substrait.bufbuild_es/substrait/type_pb.js';
import type { DvtSubstraitFieldBindingV1 } from '@dvt/contracts';

import { hasExactAdmittedExtensions } from './substraitExtensionReader.js';
import { readProjectExpression } from './substraitProjectExpressionReader.js';
import type {
  DvtConnectedFieldNodeBinding,
  DvtConnectedFieldInspection,
  DvtSubstraitProjectionDraft,
} from './substraitProjectionReadModel.js';

const cleanCommon = (common: RelCommon | undefined): boolean =>
  common != null && common.hint == null && common.advancedExtension == null;

const validRead = (read: ReadRel): boolean =>
  cleanCommon(read.common) &&
  read.common?.emitKind.case === undefined &&
  read.baseSchema != null &&
  read.filter == null &&
  read.bestEffortFilter == null &&
  read.projection == null &&
  read.advancedExtension == null &&
  read.readType.case === 'namedTable' &&
  read.readType.value.advancedExtension == null;

const validProject = (project: ProjectRel): boolean =>
  cleanCommon(project.common) &&
  project.common?.emitKind.case === 'emit' &&
  project.advancedExtension == null;

function inspectSourceType(type: Type): string | null {
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

const fieldsFor = (
  draft: DvtSubstraitProjectionDraft,
  relationId: string
): DvtSubstraitFieldBindingV1[] =>
  draft.sidecar.fields
    .filter((field) => field.relationId === relationId)
    .slice()
    .sort((left, right) => left.outputOrdinal - right.outputOrdinal);

export function inspectDvtConnectedFieldProjection(
  draft: DvtSubstraitProjectionDraft,
  nodeBinding: DvtConnectedFieldNodeBinding
): DvtConnectedFieldInspection {
  const version = draft.plan.version;
  if (version?.majorNumber !== 0 || version.minorNumber !== 101 || version.patchNumber !== 0) {
    return { ok: false };
  }
  const root = draft.plan.relations.length === 1 ? draft.plan.relations[0]?.relType : undefined;
  if (root?.case !== 'root' || root.value.input?.relType.case !== 'project') return { ok: false };
  const project = root.value.input.relType.value;
  const readRel = project.input?.relType;
  if (!validProject(project) || readRel?.case !== 'read' || !validRead(readRel.value)) {
    return { ok: false };
  }
  const table = readRel.value.readType;
  if (table.case !== 'namedTable' || table.value.names.length !== 2) return { ok: false };
  const [schema, tableName] = table.value.names;
  const readAnchor = readRel.value.common?.relAnchor;
  const projectAnchor = project.common?.relAnchor;
  if (
    !schema ||
    !tableName ||
    readAnchor == null ||
    projectAnchor == null ||
    readAnchor === projectAnchor
  ) {
    return { ok: false };
  }
  const sourceBinding = draft.sidecar.relations.find(({ relAnchor }) => relAnchor === readAnchor);
  const targetBinding = draft.sidecar.relations.find(
    ({ relAnchor }) => relAnchor === projectAnchor
  );
  if (
    draft.sidecar.relations.length !== 2 ||
    sourceBinding?.sourceRef?.connectionRef.provider !== 'postgres' ||
    targetBinding == null ||
    targetBinding.sourceRef != null
  ) {
    return { ok: false };
  }
  const nodeIdentity = resolveNodeIdentity(nodeBinding);
  if (nodeIdentity == null) return { ok: false };
  const { sourceNodeId, targetNodeId } = nodeIdentity;
  const sourceFields = fieldsFor(draft, sourceBinding.relationId);
  const targetFields = fieldsFor(draft, targetBinding.relationId);
  const baseSchema = readRel.value.baseSchema;
  const sourceTypes = baseSchema?.struct?.types;
  const mappings = project.common?.emitKind;
  if (
    baseSchema == null ||
    sourceTypes == null ||
    baseSchema.names.length !== sourceFields.length ||
    sourceTypes.length !== sourceFields.length ||
    baseSchema.names.some((name, ordinal) => name !== sourceFields[ordinal]?.displayName) ||
    sourceTypes.some((type) => inspectSourceType(type) == null) ||
    mappings?.case !== 'emit' ||
    sourceFields.length === 0 ||
    targetFields.length !== root.value.names.length ||
    mappings.value.outputMapping.length !== targetFields.length ||
    sourceFields.some(
      (field, ordinal) => field.outputOrdinal !== ordinal || field.displayName == null
    ) ||
    targetFields.some(
      (field, ordinal) =>
        field.outputOrdinal !== ordinal || field.displayName !== root.value.names[ordinal]
    )
  ) {
    return { ok: false };
  }
  const usedExpressions = new Set<number>();
  const usedAnchors = new Set<number>();
  const outputs = mappings.value.outputMapping.map((mapping, outputOrdinal) => {
    const expressionOrdinal = mapping - sourceFields.length;
    const resolved =
      mapping < sourceFields.length
        ? ({ sourceOrdinal: mapping, operations: [] } as const)
        : project.expressions[expressionOrdinal] == null
          ? null
          : readProjectExpression(
              draft.plan,
              project.expressions[expressionOrdinal]!,
              sourceFields.length,
              usedAnchors
            );
    if (expressionOrdinal >= 0 && resolved != null) usedExpressions.add(expressionOrdinal);
    const source =
      resolved != null && 'sourceOrdinal' in resolved ? sourceFields[resolved.sourceOrdinal] : null;
    const calculation =
      resolved != null && 'calculation' in resolved ? resolved.calculation : undefined;
    const target = targetFields[outputOrdinal];
    if (
      resolved == null ||
      target == null ||
      (calculation == null && source == null) ||
      (source != null && source.displayName == null) ||
      (calculation == null && target.sourceFieldId !== source?.fieldId) ||
      (calculation != null && target.sourceFieldId !== undefined) ||
      (calculation?.kind === 'row-number' && calculation.orderSourceOrdinal >= sourceFields.length)
    ) {
      return null;
    }
    return {
      fieldId: target.fieldId,
      name: target.displayName!,
      ...(calculation == null
        ? { sourceFieldId: source!.fieldId, sourceFieldName: source!.displayName! }
        : { calculation }),
      dataType:
        calculation == null
          ? 'unknown'
          : calculation.kind === 'string-literal'
            ? 'string'
            : calculation.kind === 'timestamp-literal'
              ? 'timestamp with time zone'
              : 'bigint',
      outputOrdinal,
      ...(target.description == null ? {} : { description: target.description }),
      ...('operations' in resolved && resolved.operations.length > 0
        ? { operations: resolved.operations }
        : {}),
    };
  });
  if (
    outputs.some((output) => output == null) ||
    usedExpressions.size !== project.expressions.length ||
    !hasExactAdmittedExtensions(draft.plan, usedAnchors)
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
        table: tableName,
        sourceRef: sourceBinding.sourceRef,
        fields: sourceFields.map(({ displayName }, ordinal) => ({
          name: displayName!,
          dataType: inspectSourceType(sourceTypes[ordinal]!)!,
        })),
      },
      outputs: outputs.filter((output) => output != null),
    },
  };
}

function resolveNodeIdentity(
  binding: DvtConnectedFieldNodeBinding
): DvtConnectedFieldNodeBinding | null {
  if (
    binding.sourceNodeId.trim() !== binding.sourceNodeId ||
    binding.targetNodeId.trim() !== binding.targetNodeId ||
    binding.sourceNodeId.length === 0 ||
    binding.targetNodeId.length === 0 ||
    binding.sourceNodeId === binding.targetNodeId
  ) {
    return null;
  }
  return binding;
}
