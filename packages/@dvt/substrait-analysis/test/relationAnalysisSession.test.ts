import { RelSchema } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import { clone } from '@bufbuild/protobuf';
import { describe, expect, it } from 'vitest';

import { MemoryRelationAnalysisCache } from '../src/memoryAnalysisCache.js';
import { RelationAnalysisSession } from '../src/relationAnalysisSession.js';
import { deriveSubstraitSchemas } from '../src/relationSchema.js';

import { relationsFixture } from './relationsFixture.js';

function branchFixture(): {
  document: ReturnType<ReturnType<typeof relationsFixture>['document']>;
  left: ReturnType<ReturnType<typeof relationsFixture>['read']>;
  right: ReturnType<ReturnType<typeof relationsFixture>['read']>;
  root: ReturnType<ReturnType<typeof relationsFixture>['read']>;
} {
  const fixture = relationsFixture();
  const left = fixture.unary('filter', fixture.read());
  const right = fixture.unary('filter', fixture.read());
  const root = fixture.combine('cross', [left, right], [0, 1]);
  const document = fixture.document(root);
  return { document, left, right, root };
}

describe('owned incremental relation analysis', () => {
  it('matches full schema derivation and performs no analysis or hashing on a hot query', async () => {
    const { document } = branchFixture();
    const session = new RelationAnalysisSession({
      document,
      scope: 'tenant/project/model',
      cache: new MemoryRelationAnalysisCache({ maxEntries: 100, maxBytes: 100_000 }),
      onCacheFailure: () => {
        throw new Error('Unexpected cache failure');
      },
    });
    const result = await session.query('r5');
    expect(result.fields).toEqual(deriveSubstraitSchemas(document).schemas.get('r5'));
    const before = session.work;
    expect(await session.query('r5')).toEqual(result);
    expect(session.work).toEqual(before);
    expect(before.analyzed).toBe(5);
  });

  it('invalidates a filter result through its consumers even when its schema is unchanged', async () => {
    const { document, left } = branchFixture();
    const session = new RelationAnalysisSession({ document, scope: 'model' });
    const before = await session.query('r5');
    const independent = await session.query('r4');
    const changed = clone(RelSchema, left);
    if (changed.relType.case !== 'filter') throw new Error('Expected filter');
    changed.relType.value.condition!.rexType = {
      case: 'literal',
      value: {
        ...changed.relType.value.condition!.rexType.value!,
        $typeName: 'substrait.Expression.Literal',
        literalType: { case: 'boolean', value: false },
        nullable: false,
        typeVariationReference: 0,
      },
    };
    const work = session.work;
    session.apply({
      expectedRevision: 0,
      upserts: [
        {
          relation: changed,
          binding: document.sidecar.relations[1]!,
          fields: document.sidecar.fields.filter((field) => field.relationId === 'r2'),
        },
      ],
      removed: [],
    });
    const after = await session.query('r5');
    expect(after.fields).toEqual(before.fields);
    expect(after.fingerprint).not.toBe(before.fingerprint);
    expect((await session.query('r4')).fingerprint).toBe(independent.fingerprint);
    expect(session.work.analyzed - work.analyzed).toBe(2);
    expect(session.work.fingerprinted - work.fingerprinted).toBe(2);
    expect(await session.query('r5')).toEqual(after);
  });

  it('owns its input and never lends mutable schema or relation messages', async () => {
    const { document, left } = branchFixture();
    const session = new RelationAnalysisSession({ document, scope: 'model' });
    const before = await session.query('r5');
    document.sidecar.relations[1]!.displayName = 'caller mutation';
    if (left.relType.case === 'filter') left.relType.value.input = undefined;
    before.fields[0]!.type.kind = { case: undefined };
    expect((await session.query('r5')).fields[0]!.type.kind.case).toBe('i64');
    const owned = session.document();
    owned.sidecar.fields.length = 0;
    expect(session.document().sidecar.fields.length).toBeGreaterThan(0);
  });
});
