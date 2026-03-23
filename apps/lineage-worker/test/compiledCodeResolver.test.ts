import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import type { CompiledCodeRef } from '@dvt/contracts';
import { sha256HexUtf8 } from '@dvt/traceability-service';
import { describe, expect, it, vi } from 'vitest';

import { createCompiledCodeResolver } from '../src/compiledCodeResolver.js';

function mkRef(storageUri: string, sqlText: string): CompiledCodeRef {
  return {
    sha256: sha256HexUtf8(sqlText),
    storageUri,
    sizeBytes: Buffer.byteLength(sqlText, 'utf8'),
    encoding: 'utf-8',
  };
}

describe('createCompiledCodeResolver', () => {
  it('caches repeated resolutions for the same ref', async () => {
    const sqlText = 'select * from dim_customers';
    const ref = mkRef('memory://compiled/sql-step', sqlText);
    const read = vi.fn(async () => ({
      sourceUri: ref.storageUri,
      sqlText,
      sha256: ref.sha256,
      sizeBytes: ref.sizeBytes,
      encoding: 'utf-8' as const,
    }));

    const resolver = createCompiledCodeResolver(
      { DVT_COMPILED_CODE_RESOLVER_BACKEND: 'auto' },
      {
        readerOverrides: new Map([['memory', { read }]]),
        retryPolicy: { maxAttempts: 1, initialDelayMs: 0, maxDelayMs: 0 },
      }
    );

    await resolver.resolve(ref);
    await resolver.resolve(ref);

    expect(read).toHaveBeenCalledTimes(1);
  });

  it('reads real file:// compiled code through the file backend', async () => {
    const tempDir = await mkdtemp(join(tmpdir(), 'dvt-lineage-worker-'));
    try {
      const filePath = join(tempDir, 'compiled.sql');
      const sqlText = 'select id from dim_orders';
      await writeFile(filePath, sqlText, 'utf8');

      const ref = mkRef(pathToFileURL(filePath).href, sqlText);
      const resolver = createCompiledCodeResolver(
        { DVT_COMPILED_CODE_RESOLVER_BACKEND: 'file' },
        { retryPolicy: { maxAttempts: 1, initialDelayMs: 0, maxDelayMs: 0 } }
      );

      const resolved = await resolver.resolve(ref);

      expect(resolved.sqlText).toBe(sqlText);
      expect(resolved.sha256).toBe(ref.sha256);
      expect(resolved.sourceUri).toBe(ref.storageUri);
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it('routes s3:// refs through the s3 backend override', async () => {
    const sqlText = 'select count(*) from fct_sales';
    const ref = mkRef('s3://dvt-artifacts/prod/compiled/fct_sales.sql', sqlText);
    const read = vi.fn(async () => ({
      sourceUri: ref.storageUri,
      sqlText,
      sha256: ref.sha256,
      sizeBytes: ref.sizeBytes,
      encoding: 'utf-8' as const,
    }));

    const resolver = createCompiledCodeResolver(
      { DVT_COMPILED_CODE_RESOLVER_BACKEND: 's3' },
      {
        readerOverrides: new Map([['s3', { read }]]),
        retryPolicy: { maxAttempts: 1, initialDelayMs: 0, maxDelayMs: 0 },
      }
    );

    const resolved = await resolver.resolve(ref);

    expect(resolved.sqlText).toBe(sqlText);
    expect(read).toHaveBeenCalledTimes(1);
  });
});
