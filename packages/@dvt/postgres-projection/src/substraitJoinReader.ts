/** Owns document admission and orchestration of the shared JOIN inspection component. */
import { DVT_SUBSTRAIT_AUTHORING_SIDECAR_SCHEMA_VERSION } from '@dvt/contracts';
import { indexSubstraitRelations } from '@dvt/substrait-analysis';

import { inspectJoinStages } from './join-inspection/stages.js';
import {
  hasPinnedPlanVersion,
  hasUniqueJoinSidecarIdentity,
  hasCurrentJoinSemanticHash,
  flattenNInputJoinTree,
} from './substraitJoinInspectionGuards.js';
import type {
  DvtSubstraitJoinDraft,
  DvtSubstraitNInputJoinInspection,
  InspectedJoinStructure,
} from './substraitJoinReadModel.js';
import { inspectReadInputs } from './substraitReadInputs.js';

export function inspectNInputJoinStructure(
  draft: DvtSubstraitJoinDraft
): InspectedJoinStructure | null {
  const { plan, sidecar } = draft;
  if (
    !hasPinnedPlanVersion(plan) ||
    plan.relations.length !== 1 ||
    sidecar.schemaVersion !== DVT_SUBSTRAIT_AUTHORING_SIDECAR_SCHEMA_VERSION ||
    !hasUniqueJoinSidecarIdentity(draft) ||
    !hasCurrentJoinSemanticHash(draft) ||
    !indexSubstraitRelations(draft).ok
  ) {
    return null;
  }
  const root = plan.relations[0]?.relType;
  if (
    root?.case !== 'root' ||
    root.value.input == null ||
    root.value.names.some((name) => name.length === 0) ||
    new Set(root.value.names).size !== root.value.names.length
  ) {
    return null;
  }
  const tree = flattenNInputJoinTree(root.value.input);
  if (
    tree == null ||
    tree.reads.length < 2 ||
    tree.joins.length !== tree.reads.length - 1 ||
    sidecar.relations.length !== tree.reads.length + tree.joins.length
  ) {
    return null;
  }

  const inputs = inspectReadInputs(draft, tree.reads);
  return inputs == null ? null : inspectJoinStages(draft, root.value.names, inputs, tree.joins);
}

export function inspectDvtSubstraitJoinDraft(
  draft: DvtSubstraitJoinDraft
): DvtSubstraitNInputJoinInspection {
  const structure = inspectNInputJoinStructure(draft);
  return structure == null
    ? { ok: false }
    : {
        ok: true,
        projection: {
          inputs: structure.inputs,
          joinRelations: structure.stages.map((stage) => ({
            relationId: stage.relationId,
            relAnchor: stage.relAnchor,
            joinType: stage.joinType,
          })),
          stageOutputs: structure.stages.map((stage) =>
            stage.fields.map(({ sourceFieldId }) => ({ sourceFieldId }))
          ),
          joins: structure.joins,
          outputs: structure.outputs,
        },
      };
}
