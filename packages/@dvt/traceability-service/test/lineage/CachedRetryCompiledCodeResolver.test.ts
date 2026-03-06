import type { CompiledCodeRef } from '@dvt/contracts';
import { describe, expect, it, vi } from 'vitest';

import { InMemoryCompiledCodeCache } from '../../src/lineage/cache/InMemoryCompiledCodeCache.js';
import { sha256HexUtf8 } from '../../src/lineage/compiledCodeRef.js';
import { CachedRetryCompiledCodeResolver } from '../../src/lineage/resolver/CachedRetryCompiledCodeResolver.js';

function mkRef(sqlText: string): CompiledCodeRef {
  return {
    sha256: sha256HexUtf8(sqlText),
    storageUri: 'memory://compiled/sql-1',
    sizeBytes: Buffer.byteLength(sqlText, 'utf8'),
    encoding: 'utf-8',
  };
}

describe('CachedRetryCompiledCodeResolver', () => {
  it('retries transient failures and returns resolved compiled code', async () => {
    const sqlText = 'select * from dim_customers';
    const ref = mkRef(sqlText);
    const read = vi
      .fn<
        () => Promise<{
          sourceUri: string;
          sqlText: string;
          sha256: string;
          sizeBytes: number;
          encoding: 'utf-8';
        }>
      >()
      .mockRejectedValueOnce(new Error('transient-1'))
      .mockRejectedValueOnce(new Error('transient-2'))
      .mockResolvedValue({
        sourceUri: ref.storageUri,
        sqlText,
        sha256: ref.sha256,
        sizeBytes: ref.sizeBytes,
        encoding: 'utf-8',
      });

    const resolver = new CachedRetryCompiledCodeResolver({
      reader: { read: () => read() },
      cache: new InMemoryCompiledCodeCache({ maxEntries: 10 }),
      retryPolicy: { maxAttempts: 3, initialDelayMs: 0, maxDelayMs: 0 },
    });

    const result = await resolver.resolve(ref);
    expect(result.sqlText).toBe(sqlText);
    expect(read).toHaveBeenCalledTimes(3);
  });

  it('uses cache after first resolution', async () => {
    const sqlText = 'select * from fct_sales';
    const ref = mkRef(sqlText);
    const read = vi.fn(async () => ({
      sourceUri: ref.storageUri,
      sqlText,
      sha256: ref.sha256,
      sizeBytes: ref.sizeBytes,
      encoding: 'utf-8' as const,
    }));

    const resolver = new CachedRetryCompiledCodeResolver({
      reader: { read },
      cache: new InMemoryCompiledCodeCache({ maxEntries: 10 }),
      retryPolicy: { maxAttempts: 2, initialDelayMs: 0, maxDelayMs: 0 },
    });

    await resolver.resolve(ref);
    await resolver.resolve(ref);

    expect(read).toHaveBeenCalledTimes(1);
  });
});
