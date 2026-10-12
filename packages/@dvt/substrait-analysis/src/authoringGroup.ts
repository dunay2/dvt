/**
 * Owned concern: project explicit authoring ownership from the validated relation index.
 * @baseline ADR-0064: Cards need not correspond one-to-one with logical relations.
 * @decision Return the original indexed members in canonical input order.
 * @consequence Consumers share grouping without copying semantics or guessing card boundaries.
 * @version 1.0.0
 */
import type { IndexedRelation, SubstraitRelationIndex } from './relationIndex.js';

export type SubstraitAuthoringGroup = Readonly<{
  root: IndexedRelation;
  members: readonly IndexedRelation[];
  inputId: string;
}>;

export function readSubstraitAuthoringGroup(
  index: SubstraitRelationIndex,
  rootId: string
): SubstraitAuthoringGroup | null {
  const root = index.relations.get(rootId);
  if (root == null || root.binding.authoringOwnerRelationId != null) return null;
  const members = [root];
  let input = index.relations.get(root.inputs[0]!);
  while (input?.binding.authoringOwnerRelationId === rootId) {
    members.push(input);
    input = index.relations.get(input.inputs[0]!);
  }
  if (members.length === 1 || input == null) return null;
  return { root, members: members.reverse(), inputId: input.binding.relationId };
}
