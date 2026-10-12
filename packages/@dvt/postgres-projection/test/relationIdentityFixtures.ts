import { readFileSync } from 'node:fs';
import { URL } from 'node:url';

import {
  CrossRelSchema,
  RelSchema,
  type Rel,
} from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import { create } from '@bufbuild/protobuf';
import {
  decodeDvtSubstraitPlanV1,
  DvtSubstraitSemanticDocumentV1Schema,
  encodeDvtSubstraitPlanV1,
} from '@dvt/contracts';

import type { DvtSubstraitJoinDraft } from '../src/index.js';

export function relationNodes(rel: Rel): Rel[] {
  const value = rel.relType;
  switch (value.case) {
    case 'read':
      return [rel];
    case 'join':
    case 'cross':
      return [rel, ...relationNodes(value.value.left!), ...relationNodes(value.value.right!)];
    case 'set':
      return [rel, ...value.value.inputs.flatMap(relationNodes)];
    default:
      throw new Error('Unexpected relation in identity fixture');
  }
}

export function relationRoot(draft: DvtSubstraitJoinDraft): Rel {
  const root = draft.plan.relations[0]!.relType;
  if (root.case !== 'root' || root.value.input == null) throw new Error('Missing fixture root');
  return root.value.input;
}

export function relationAnchor(rel: Rel): number {
  const value = rel.relType;
  if (
    value.case !== 'read' &&
    value.case !== 'join' &&
    value.case !== 'cross' &&
    value.case !== 'set'
  ) {
    throw new Error('Unexpected fixture relation');
  }
  return value.value.common!.relAnchor!;
}

export function setRelationAnchor(rel: Rel, anchor: number): void {
  const value = rel.relType;
  if (
    value.case !== 'read' &&
    value.case !== 'join' &&
    value.case !== 'cross' &&
    value.case !== 'set'
  ) {
    throw new Error('Unexpected fixture relation');
  }
  value.value.common!.relAnchor = anchor;
}

export function refreshDigest(draft: DvtSubstraitJoinDraft): void {
  draft.sidecar.semanticPlanSha256 = encodeDvtSubstraitPlanV1(draft.plan).sha256;
}

export function identityFixture(
  kind: 'join' | 'cross' | 'mixed-cross' | 'set'
): DvtSubstraitJoinDraft {
  const set = kind === 'set';
  const documents = JSON.parse(
    readFileSync(
      new URL(`./fixtures/${set ? 'set' : 'inner-join'}-documents.json`, import.meta.url),
      'utf8'
    )
  );
  const document = DvtSubstraitSemanticDocumentV1Schema.parse(
    documents[set ? 'unionDistinct' : 'three']
  );
  const draft = { plan: decodeDvtSubstraitPlanV1(document), sidecar: document.sidecar };
  if (kind === 'cross' || kind === 'mixed-cross') {
    const nodes = relationNodes(relationRoot(draft));
    for (const rel of kind === 'cross' ? nodes : nodes.slice(0, 1)) {
      if (rel.relType.case !== 'join') continue;
      const { common, left, right } = rel.relType.value;
      rel.relType = create(RelSchema, {
        relType: { case: 'cross', value: create(CrossRelSchema, { common, left, right }) },
      }).relType;
    }
  }
  refreshDigest(draft);
  return draft;
}

export function permuteAnchors(draft: DvtSubstraitJoinDraft): void {
  const remap = new Map(
    draft.sidecar.relations.map((binding, index) => [binding.relAnchor, 901 - index * 137])
  );
  for (const rel of relationNodes(relationRoot(draft)))
    setRelationAnchor(rel, remap.get(relationAnchor(rel))!);
  for (const binding of draft.sidecar.relations) binding.relAnchor = remap.get(binding.relAnchor)!;
  draft.sidecar.relations.reverse();
  refreshDigest(draft);
}
