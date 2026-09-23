import {
  CrossRelSchema,
  ReadRelSchema,
  type Rel,
} from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import { clone, create } from '@bufbuild/protobuf';
import {
  decodeDvtSubstraitPlanV1,
  encodeDvtSubstraitPlanV1,
  DvtTransformAuthoringAuthorityV1Schema,
} from '@dvt/contracts';
import type { DvtSubstraitJoinDraft } from '@dvt/postgres-projection';

import { buildDvtJoinPreviewDraft } from './dvtJoinPreviewFixture.js';
import { buildDvtSetPreviewDraft } from './dvtSetPreviewFixture.js';

export function relationRoot(draft: DvtSubstraitJoinDraft): Rel {
  const root = draft.plan.relations[0]!.relType;
  if (root.case !== 'root' || root.value.input == null) throw new Error('Root required');
  return root.value.input;
}

function fixtureRelations(rel: Rel): Rel[] {
  const type = rel.relType;
  switch (type.case) {
    case 'read':
      return [rel];
    case 'join':
    case 'cross':
      return [rel, ...fixtureRelations(type.value.left!), ...fixtureRelations(type.value.right!)];
    case 'set':
      return [rel, ...type.value.inputs.flatMap(fixtureRelations)];
    default:
      throw new Error('Unexpected fixture relation');
  }
}

export function refreshDigest(draft: DvtSubstraitJoinDraft): void {
  draft.sidecar.semanticPlanSha256 = encodeDvtSubstraitPlanV1(draft.plan).sha256;
}

export function identityFixture(
  kind: 'join' | 'cross' | 'mixed-cross' | 'set'
): DvtSubstraitJoinDraft {
  const workspace = kind === 'set' ? buildDvtSetPreviewDraft() : buildDvtJoinPreviewDraft(3);
  const authority = DvtTransformAuthoringAuthorityV1Schema.parse(
    workspace.nodes.find((node) => node.role === 'transform')!.metadata!.transformAuthoring
  );
  const document = authority.semanticDocument;
  const draft = { plan: decodeDvtSubstraitPlanV1(document), sidecar: document.sidecar };
  const relations = fixtureRelations(relationRoot(draft));
  if (kind === 'cross' || kind === 'mixed-cross') {
    for (const rel of kind === 'cross' ? relations : relations.slice(0, 1)) {
      if (rel.relType.case !== 'join') continue;
      const { common, left, right } = rel.relType.value;
      rel.relType = { case: 'cross', value: create(CrossRelSchema, { common, left, right }) };
    }
  }
  refreshDigest(draft);
  return draft;
}

export function repeatFirstSource(draft: DvtSubstraitJoinDraft): void {
  const reads = fixtureRelations(relationRoot(draft)).filter((rel) => rel.relType.case === 'read');
  const source = reads[0]!.relType;
  const target = reads.at(-1)!.relType;
  if (source.case !== 'read' || target.case !== 'read') throw new Error('Read required');
  const anchor = target.value.common!.relAnchor;
  const sourceBinding = draft.sidecar.relations.find(
    (binding) => binding.relAnchor === source.value.common!.relAnchor
  )!;
  const targetBinding = draft.sidecar.relations.find((binding) => binding.relAnchor === anchor)!;
  target.value = clone(ReadRelSchema, source.value);
  target.value.common!.relAnchor = anchor;
  targetBinding.sourceRef = globalThis.structuredClone(sourceBinding.sourceRef);
  draft.sidecar.fields
    .filter((field) => field.relationId === targetBinding.relationId)
    .forEach((field) => {
      field.displayName = target.value.baseSchema!.names[field.outputOrdinal]!;
    });
  refreshDigest(draft);
}

export function renameReadField(
  draft: DvtSubstraitJoinDraft,
  input: number,
  ordinal: number,
  name: string
): void {
  const rel = fixtureRelations(relationRoot(draft)).filter((rel) => rel.relType.case === 'read')[
    input
  ]!.relType;
  if (rel.case !== 'read') throw new Error('Read required');
  rel.value.baseSchema!.names[ordinal] = name;
  const binding = draft.sidecar.relations.find(
    (binding) => binding.relAnchor === rel.value.common!.relAnchor
  )!;
  draft.sidecar.fields.find(
    (field) => field.relationId === binding.relationId && field.outputOrdinal === ordinal
  )!.displayName = name;
  refreshDigest(draft);
}
