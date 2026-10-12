/** Read the existing projected Filter presentation; mutations belong to canvasSelectedRelationFilter. */
import { fromBinary, toBinary } from '@bufbuild/protobuf';
import type { ProjectRel } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import { PlanSchema, type Plan } from '@buf/substrait_substrait.bufbuild_es/substrait/plan_pb.js';

import {
  inspectDvtSubstraitProjectionDraft,
  type DvtSubstraitProjectionDraft,
} from './canvasDvtSubstraitProjection';
import {
  dvtSubstraitTextComparison,
  type DvtSubstraitTextComparisonOperator,
} from './canvasDvtSubstraitTextComparison';

export type DvtSubstraitFilter = Readonly<{
  fieldId: string;
  fieldName: string;
  capabilityId: string;
  operator: DvtSubstraitTextComparisonOperator;
  value: string;
}>;

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
  operator: DvtSubstraitTextComparisonOperator;
  capabilityId: string;
  value: string;
}> | null {
  const plan = clonePlan(draft.plan);
  const project = rootProject(plan);
  const filter = project?.input?.relType;
  if (project == null || filter?.case !== 'filter') return null;
  const anchor = filter.value.common?.relAnchor;
  const comparison = dvtSubstraitTextComparison.inspect(plan, filter.value.condition);
  if (
    anchor == null ||
    comparison == null ||
    filter.value.input == null ||
    filter.value.common?.emitKind.case !== undefined ||
    filter.value.common?.hint != null ||
    filter.value.advancedExtension != null
  )
    return null;
  project.input = filter.value.input;
  dvtSubstraitTextComparison.removeDeclaration(plan, comparison);
  return {
    sourceOrdinal: comparison.sourceOrdinal,
    operator: comparison.operator,
    capabilityId: comparison.capabilityId,
    value: comparison.value,
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
  const fieldName = inspection.projection.inputFields[stripped.sourceOrdinal]?.name;
  const output = inspection.projection.outputs.find(
    (candidate) => candidate.sourceFieldName === fieldName
  );
  return fieldName == null || output == null
    ? null
    : {
        fieldId: output.fieldId,
        fieldName,
        capabilityId: stripped.capabilityId,
        operator: stripped.operator,
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
