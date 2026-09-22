/** Owned concern: derive a transient query subtree by stable relation identity, never mutate authoring. */
import type { Rel, RelCommon } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import { PlanSchema } from '@buf/substrait_substrait.bufbuild_es/substrait/plan_pb.js';
import { clone, toBinary } from '@bufbuild/protobuf';
import { DvtSubstraitAuthoringSidecarV1Schema } from '@dvt/contracts';
import { sha256Hex } from '@dvt/crypto';

import { DvtSubstraitPostgresProjectionError } from './dvtProjection.js';
import { flattenDvtSubstraitCrossTree } from './substraitCrossReader.js';
import {
  flattenNInputJoinTree,
  hasCurrentJoinSemanticHash,
  hasUniqueJoinSidecarIdentity,
} from './substraitJoinInspectionGuards.js';
import type { DvtSubstraitJoinDraft } from './substraitJoinReadModel.js';

function reject(): never {
  throw new DvtSubstraitPostgresProjectionError(
    'unsupported_shape',
    'The selected relation does not resolve to an admitted protected subtree.'
  );
}

function children(rel: Rel): readonly Rel[] {
  switch (rel.relType.case) {
    case 'read':
      return [];
    case 'project':
    case 'filter':
    case 'aggregate':
    case 'sort':
    case 'fetch':
      return rel.relType.value.input == null ? reject() : [rel.relType.value.input];
    case 'join': {
      const { left, right } = rel.relType.value;
      return left == null || right == null ? reject() : [left, right];
    }
    case 'cross': {
      const { left, right } = rel.relType.value;
      return left == null || right == null ? reject() : [left, right];
    }
    case 'set':
      return rel.relType.value.inputs;
    default:
      return reject();
  }
}

function common(rel: Rel): RelCommon {
  switch (rel.relType.case) {
    case 'read':
    case 'project':
    case 'filter':
    case 'aggregate':
    case 'sort':
    case 'fetch':
    case 'join':
    case 'set':
    case 'cross':
      return rel.relType.value.common ?? reject();
    default:
      return reject();
  }
}

function descendants(rel: Rel): Rel[] {
  return [rel, ...children(rel).flatMap(descendants)];
}

function orderedSelectionRelations(rel: Rel, included: readonly Rel[]): readonly Rel[] {
  switch (rel.relType.case) {
    case 'project':
    case 'filter':
    case 'aggregate':
    case 'sort':
    case 'fetch': {
      const input = rel.relType.value.input ?? reject();
      return [...orderedSelectionRelations(input, descendants(input)), rel];
    }
  }
  const joinTree = flattenNInputJoinTree(rel);
  if (joinTree != null) return [...joinTree.reads, ...joinTree.joins];

  const crossTree = flattenDvtSubstraitCrossTree(rel);
  if (crossTree != null) return [...crossTree.reads, ...crossTree.crosses];

  if (rel.relType.case === 'set') {
    return [...rel.relType.value.inputs.flatMap(descendants), rel];
  }

  return included;
}

export function selectDvtSubstraitRelation(
  draft: DvtSubstraitJoinDraft,
  relationId: string
): DvtSubstraitJoinDraft {
  if (!hasUniqueJoinSidecarIdentity(draft) || !hasCurrentJoinSemanticHash(draft)) reject();
  const binding = draft.sidecar.relations.find((relation) => relation.relationId === relationId);
  if (binding == null || draft.plan.relations.length !== 1) reject();
  const plan = clone(PlanSchema, draft.plan);
  const root = plan.relations[0]?.relType;
  if (root?.case !== 'root' || root.value.input == null) reject();
  const relations = descendants(root.value.input);
  if (new Set(relations.map((rel) => common(rel).relAnchor)).size !== relations.length) reject();
  const selected = relations.find((rel) => common(rel).relAnchor === binding.relAnchor);
  if (selected == null) reject();
  const included = descendants(selected);
  const anchors = new Set(included.map((rel) => common(rel).relAnchor));
  const bindings = draft.sidecar.relations.filter((relation) => anchors.has(relation.relAnchor));
  if (bindings.length !== included.length) reject();
  const ids = new Set(bindings.map((relation) => relation.relationId));
  const fields = draft.sidecar.fields.filter((field) => ids.has(field.relationId));
  root.value.input = selected;
  root.value.names = fields
    .filter((field) => field.relationId === relationId)
    .sort((left, right) => left.outputOrdinal - right.outputOrdinal)
    .map((field) => field.displayName ?? reject());

  // Existing JOIN admission uses read-first anchors. Rebase only the transient copy;
  // stable RelationIds/FieldIds and the persisted plan remain unchanged.
  const ordered = orderedSelectionRelations(selected, included);
  const remap = new Map(ordered.map((rel, index) => [common(rel).relAnchor, index + 1]));
  for (const rel of ordered) common(rel).relAnchor = remap.get(common(rel).relAnchor)!;
  return {
    plan,
    sidecar: DvtSubstraitAuthoringSidecarV1Schema.parse({
      ...draft.sidecar,
      semanticPlanSha256: sha256Hex(toBinary(PlanSchema, plan)),
      relations: bindings.map((relation) => ({
        ...relation,
        relAnchor: remap.get(relation.relAnchor)!,
      })),
      fields,
    }),
  };
}
