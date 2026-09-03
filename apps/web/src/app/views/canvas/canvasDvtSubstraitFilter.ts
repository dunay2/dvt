/** Owned concern: author and inspect one admitted FilterRel on a field projection. */
import { create, fromBinary, toBinary } from '@bufbuild/protobuf';
import {
  FilterRelSchema,
  RelCommonSchema,
  RelSchema,
  type ProjectRel,
} from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import { PlanSchema, type Plan } from '@buf/substrait_substrait.bufbuild_es/substrait/plan_pb.js';
import {
  DVT_SUBSTRAIT_CAPABILITY_CATALOG_V1,
  buildDvtSubstraitStandardCapabilityId,
} from '@dvt/contracts';

import {
  inspectDvtSubstraitProjectionDraft,
  type DvtSubstraitProjectionDraft,
} from './canvasDvtSubstraitProjection';
import { dvtSubstraitTextEquality } from './canvasDvtSubstraitTextEquality';

const FILTER_ID = buildDvtSubstraitStandardCapabilityId('relation', {
  sourceKind: 'core',
  message: 'substrait.FilterRel',
});
const STRING_TYPES = new Set(['text', 'string', 'varchar', 'character varying', 'char']);

export type DvtSubstraitFilter = Readonly<{
  fieldId: string;
  fieldName: string;
  capabilityId: string;
  value: string;
}>;

export function resolveDvtSubstraitFilterCapabilities(args: {
  dataType: string;
  provider: string;
}): readonly Readonly<{ capabilityId: string; name: string }>[] {
  const supported = new Set(
    DVT_SUBSTRAIT_CAPABILITY_CATALOG_V1.entries.flatMap((entry) =>
      entry.kind === 'standard' && entry.profileStatus === 'supported-profile'
        ? [entry.entryId]
        : []
    )
  );
  return args.provider === 'postgres' &&
    STRING_TYPES.has(args.dataType.trim().toLowerCase()) &&
    supported.has(FILTER_ID) &&
    supported.has(dvtSubstraitTextEquality.capabilityId)
    ? [{ capabilityId: dvtSubstraitTextEquality.capabilityId, name: 'equal' }]
    : [];
}

function clonePlan(plan: Plan): Plan {
  return fromBinary(PlanSchema, toBinary(PlanSchema, plan));
}

function rootProject(plan: Plan): ProjectRel | null {
  const root = plan.relations.length === 1 ? plan.relations[0]?.relType : undefined;
  return root?.case === 'root' && root.value.input?.relType.case === 'project'
    ? root.value.input.relType.value
    : null;
}

function stripFilter(draft: DvtSubstraitProjectionDraft): Readonly<{
  draft: DvtSubstraitProjectionDraft;
  sourceOrdinal: number;
  value: string;
}> | null {
  const plan = clonePlan(draft.plan);
  const project = rootProject(plan);
  const filter = project?.input?.relType;
  if (project == null || filter?.case !== 'filter') return null;
  const anchor = filter.value.common?.relAnchor;
  const equality = dvtSubstraitTextEquality.inspect(plan, filter.value.condition);
  if (
    anchor == null ||
    equality == null ||
    filter.value.input == null ||
    filter.value.common?.emitKind.case !== undefined ||
    filter.value.common?.hint != null ||
    filter.value.advancedExtension != null
  )
    return null;
  project.input = filter.value.input;
  dvtSubstraitTextEquality.removeDeclaration(plan, equality);
  return {
    sourceOrdinal: equality.sourceOrdinal,
    value: equality.value,
    draft: {
      plan,
      sidecar: {
        ...draft.sidecar,
        relations: draft.sidecar.relations.filter((relation) => relation.relAnchor !== anchor),
      },
    },
  };
}

export function inspectDvtSubstraitFilter(
  draft: DvtSubstraitProjectionDraft
): DvtSubstraitFilter | null {
  const stripped = stripFilter(draft);
  const inspection = stripped == null ? null : inspectDvtSubstraitProjectionDraft(stripped.draft);
  if (stripped == null || inspection?.ok !== true) return null;
  const fieldName = inspection.projection.source.fields[stripped.sourceOrdinal]?.name;
  const output = inspection.projection.outputs.find(
    (candidate) => candidate.sourceFieldName === fieldName
  );
  return fieldName == null || output == null
    ? null
    : {
        fieldId: output.fieldId,
        fieldName,
        capabilityId: dvtSubstraitTextEquality.capabilityId,
        value: stripped.value,
      };
}

export function removeDvtSubstraitFilter(
  draft: DvtSubstraitProjectionDraft
): DvtSubstraitProjectionDraft {
  const stripped = stripFilter(draft);
  return stripped != null && inspectDvtSubstraitProjectionDraft(stripped.draft).ok
    ? stripped.draft
    : draft;
}

export function applyDvtSubstraitFilter(
  draft: DvtSubstraitProjectionDraft,
  request: Readonly<{ fieldId: string; dataType: string; capabilityId: string; value: string }>
): DvtSubstraitProjectionDraft {
  const base = removeDvtSubstraitFilter(draft);
  const inspection = inspectDvtSubstraitProjectionDraft(base);
  if (!inspection.ok) return draft;
  const output = inspection.projection.outputs.find((entry) => entry.fieldId === request.fieldId);
  const sourceOrdinal = inspection.projection.source.fields.findIndex(
    (field) => field.name === output?.sourceFieldName
  );
  const sourceField = inspection.projection.source.fields[sourceOrdinal];
  if (
    output == null ||
    sourceField == null ||
    request.capabilityId !== dvtSubstraitTextEquality.capabilityId ||
    resolveDvtSubstraitFilterCapabilities({
      dataType: request.dataType,
      provider: inspection.projection.source.sourceRef.connectionRef.provider,
    }).length === 0
  )
    return draft;
  const plan = clonePlan(base.plan);
  const project = rootProject(plan);
  if (project?.input == null) return draft;
  const anchor = Math.max(0, ...base.sidecar.relations.map((relation) => relation.relAnchor)) + 1;
  project.input = create(RelSchema, {
    relType: {
      case: 'filter',
      value: create(FilterRelSchema, {
        common: create(RelCommonSchema, { relAnchor: anchor }),
        input: project.input,
        condition: dvtSubstraitTextEquality.create(plan, sourceOrdinal, request.value),
      }),
    },
  });
  return {
    plan,
    sidecar: {
      ...base.sidecar,
      relations: [
        ...base.sidecar.relations,
        {
          relationId: `relation:${inspection.projection.targetNodeId}:filter`,
          relAnchor: anchor,
          displayName: 'filter',
        },
      ],
    },
  };
}
