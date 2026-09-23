/** Owns structural relation lookup and exact plan/sidecar binding, independent of anchor numbering. */
import type { Rel, RelCommon } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';

import type { DvtSubstraitJoinDraft } from './substraitJoinReadModel.js';

export function relationCommon(rel: Rel): RelCommon | undefined {
  switch (rel.relType.case) {
    case 'read':
    case 'project':
    case 'filter':
    case 'aggregate':
    case 'sort':
    case 'fetch':
    case 'join':
    case 'cross':
    case 'set':
      return rel.relType.value.common;
    default:
      return undefined;
  }
}

export function relationInputs(rel: Rel): readonly Rel[] | null {
  switch (rel.relType.case) {
    case 'read':
      return [];
    case 'project':
    case 'filter':
    case 'aggregate':
    case 'sort':
    case 'fetch':
      return rel.relType.value.input == null ? null : [rel.relType.value.input];
    case 'join':
    case 'cross': {
      const { left, right } = rel.relType.value;
      return left == null || right == null ? null : [left, right];
    }
    case 'set':
      return rel.relType.value.inputs;
    default:
      return null;
  }
}

export function indexDvtSubstraitRelations(
  draft: DvtSubstraitJoinDraft
): ReadonlyMap<number, Rel> | null {
  const root = draft.plan.relations[0]?.relType;
  if (draft.plan.relations.length !== 1 || root?.case !== 'root' || root.value.input == null)
    return null;
  const index = new Map<number, Rel>();
  const pending = [root.value.input];
  while (pending.length > 0) {
    const rel = pending.pop()!;
    const anchor = relationCommon(rel)?.relAnchor;
    const inputs = relationInputs(rel);
    if (
      anchor == null ||
      !Number.isInteger(anchor) ||
      anchor < 0 ||
      index.has(anchor) ||
      inputs == null
    )
      return null;
    index.set(anchor, rel);
    pending.push(...inputs);
  }
  const bindings = draft.sidecar.relations;
  const ids = new Set(bindings.map((binding) => binding.relationId));
  return bindings.length === index.size &&
    ids.size === bindings.length &&
    new Set(bindings.map((binding) => binding.relAnchor)).size === bindings.length &&
    bindings.every((binding) => index.has(binding.relAnchor)) &&
    draft.sidecar.fields.every((field) => ids.has(field.relationId))
    ? index
    : null;
}
