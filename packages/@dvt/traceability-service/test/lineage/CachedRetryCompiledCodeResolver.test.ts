import type { CompiledCodeRef } from '@dvt/contracts';
import { describe, expect, it, vi } from 'vitest';

import { InMemoryCompiledCodeCache } from '../../src/lineage/cache/InMemoryCompiledCodeCache.js';
import { sha256HexUtf8 } from '../../src/lineage/compiledCodeRef.js';
import {
  LINEAGE_ERROR_CODE,
  LINEAGE_ERROR_MESSAGE_KEY,
  LINEAGE_ERROR_REASON_CODE,
} from '../../src/lineage/errorContract.js';
import { CompiledCodeIntegrityError, CompiledCodeNotFoundError } from '../../src/lineage/errors.js';
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

  it('maps integrity failures to CompiledCodeIntegrityError', async () => {
    const ref = mkRef('select * from dim_products');
    const corruptedSql = 'select * from dim_products_corrupted';
    const read = vi.fn(async () => ({
      sourceUri: ref.storageUri,
      sqlText: corruptedSql,
      sha256: sha256HexUtf8(corruptedSql),
      sizeBytes: Buffer.byteLength(corruptedSql, 'utf8'),
      encoding: 'utf-8' as const,
    }));
    const resolver = new CachedRetryCompiledCodeResolver({
      reader: {
        read,
      },
      cache: new InMemoryCompiledCodeCache({ maxEntries: 10 }),
      retryPolicy: { maxAttempts: 3, initialDelayMs: 0, maxDelayMs: 0 },
    });

    const error = await resolver.resolve(ref).catch((err: unknown) => err);

    expect(read).toHaveBeenCalledTimes(1);
    expect(error).toBeInstanceOf(CompiledCodeIntegrityError);
    expect(error).toMatchObject({
      code: LINEAGE_ERROR_CODE.COMPILED_CODE_INTEGRITY_ERROR,
      messageKey: LINEAGE_ERROR_MESSAGE_KEY.COMPILED_CODE_INTEGRITY_ERROR,
      messageParams: {
        reasonCode: LINEAGE_ERROR_REASON_CODE.COMPILED_CODE_INTEGRITY_DIGEST_MISMATCH,
        storageUri: ref.storageUri,
      },
      name: 'CompiledCodeIntegrityError',
    });
  });

  it('does not retry not-found errors', async () => {
    const ref = mkRef('select * from dim_missing');
    const notFoundError = new CompiledCodeNotFoundError({ storageUri: ref.storageUri });
    const read = vi.fn(async () => {
      throw notFoundError;
    });
    const resolver = new CachedRetryCompiledCodeResolver({
      reader: { read },
      cache: new InMemoryCompiledCodeCache({ maxEntries: 10 }),
      retryPolicy: { maxAttempts: 3, initialDelayMs: 0, maxDelayMs: 0 },
    });

    await expect(resolver.resolve(ref)).rejects.toBe(notFoundError);
    expect(read).toHaveBeenCalledTimes(1);
  });
});
