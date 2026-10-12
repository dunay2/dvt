/**
 * Owned concern: index canonical messages and validate structural identity boundaries.
 * @baseline ADR-0064: One Plan and identity sidecar, without a second semantic model.
 * @decision Reuse the contract group invariant before exposing indexed relations.
 * @consequence Readers cannot observe orphaned or externally shared internal members.
 * @version 1.0.0
 */
import type { Rel } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import {
  DvtSubstraitAuthoringSidecarV1Schema,
  validateDvtSubstraitAuthoringGroupsV1,
  type DvtSubstraitFieldBindingV1,
  type DvtSubstraitRelationBindingV1,
} from '@dvt/contracts';

import { SubstraitAnalysisError, type SubstraitDocument } from './document.js';
import { readRelationStructure } from './relationStructure.js';

export type IndexedRelation = Readonly<{
  relation: Rel;
  binding: DvtSubstraitRelationBindingV1;
  inputs: readonly string[];
  consumers: readonly string[];
  fields: readonly DvtSubstraitFieldBindingV1[];
}>;
export type SubstraitRelationIndex = Readonly<{
  rootId: string;
  relations: ReadonlyMap<string, IndexedRelation>;
  byAnchor: ReadonlyMap<number, string>;
  fields: ReadonlyMap<string, DvtSubstraitFieldBindingV1>;
  postorder: readonly string[];
}>;
type MutableRelation = {
  relation: Rel;
  binding: DvtSubstraitRelationBindingV1;
  inputs: string[];
  consumers: string[];
  fields: DvtSubstraitFieldBindingV1[];
};

export type RelationIndexResult =
  | Readonly<{ ok: true; index: SubstraitRelationIndex }>
  | Readonly<{ ok: false; error: SubstraitAnalysisError }>;

export function indexSubstraitRelations(document: SubstraitDocument): RelationIndexResult {
  try {
    return { ok: true, index: buildRelationIndex(document) };
  } catch (error) {
    if (error instanceof SubstraitAnalysisError) return { ok: false, error };
    throw error;
  }
}

function buildRelationIndex(document: SubstraitDocument): SubstraitRelationIndex {
  const root = document.plan.relations[0]?.relType;
  if (document.plan.relations.length !== 1 || root?.case !== 'root' || root.value.input == null) {
    throw new SubstraitAnalysisError(
      'invalid_structure',
      'Expected one rooted Substrait relation.'
    );
  }
  if (!DvtSubstraitAuthoringSidecarV1Schema.safeParse(document.sidecar).success) {
    throw new SubstraitAnalysisError(
      'invalid_binding',
      'Invalid relation or field identity bindings.'
    );
  }
  const bindings = new Map(
    document.sidecar.relations.map((binding) => [binding.relAnchor, binding])
  );
  const byAnchor = new Map<number, string>();
  const relations = new Map<string, MutableRelation>();
  const preorder: string[] = [];
  const pending: { relation: Rel; consumer?: string }[] = [{ relation: root.value.input }];
  while (pending.length > 0) {
    const { relation, consumer } = pending.pop()!;
    const { common, inputs } = readRelationStructure(relation);
    const anchor = common?.relAnchor;
    const binding = anchor == null ? undefined : bindings.get(anchor);
    if (binding == null || byAnchor.has(binding.relAnchor)) {
      throw new SubstraitAnalysisError(
        'invalid_binding',
        'Every relation occurrence must have one unique anchor and binding.'
      );
    }
    const id = binding.relationId;
    if (binding.producerRef != null && relation.relType.case !== 'read')
      throw new SubstraitAnalysisError(
        'invalid_binding',
        'Only an input Read can reference a producer.'
      );
    byAnchor.set(binding.relAnchor, id);
    relations.set(id, {
      relation,
      binding,
      inputs: [],
      consumers: consumer == null ? [] : [consumer],
      fields: [],
    });
    preorder.push(id);
    if (consumer != null) relations.get(consumer)!.inputs.push(id);
    // Right-first preorder reversed below gives left-to-right postorder.
    for (const input of inputs) pending.push({ relation: input, consumer: id });
  }
  if (relations.size !== bindings.size) {
    throw new SubstraitAnalysisError('invalid_binding', 'A relation binding is outside the plan.');
  }
  const groupIssue = validateDvtSubstraitAuthoringGroupsV1(
    bindings.values(),
    (anchor) => relations.get(byAnchor.get(anchor)!)?.relation
  );
  if (groupIssue != null)
    throw new SubstraitAnalysisError('invalid_binding', groupIssue.message, groupIssue.relationId);
  const fields = new Map<string, DvtSubstraitFieldBindingV1>();
  for (const field of document.sidecar.fields) {
    fields.set(field.fieldId, field);
    relations.get(field.relationId)!.fields.push(field);
  }
  for (const entry of relations.values()) {
    entry.inputs.reverse();
    entry.fields.sort((a, b) => a.outputOrdinal - b.outputOrdinal);
  }
  return { rootId: preorder[0]!, relations, byAnchor, fields, postorder: preorder.reverse() };
}
