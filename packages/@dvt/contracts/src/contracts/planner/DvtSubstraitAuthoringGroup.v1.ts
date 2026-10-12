/**
 * Owned concern: validate explicit card ownership against canonical Project inputs.
 * @baseline ADR-0064: Identity metadata must not become a second semantic model.
 * @decision Resolve existing bindings and messages; never infer groups from adjacency.
 * @consequence Decode, indexing and atomic edits enforce the same group boundary.
 * @version 1.0.0
 */
import type { Rel } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';

import type { DvtSubstraitRelationBindingV1 } from './DvtSubstraitSemanticDocument.v1.js';

export type DvtSubstraitAuthoringGroupIssueV1 = Readonly<{
  relationId: string;
  message: string;
}>;

type RelationReader = (anchor: number) => Rel | undefined;

function groupChainMatches(
  owner: DvtSubstraitRelationBindingV1,
  memberCount: number,
  byAnchor: ReadonlyMap<number, DvtSubstraitRelationBindingV1>,
  read: RelationReader
): boolean {
  const seen = new Set<string>();
  let current = owner;
  while (true) {
    const relation = read(current.relAnchor)?.relType;
    if (relation?.case !== 'project') return false;
    const input = relation.value.input?.relType;
    if (input?.case == null || !('common' in input.value)) return false;
    const anchor = input.value.common?.relAnchor;
    const binding = anchor == null ? undefined : byAnchor.get(anchor);
    if (binding == null || read(binding.relAnchor) == null) return false;
    if (binding.authoringOwnerRelationId == null) return seen.size === memberCount;
    if (binding.authoringOwnerRelationId !== owner.relationId || seen.has(binding.relationId))
      return false;
    seen.add(binding.relationId);
    current = binding;
  }
}

/** The reader resolves unique current occurrences, including uncommitted staged messages. */
export function validateDvtSubstraitAuthoringGroupsV1(
  bindings: Iterable<DvtSubstraitRelationBindingV1>,
  read: RelationReader
): DvtSubstraitAuthoringGroupIssueV1 | null {
  const byId = new Map<string, DvtSubstraitRelationBindingV1>();
  const byAnchor = new Map<number, DvtSubstraitRelationBindingV1>();
  const counts = new Map<string, number>();
  for (const binding of bindings) {
    byId.set(binding.relationId, binding);
    byAnchor.set(binding.relAnchor, binding);
    const owner = binding.authoringOwnerRelationId;
    if (owner != null) counts.set(owner, (counts.get(owner) ?? 0) + 1);
  }
  for (const [ownerId, count] of counts) {
    const owner = byId.get(ownerId);
    if (
      owner == null ||
      owner.authoringOwnerRelationId != null ||
      !groupChainMatches(owner, count, byAnchor, read)
    ) {
      return {
        relationId: ownerId,
        message:
          'Invalid authoring group: expected one contiguous Project chain with an unowned public root and no external member consumers.',
      };
    }
  }
  return null;
}
