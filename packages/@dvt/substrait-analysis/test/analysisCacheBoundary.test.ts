import { describe, expect, it } from 'vitest';

import type { RelationAnalysisCache } from '../src/analysisCache.js';
import { MemoryRelationAnalysisCache } from '../src/memoryAnalysisCache.js';
import { RelationAnalysisSession } from '../src/relationAnalysisSession.js';

import { relationsFixture } from './relationsFixture.js';

const adapters: Record<string, () => RelationAnalysisCache> = {
  memory: () => new MemoryRelationAnalysisCache({ maxEntries: 4, maxBytes: 600 }),
  'serialized test double': () => {
    const memory = new MemoryRelationAnalysisCache({ maxEntries: 4, maxBytes: 600 });
    return {
      getMany: async (keys, signal) =>
        JSON.parse(JSON.stringify(await memory.getMany([...keys], signal))) as (string | null)[],
      putMany: (entries, signal) =>
        memory.putMany(JSON.parse(JSON.stringify(entries)) as typeof entries, signal),
    };
  },
};

describe.each(Object.entries(adapters))('derived fact port: %s', (_name, createCache) => {
  it('preserves ordered misses, owned values and correct recomputation after eviction', async () => {
    const cache = createCache();
    const entry = { key: 'first', value: 'before' };
    await cache.putMany([entry]);
    entry.value = 'after';
    expect(await cache.getMany(['absent', 'first', 'first'])).toEqual([null, 'before', 'before']);
    const fixture = relationsFixture();
    const document = fixture.document(fixture.unary('filter', fixture.read()));
    const session = new RelationAnalysisSession({ document, cache, scope: 'model' });
    const first = await session.query('r2');
    await cache.putMany(
      Array.from({ length: 4 }, (_, position) => ({ key: `other-${position}`, value: 'value' }))
    );
    expect(await session.query('r2')).toEqual(first);
    expect(session.work.analyzed).toBe(4);
  });
});

describe('invalid derived cache payload', () => {
  it('reports corruption and derives correct facts from authority instead', async () => {
    const fixture = relationsFixture();
    const document = fixture.document(fixture.read());
    const failures: unknown[] = [];
    const cache: RelationAnalysisCache = {
      getMany: async (keys) => keys.map(() => '{invalid'),
      putMany: async () => {},
    };
    const session = new RelationAnalysisSession({
      document,
      cache,
      scope: 'model',
      onCacheFailure: (failure) => failures.push(failure),
    });
    const result = await session.query('r1');
    expect(result.fields[0]?.type.kind.case).toBe('i64');
    expect(result.fields[0]?.sourceFieldIds).toEqual(['f1']);
    expect(failures).toHaveLength(2);
    expect(session.work.analyzed).toBe(1);
  });
});
