/**
 * Owned concern: read explicit groups and protect atomic relation edits.
 * @baseline ADR-0064: Canonical relations and stable bindings share one authority.
 * @decision Test the public index and revisioned change boundary, not a parallel graph.
 * @consequence Invalid ownership never replaces the last queryable snapshot.
 * @version 1.0.0
 */
import { RelSchema, type Rel } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import { create } from '@bufbuild/protobuf';
import { describe, expect, it } from 'vitest';

import {
  indexSubstraitRelations,
  readSubstraitAuthoringGroup,
  RelationAnalysisSession,
  type SubstraitDocument,
} from '../src/index.js';

import { relationsFixture } from './relationsFixture.js';

function groupFixture(): Readonly<{ document: SubstraitDocument; first: Rel; root: Rel }> {
  const fixture = relationsFixture();
  const first = fixture.unary('project', fixture.read());
  const second = fixture.unary('project', first);
  const root = fixture.unary('project', second);
  const document = fixture.document(fixture.unary('filter', root));
  for (const binding of document.sidecar.relations.slice(1, 3))
    binding.authoringOwnerRelationId = 'r4';
  return { document, first, root };
}

describe('explicit Substrait authoring groups', () => {
  it('reads the exact chain in input order under an unrelated consumer without copying relations', () => {
    const { document } = groupFixture();
    document.sidecar.relations.reverse();
    const result = indexSubstraitRelations(document);
    expect(result.ok).toBe(true);
    if (!result.ok) throw result.error;
    const group = readSubstraitAuthoringGroup(result.index, 'r4');
    expect(group?.members.map((entry) => entry.binding.relationId)).toEqual(['r2', 'r3', 'r4']);
    expect(group?.inputId).toBe('r1');
    expect(group?.root).toBe(result.index.relations.get('r4'));
    expect(group?.members[0]).toBe(result.index.relations.get('r2'));
    for (const id of ['r1', 'r2', 'r3', 'r5', 'missing'])
      expect(readSubstraitAuthoringGroup(result.index, id)).toBeNull();
  });

  it('does not group adjacent unowned Projects by structural similarity', () => {
    const { document } = groupFixture();
    for (const binding of document.sidecar.relations) delete binding.authoringOwnerRelationId;
    const result = indexSubstraitRelations(document);
    if (!result.ok) throw result.error;
    expect(readSubstraitAuthoringGroup(result.index, 'r4')).toBeNull();
  });

  it.each(['absent', 'r2', 'r3', 'r5'])(
    'rejects owner %s in both indexing and delta publication',
    async (ownerId) => {
      const { document, first } = groupFixture();
      const session = new RelationAnalysisSession({ document, scope: 'model' });
      const before = session.document();
      const query = await session.query('r4');
      const binding = { ...document.sidecar.relations[1]!, authoringOwnerRelationId: ownerId };
      const invalid = {
        ...document,
        sidecar: {
          ...document.sidecar,
          relations: document.sidecar.relations.map((entry) =>
            entry.relationId === binding.relationId ? binding : entry
          ),
        },
      };
      expect(indexSubstraitRelations(invalid)).toMatchObject({
        ok: false,
        error: { code: 'invalid_binding' },
      });
      expect(() =>
        session.apply({
          expectedRevision: 0,
          removed: [],
          upserts: [
            {
              relation: first,
              binding,
              fields: document.sidecar.fields.filter(
                (field) => field.relationId === binding.relationId
              ),
            },
          ],
        })
      ).toThrowError(/authoring group/);
      expect(session.revision).toBe(0);
      expect(session.document()).toEqual(before);
      expect(await session.query('r4')).toEqual(query);
    }
  );

  it('allows a local member edit without requiring its owner in the field neighbourhood', () => {
    const { document, first } = groupFixture();
    const session = new RelationAnalysisSession({ document, scope: 'model' });
    session.apply({
      expectedRevision: 0,
      removed: [],
      upserts: [
        {
          relation: first,
          binding: document.sidecar.relations[1]!,
          fields: document.sidecar.fields
            .filter((field) => field.relationId === 'r2')
            .map((field) => ({ ...field, displayName: 'renamed' })),
        },
      ],
    });
    expect(session.revision).toBe(1);
    const result = indexSubstraitRelations(session.document());
    if (!result.ok) throw result.error;
    expect(
      readSubstraitAuthoringGroup(result.index, 'r4')?.members[0]?.fields[0]?.displayName
    ).toBe('renamed');
  });

  it.each(['remove owner', 'replace owner kind'])(
    'rejects %s before publishing any delta',
    (fault) => {
      const { document, root } = groupFixture();
      const session = new RelationAnalysisSession({ document, scope: 'model' });
      const before = session.document();
      if (root.relType.case !== 'project') throw new Error('Expected Project.');
      const id = fault === 'remove owner' ? 'r5' : 'r4';
      const replacement = create(RelSchema, {
        relType: {
          case: 'filter',
          value: {
            common: { relAnchor: fault === 'remove owner' ? 5 : 4 },
            input: root.relType.value.input,
          },
        },
      });
      expect(() =>
        session.apply({
          expectedRevision: 0,
          removed: fault === 'remove owner' ? ['r4'] : [],
          upserts: [
            {
              relation: replacement,
              binding: document.sidecar.relations.find((entry) => entry.relationId === id)!,
              fields: document.sidecar.fields.filter((field) => field.relationId === id),
            },
          ],
        })
      ).toThrowError(/authoring group/);
      expect(session.revision).toBe(0);
      expect(session.document()).toEqual(before);
    }
  );

  it('removes an entire group atomically while preserving its public root', () => {
    const { document, first } = groupFixture();
    const session = new RelationAnalysisSession({ document, scope: 'model' });
    if (first.relType.case !== 'project') throw new Error('Expected Project.');
    session.apply({
      expectedRevision: 0,
      removed: ['r2', 'r3'],
      upserts: [
        {
          relation: create(RelSchema, {
            relType: {
              case: 'project',
              value: { common: { relAnchor: 4 }, input: first.relType.value.input },
            },
          }),
          binding: document.sidecar.relations[3]!,
          fields: document.sidecar.fields.filter((field) => field.relationId === 'r4'),
        },
      ],
    });
    const result = indexSubstraitRelations(session.document());
    if (!result.ok) throw result.error;
    expect([...result.index.relations.keys()]).toEqual(['r5', 'r4', 'r1']);
    expect(readSubstraitAuthoringGroup(result.index, 'r4')).toBeNull();
  });
});
