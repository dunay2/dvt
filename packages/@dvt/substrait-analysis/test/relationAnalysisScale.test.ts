import {
  ExpressionSchema,
  RelSchema,
} from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import { clone, create } from '@bufbuild/protobuf';
import { describe, expect, it } from 'vitest';

import { MemoryRelationAnalysisCache } from '../src/memoryAnalysisCache.js';
import { RelationAnalysisSession } from '../src/relationAnalysisSession.js';
import { deriveSubstraitSchemas } from '../src/relationSchema.js';

import { relationsFixture } from './relationsFixture.js';

describe('incremental work and semantic equivalence', () => {
  it('does not traverse an independent deep branch after a local filter edit', async () => {
    const fixture = relationsFixture();
    const left = fixture.unary('filter', fixture.read());
    let right = fixture.read();
    for (let depth = 0; depth < 1200; depth += 1) right = fixture.unary('filter', right);
    const document = fixture.document(fixture.combine('cross', [left, right], [0, 1]));
    const session = new RelationAnalysisSession({
      document,
      scope: 'large',
      cache: new MemoryRelationAnalysisCache({ maxEntries: 2000, maxBytes: 2_000_000 }),
    });
    const root = document.sidecar.relations.at(-1)!.relationId;
    const before = await session.query(root);
    const baseline = session.work;
    const changed = clone(RelSchema, left);
    if (changed.relType.case !== 'filter') throw new Error('Expected filter');
    changed.relType.value.condition = create(ExpressionSchema, {
      rexType: { case: 'literal', value: { literalType: { case: 'boolean', value: false } } },
    });
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
    });
    const after = await session.query(root);
    expect(after.fields).toEqual(before.fields);
    expect(after.fingerprint).not.toBe(before.fingerprint);
    expect(session.work.analyzed - baseline.analyzed).toBe(2);
    expect(session.work.fingerprinted - baseline.fingerprinted).toBe(2);
    // Two changed/dependent relations plus their two cached input boundaries.
    expect(session.work.visited - baseline.visited).toBe(6);
    const warm = session.work;
    await session.query(root);
    expect(session.work).toEqual(warm);
  });

  it.each([1, 17, 4093])(
    'matches full analysis through reproducible edits (seed %i)',
    async (seed) => {
      const fixture = relationsFixture();
      const leaves = Array.from({ length: 5 }, () => fixture.unary('filter', fixture.read()));
      const document = fixture.document(fixture.combine('set', leaves));
      const session = new RelationAnalysisSession({
        document,
        scope: 'model',
        cache: new MemoryRelationAnalysisCache({ maxEntries: 3, maxBytes: 2000 }),
      });
      let random = seed;
      for (let revision = 0; revision < 20; revision += 1) {
        random = (Math.imul(random, 1664525) + 1013904223) >>> 0;
        const position = random % leaves.length;
        const relation = clone(RelSchema, leaves[position]!);
        if (relation.relType.case !== 'filter') throw new Error('Expected filter');
        relation.relType.value.condition = create(ExpressionSchema, {
          rexType: {
            case: 'literal',
            value: { literalType: { case: 'boolean', value: (random & 1) === 0 } },
          },
        });
        const ordinal = position * 2 + 1;
        session.apply({
          expectedRevision: revision,
          removed: [],
          upserts: [
            {
              relation,
              binding: document.sidecar.relations[ordinal]!,
              fields: [document.sidecar.fields[ordinal]!],
            },
          ],
        });
        const result = await session.query('r11');
        expect(result.fields).toEqual(
          deriveSubstraitSchemas(session.document()).schemas.get('r11')
        );
        expect(result.fields[0]!.sourceFieldIds).toEqual(['f1', 'f3', 'f5', 'f7', 'f9']);
      }
    }
  );
});
