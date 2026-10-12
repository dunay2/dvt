import { describe, expect, it } from 'vitest';

import type { RelationAnalysisCache } from '../src/analysisCache.js';
import { MemoryRelationAnalysisCache } from '../src/memoryAnalysisCache.js';
import { RelationAnalysisSession } from '../src/relationAnalysisSession.js';

import { relationsFixture } from './relationsFixture.js';

function document(): ReturnType<ReturnType<typeof relationsFixture>['document']> {
  const fixture = relationsFixture();
  return fixture.document(fixture.unary('filter', fixture.read()));
}

function delayedCache(): {
  cache: RelationAnalysisCache;
  release: () => void;
  reads: () => number;
} {
  const memory = new MemoryRelationAnalysisCache({ maxEntries: 100, maxBytes: 100_000 });
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  let reads = 0;
  const cache: RelationAnalysisCache = {
    getMany: async (keys) => {
      reads += 1;
      await gate;
      return memory.getMany(keys);
    },
    putMany: (entries) => memory.putMany(entries),
  };
  return { cache, release: () => release(), reads: () => reads };
}

describe('analysis session revision and store boundary', () => {
  it.each(['replace', 'dispose'] as const)('discards a delayed result after %s', async (action) => {
    const store = delayedCache();
    const session = new RelationAnalysisSession({
      document: document(),
      scope: 'model',
      cache: store.cache,
    });
    const query = session.query('r2');
    const rejection = expect(query).rejects.toMatchObject({ code: 'stale_document' });
    if (action === 'replace') session.replace(document(), 0);
    else session.dispose();
    await rejection;
    store.release();
    expect(session.work.analyzed).toBe(0);
  });

  it('deduplicates pending work without cancelling a second consumer', async () => {
    const store = delayedCache();
    const session = new RelationAnalysisSession({
      document: document(),
      scope: 'model',
      cache: store.cache,
    });
    const abort = new globalThis.AbortController();
    const first = session.query('r2', abort.signal);
    const rejection = expect(first).rejects.toMatchObject({ name: 'AbortError' });
    const second = session.query('r2');
    expect(store.reads()).toBe(1);
    abort.abort();
    await rejection;
    store.release();
    expect((await second).fields).toHaveLength(1);
    expect(session.work.analyzed).toBe(2);
  });

  it('reports unavailable storage and recomputes, distinct from a miss', async () => {
    const failures: string[] = [];
    const session = new RelationAnalysisSession({
      document: document(),
      scope: 'model',
      cache: {
        getMany: async () => {
          throw new Error('Unavailable');
        },
        putMany: async () => {
          throw new Error('Unavailable');
        },
      },
      onCacheFailure: (failure) => failures.push(failure.operation),
    });
    expect((await session.query('r2')).fields).toHaveLength(1);
    expect(failures).toEqual(['read', 'read', 'write']);
    expect(session.lastCacheFailure?.operation).toBe('write');
  });

  it('rejects stale edits and invalid identity without changing the published revision', async () => {
    const session = new RelationAnalysisSession({ document: document(), scope: 'model' });
    const before = await session.query('r2');
    expect(() => session.apply({ expectedRevision: 1, upserts: [], removed: [] })).toThrow();
    expect(() => session.apply({ expectedRevision: 0, upserts: [], removed: ['r1'] })).toThrow();
    expect(session.revision).toBe(0);
    expect(await session.query('r2')).toEqual(before);
    await expect(session.query('missing')).rejects.toMatchObject({ code: 'unknown_relation' });
  });

  it('isolates authorized scopes even with one shared backing store', async () => {
    const cache = new MemoryRelationAnalysisCache({ maxEntries: 100, maxBytes: 100_000 });
    const a = new RelationAnalysisSession({ document: document(), scope: 'tenant-a/model', cache });
    const b = new RelationAnalysisSession({ document: document(), scope: 'tenant-b/model', cache });
    await a.query('r2');
    await b.query('r2');
    expect(a.work.analyzed).toBe(2);
    expect(b.work.analyzed).toBe(2);
    const reopened = new RelationAnalysisSession({
      document: document(),
      scope: 'tenant-a/model',
      cache,
    });
    await reopened.query('r2');
    expect(reopened.work.analyzed).toBe(0);
  });
});
