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

async function withTemporaryEnv<T>(
  changes: Readonly<Record<string, string | undefined>>,
  run: () => Promise<T>
): Promise<T> {
  const previous = new Map<string, string | undefined>();
  for (const [key, value] of Object.entries(changes)) {
    previous.set(key, process.env[key]);
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }

  try {
    return await run();
  } finally {
    for (const [key, value] of previous) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
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
      { NODE_ENV: 'development', DVT_COMPILED_CODE_RESOLVER_BACKEND: 'auto' },
      {
        readerOverrides: new Map([['memory', { read }]]),
        retryPolicy: { maxAttempts: 1, initialDelayMs: 0, maxDelayMs: 0 },
      }
    );

    await resolver.resolve(ref);
    await resolver.resolve(ref);

    expect(read).toHaveBeenCalledTimes(1);
  });

  it('reads real file:// compiled code through the file backend in development', async () => {
    const tempDir = await mkdtemp(join(tmpdir(), 'dvt-lineage-worker-'));
    try {
      const filePath = join(tempDir, 'compiled.sql');
      const sqlText = 'select id from dim_orders';
      await writeFile(filePath, sqlText, 'utf8');

      const ref = mkRef(pathToFileURL(filePath).href, sqlText);
      const resolver = createCompiledCodeResolver(
        { NODE_ENV: 'development', DVT_COMPILED_CODE_RESOLVER_BACKEND: 'file' },
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

  it('rejects file:// compiled code in production', async () => {
    const tempDir = await mkdtemp(join(tmpdir(), 'dvt-lineage-worker-'));
    try {
      const filePath = join(tempDir, 'compiled.sql');
      const sqlText = 'select id from dim_orders';
      await writeFile(filePath, sqlText, 'utf8');
      expect(() =>
        createCompiledCodeResolver(
          { NODE_ENV: 'production', DVT_COMPILED_CODE_RESOLVER_BACKEND: 'file' },
          {
            retryPolicy: { maxAttempts: 1, initialDelayMs: 0, maxDelayMs: 0 },
          }
        )
      ).toThrow(/INV-CCREF-007/);
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it('allows production auto resolver construction without an s3 region', () => {
    const read = vi.fn(async () => ({
      sourceUri: 'memory://compiled/sql-step',
      sqlText: 'select 1',
      sha256: sha256HexUtf8('select 1'),
      sizeBytes: Buffer.byteLength('select 1', 'utf8'),
      encoding: 'utf-8' as const,
    }));

    expect(() =>
      createCompiledCodeResolver(
        { NODE_ENV: 'production', DVT_COMPILED_CODE_RESOLVER_BACKEND: 'auto' },
        {
          readerOverrides: new Map([['memory', { read }]]),
          retryPolicy: { maxAttempts: 1, initialDelayMs: 0, maxDelayMs: 0 },
        }
      )
    ).not.toThrow();
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
      { NODE_ENV: 'development', DVT_COMPILED_CODE_RESOLVER_BACKEND: 's3' },
      {
        readerOverrides: new Map([['s3', { read }]]),
        retryPolicy: { maxAttempts: 1, initialDelayMs: 0, maxDelayMs: 0 },
      }
    );

    const resolved = await resolver.resolve(ref);

    expect(resolved.sqlText).toBe(sqlText);
    expect(read).toHaveBeenCalledTimes(1);
  });

  it('fails fast when the s3 backend is selected without a region', () => {
    expect(() =>
      createCompiledCodeResolver(
        { NODE_ENV: 'development', DVT_COMPILED_CODE_RESOLVER_BACKEND: 's3' },
        { retryPolicy: { maxAttempts: 1, initialDelayMs: 0, maxDelayMs: 0 } }
      )
    ).toThrow(/Missing S3 region/i);
  });

  it('rejects s3:// compiled code in auto mode without a region', async () => {
    await withTemporaryEnv({ AWS_REGION: undefined, AWS_DEFAULT_REGION: undefined }, async () => {
      const sqlText = 'select count(*) from fct_sales';
      const ref = mkRef('s3://dvt-artifacts/prod/compiled/fct_sales.sql', sqlText);
      const resolver = createCompiledCodeResolver(
        { NODE_ENV: 'development', DVT_COMPILED_CODE_RESOLVER_BACKEND: 'auto' },
        { retryPolicy: { maxAttempts: 1, initialDelayMs: 0, maxDelayMs: 0 } }
      );

      await expect(resolver.resolve(ref)).rejects.toThrow(/Missing S3 region/i);
    });
  });
});
