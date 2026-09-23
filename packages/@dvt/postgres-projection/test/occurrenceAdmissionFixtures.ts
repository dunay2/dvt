import {
  ReadRelSchema,
  type Rel,
} from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import { clone } from '@bufbuild/protobuf';

import type { DvtSubstraitJoinDraft } from '../src/index.js';

import {
  relationAnchor,
  relationNodes,
  relationRoot,
  refreshDigest,
} from './relationIdentityFixtures.js';

export function readOccurrences(draft: DvtSubstraitJoinDraft): Rel[] {
  return relationNodes(relationRoot(draft)).filter((rel) => rel.relType.case === 'read');
}

/** Rebind an occurrence without changing its relation/field identities or output ordinals. */
export function repeatFirstSource(draft: DvtSubstraitJoinDraft): void {
  const reads = readOccurrences(draft);
  const source = reads[0]!;
  const target = reads.at(-1)!;
  if (source.relType.case !== 'read' || target.relType.case !== 'read')
    throw new Error('Read required');
  const targetAnchor = relationAnchor(target);
  const sourceBinding = draft.sidecar.relations.find(
    (rel) => rel.relAnchor === relationAnchor(source)
  )!;
  const targetBinding = draft.sidecar.relations.find((rel) => rel.relAnchor === targetAnchor)!;
  target.relType.value = clone(ReadRelSchema, source.relType.value);
  target.relType.value.common!.relAnchor = targetAnchor;
  targetBinding.sourceRef = globalThis.structuredClone(sourceBinding.sourceRef);
  targetBinding.displayName = 'Independent occurrence';
  for (const field of draft.sidecar.fields.filter(
    (field) => field.relationId === targetBinding.relationId
  )) {
    field.displayName = target.relType.value.baseSchema!.names[field.outputOrdinal]!;
  }
  refreshDigest(draft);
}

export function renameReadField(
  draft: DvtSubstraitJoinDraft,
  input: number,
  ordinal: number,
  name: string
): void {
  const rel = readOccurrences(draft)[input]!;
  if (rel.relType.case !== 'read') throw new Error('Read required');
  rel.relType.value.baseSchema!.names[ordinal] = name;
  const binding = draft.sidecar.relations.find(
    (binding) => binding.relAnchor === relationAnchor(rel)
  )!;
  draft.sidecar.fields.find(
    (field) => field.relationId === binding.relationId && field.outputOrdinal === ordinal
  )!.displayName = name;
  refreshDigest(draft);
}
