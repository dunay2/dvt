/** Owned concern: derive a transient query subtree by stable relation identity, never mutate authoring. */
import type { Rel } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import { PlanSchema } from '@buf/substrait_substrait.bufbuild_es/substrait/plan_pb.js';
import { clone, toBinary } from '@bufbuild/protobuf';
import { DvtSubstraitAuthoringSidecarV1Schema } from '@dvt/contracts';
import { sha256Hex } from '@dvt/crypto';

import { DvtSubstraitPostgresProjectionError } from './dvtProjection.js';
import {
  hasCurrentJoinSemanticHash,
  hasUniqueJoinSidecarIdentity,
} from './substraitJoinInspectionGuards.js';
import type { DvtSubstraitJoinDraft } from './substraitJoinReadModel.js';
import {
  indexDvtSubstraitRelations,
  relationCommon,
  relationInputs,
} from './substraitRelationBindings.js';

function reject(): never {
  throw new DvtSubstraitPostgresProjectionError(
    'unsupported_shape',
    'The selected relation does not resolve to an admitted protected subtree.'
  );
}

function descendants(rel: Rel): Rel[] {
  return [rel, ...(relationInputs(rel) ?? reject()).flatMap(descendants)];
}

export function selectDvtSubstraitRelation(
  draft: DvtSubstraitJoinDraft,
  relationId: string
): DvtSubstraitJoinDraft {
  if (!hasUniqueJoinSidecarIdentity(draft) || !hasCurrentJoinSemanticHash(draft)) reject();
  if (indexDvtSubstraitRelations(draft) == null) reject();
  const binding = draft.sidecar.relations.find((relation) => relation.relationId === relationId);
  if (binding == null || draft.plan.relations.length !== 1) reject();
  const plan = clone(PlanSchema, draft.plan);
  const root = plan.relations[0]?.relType;
  if (root?.case !== 'root' || root.value.input == null) reject();
  const relations = descendants(root.value.input);
  const selected = relations.find((rel) => relationCommon(rel)?.relAnchor === binding.relAnchor);
  if (selected == null) reject();
  const included = descendants(selected);
  const anchors = new Set(included.map((rel) => relationCommon(rel)?.relAnchor));
  const bindings = draft.sidecar.relations.filter((relation) => anchors.has(relation.relAnchor));
  if (bindings.length !== included.length) reject();
  const ids = new Set(bindings.map((relation) => relation.relationId));
  const fields = draft.sidecar.fields.filter((field) => ids.has(field.relationId));
  root.value.input = selected;
  root.value.names = fields
    .filter((field) => field.relationId === relationId)
    .sort((left, right) => left.outputOrdinal - right.outputOrdinal)
    .map((field) => field.displayName ?? reject());

  return {
    plan,
    sidecar: DvtSubstraitAuthoringSidecarV1Schema.parse({
      ...draft.sidecar,
      semanticPlanSha256: sha256Hex(toBinary(PlanSchema, plan)),
      relations: bindings,
      fields,
    }),
  };
}
