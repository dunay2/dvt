import { RelSchema } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import { clone, create } from '@bufbuild/protobuf';
import { describe, expect, it } from 'vitest';

import { RelationAnalysisSession } from '../src/relationAnalysisSession.js';
import { deriveSubstraitSchemas } from '../src/relationSchema.js';

import { relationsFixture } from './relationsFixture.js';

describe('localized relation edits', () => {
  it('preserves provider-neutral output names through delta, query and export', async () => {
    const fixture = relationsFixture();
    const session = new RelationAnalysisSession({
      document: fixture.document(fixture.read()),
      scope: 'model',
    });
    const name = '😀'.repeat(256);
    session.apply({ expectedRevision: 0, upserts: [], removed: [], rootNames: [name] });
    const accepted = session.document();
    expect(accepted.plan.relations[0]!.relType).toMatchObject({
      case: 'root',
      value: { names: [name] },
    });
    expect((await session.query('r1')).fields).toEqual(
      deriveSubstraitSchemas(accepted).schemas.get('r1')
    );
    expect(() =>
      session.apply({ expectedRevision: 1, upserts: [], removed: [], rootNames: [name + 'x'] })
    ).toThrow();
    expect(session.document()).toEqual(accepted);
  });

  it('inserts, reconnects and removes a wrapper without stale dependencies', async () => {
    const fixture = relationsFixture();
    const read = fixture.read();
    const root = fixture.unary('project', read);
    const session = new RelationAnalysisSession({
      document: fixture.document(root),
      scope: 'model',
    });
    const baseline = await session.query('r2');
    const filter = create(RelSchema, {
      relType: {
        case: 'filter',
        value: {
          input: read,
          common: { relAnchor: 3 },
          condition: {
            rexType: { case: 'literal', value: { literalType: { case: 'boolean', value: true } } },
          },
        },
      },
    });
    const project = clone(RelSchema, root);
    if (project.relType.case !== 'project') throw new Error('Expected project');
    project.relType.value.input = filter;
    const original = session.document();
    const projectionEntry = {
      relation: project,
      binding: original.sidecar.relations[1]!,
      fields: [original.sidecar.fields[1]!],
    };
    session.apply({
      expectedRevision: 0,
      upserts: [
        projectionEntry,
        {
          relation: filter,
          binding: { relationId: 'r3', relAnchor: 3 },
          fields: [],
        },
      ],
      removed: [],
    });
    const applied = await session.query('r2');
    expect(applied.fingerprint).not.toBe(baseline.fingerprint);
    const authority = session.document();
    expect(applied.fields).toEqual(deriveSubstraitSchemas(authority).schemas.get('r2'));
    session.apply({
      expectedRevision: 1,
      upserts: [{ ...projectionEntry, relation: root }],
      removed: ['r3'],
    });
    expect((await session.query('r2')).fingerprint).toBe(baseline.fingerprint);
    await expect(session.query('r3')).rejects.toMatchObject({ code: 'unknown_relation' });
    expect(
      session
        .document()
        .sidecar.relations.map((entry) => entry.relationId)
        .sort()
    ).toEqual(['r1', 'r2']);
  });

  it('rejects a cycle atomically and retains a queryable previous snapshot', async () => {
    const fixture = relationsFixture();
    const filter = fixture.unary('filter', fixture.read());
    const document = fixture.document(filter);
    const session = new RelationAnalysisSession({ document, scope: 'model' });
    const before = await session.query('r2');
    const changed = clone(RelSchema, filter);
    if (changed.relType.case !== 'filter') throw new Error('Expected filter');
    changed.relType.value.input = filter;
    expect(() =>
      session.apply({
        expectedRevision: 0,
        removed: [],
        upserts: [
          {
            relation: changed,
            binding: document.sidecar.relations[1]!,
            fields: [document.sidecar.fields[1]!],
          },
        ],
      })
    ).toThrow();
    expect(await session.query('r2')).toEqual(before);
  });
});
