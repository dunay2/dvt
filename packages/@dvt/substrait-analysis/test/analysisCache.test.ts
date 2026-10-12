import { describe, expect, it } from 'vitest';

import { MemoryRelationAnalysisCache } from '../src/memoryAnalysisCache.js';

describe('bounded serialized analysis storage', () => {
  it('returns ordered hits and misses without retaining caller-owned entries', async () => {
    const cache = new MemoryRelationAnalysisCache({ maxEntries: 3, maxBytes: 100 });
    const entry = { key: 'a', value: JSON.stringify({ columns: ['id'] }) };
    await cache.putMany([entry]);
    entry.value = 'changed';
    expect(await cache.getMany(['missing', 'a', 'a'])).toEqual([
      null,
      JSON.stringify({ columns: ['id'] }),
      JSON.stringify({ columns: ['id'] }),
    ]);
  });

  it('evicts the least recently read entry and accounts for replacement weight', async () => {
    const cache = new MemoryRelationAnalysisCache({ maxEntries: 2, maxBytes: 100 });
    await cache.putMany([
      { key: 'a', value: 'one' },
      { key: 'b', value: 'two' },
    ]);
    await cache.getMany(['a']);
    await cache.putMany([{ key: 'c', value: 'three' }]);
    expect(await cache.getMany(['a', 'b', 'c'])).toEqual(['one', null, 'three']);
    await cache.putMany([{ key: 'c', value: 'x' }]);
    expect(cache.usage).toEqual({ entries: 2, bytes: 6 });
  });

  it('bounds UTF-8 serialized weight, including keys, and declines oversized entries', async () => {
    const cache = new MemoryRelationAnalysisCache({ maxEntries: 10, maxBytes: 6 });
    await cache.putMany([
      { key: 'a', value: 'éé' },
      { key: 'b', value: 'z' },
    ]);
    expect(await cache.getMany(['a', 'b'])).toEqual([null, 'z']);
    await cache.putMany([{ key: 'large', value: 'oversized' }]);
    expect(await cache.getMany(['large', 'b'])).toEqual([null, 'z']);
    expect(cache.usage).toEqual({ entries: 1, bytes: 2 });
  });

  it('allows disabled retention and rejects invalid capacity rather than becoming unbounded', async () => {
    const cache = new MemoryRelationAnalysisCache({ maxEntries: 0, maxBytes: 0 });
    await cache.putMany([{ key: 'a', value: 'b' }]);
    expect(await cache.getMany(['a'])).toEqual([null]);
    for (const limit of [-1, Infinity, NaN, 1.5]) {
      expect(() => new MemoryRelationAnalysisCache({ maxEntries: limit, maxBytes: 100 })).toThrow();
      expect(() => new MemoryRelationAnalysisCache({ maxEntries: 1, maxBytes: limit })).toThrow();
    }
  });
});
