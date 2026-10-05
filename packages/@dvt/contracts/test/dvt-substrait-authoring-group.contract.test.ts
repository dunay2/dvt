/**
 * Owned concern: prove identity-only grouping against the serialized canonical Plan.
 * @baseline ADR-0064: Card identity must not duplicate Substrait semantics.
 * @decision Exercise the existing V1 document boundary, including hostile ownership.
 * @consequence Invalid groups cannot be persisted as apparently valid documents.
 * @version 1.0.0
 */
import {
  RelSchema,
  type Rel,
  type RelRoot,
  type ProjectRel,
} from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import { create } from '@bufbuild/protobuf';
import { describe, expect, it } from 'vitest';

import {
  DvtSubstraitSemanticDocumentV1Schema,
  decodeDvtSubstraitPlanV1,
  encodeDvtSubstraitPlanV1,
  type DvtSubstraitSemanticDocumentV1,
} from '../src/substrait.js';

import { buildDvtSubstraitSemanticDocumentFixture } from './fixtures/dvtSubstraitSemanticDocument.js';

function groupFixture(): Readonly<{
  document: DvtSubstraitSemanticDocumentV1;
  root: RelRoot;
  project: ProjectRel;
  member: Rel;
  ownerId: string;
  encode: () => DvtSubstraitSemanticDocumentV1;
}> {
  const document = buildDvtSubstraitSemanticDocumentFixture();
  const plan = decodeDvtSubstraitPlanV1(document);
  const root = plan.relations[0]!.relType;
  if (root.case !== 'root' || root.value.input?.relType.case !== 'project')
    throw new Error('Expected the canonical Project fixture.');
  const project = root.value.input.relType.value;
  const ownerId = document.sidecar.relations[1]!.relationId;
  const member = create(RelSchema, {
    relType: { case: 'project', value: { common: { relAnchor: 3 }, input: project.input } },
  });
  project.input = member;
  document.sidecar.relations.push({
    relationId: 'internal',
    relAnchor: 3,
    authoringOwnerRelationId: ownerId,
  });
  const encode = (): DvtSubstraitSemanticDocumentV1 => {
    const semanticPlan = encodeDvtSubstraitPlanV1(plan);
    return {
      ...document,
      semanticPlan,
      sidecar: { ...document.sidecar, semanticPlanSha256: semanticPlan.sha256 },
    };
  };
  return { document, root: root.value, project, member, ownerId, encode };
}

describe('V1 canonical authoring groups', () => {
  it('roundtrips explicit grouping without changing canonical bytes or identities', () => {
    const fixture = groupFixture();
    const document = fixture.encode();
    const accepted = DvtSubstraitSemanticDocumentV1Schema.parse(document);
    expect(JSON.parse(JSON.stringify(accepted))).toEqual(document);
    expect(accepted.sidecar.relations.at(-1)).toEqual({
      relationId: 'internal',
      relAnchor: 3,
      authoringOwnerRelationId: fixture.ownerId,
    });
  });

  it.each([
    'missing owner',
    'self owner',
    'nested owner',
    'non-project member',
    'non-project root',
    'non-contiguous',
    'cross-consumer',
    'unbound input',
  ])('rejects %s at the document boundary', (fault) => {
    const fixture = groupFixture();
    const bindings = fixture.document.sidecar.relations;
    const memberBinding = bindings.at(-1)!;
    if (fault === 'missing owner') memberBinding.authoringOwnerRelationId = 'absent';
    if (fault === 'self owner') memberBinding.authoringOwnerRelationId = memberBinding.relationId;
    if (fault === 'nested owner') bindings[1]!.authoringOwnerRelationId = 'internal';
    if (fault === 'non-project member')
      fixture.member.relType = create(RelSchema, {
        relType: {
          case: 'filter',
          value: {
            common: { relAnchor: 3 },
            input:
              fixture.member.relType.case === 'project'
                ? fixture.member.relType.value.input
                : undefined,
          },
        },
      }).relType;
    if (fault === 'non-project root')
      fixture.root.input = create(RelSchema, {
        relType: { case: 'filter', value: { common: { relAnchor: 2 }, input: fixture.member } },
      });
    if (fault === 'non-contiguous') {
      fixture.project.input = create(RelSchema, {
        relType: { case: 'project', value: { common: { relAnchor: 4 }, input: fixture.member } },
      });
      bindings.push({ relationId: 'unowned-middle', relAnchor: 4 });
    }
    if (fault === 'cross-consumer') {
      const owner = fixture.root.input!;
      fixture.root.input = create(RelSchema, {
        relType: {
          case: 'cross',
          value: { common: { relAnchor: 4 }, left: owner, right: fixture.member },
        },
      });
      bindings.push({ relationId: 'external-consumer', relAnchor: 4 });
    }
    if (fault === 'unbound input') bindings.shift();
    const parsed = DvtSubstraitSemanticDocumentV1Schema.safeParse(fixture.encode());
    expect(parsed.success).toBe(false);
    if (parsed.success) throw new Error('Expected rejected group.');
    expect(parsed.error.issues.some((issue) => issue.message.includes('authoring group'))).toBe(
      true
    );
  });
});
