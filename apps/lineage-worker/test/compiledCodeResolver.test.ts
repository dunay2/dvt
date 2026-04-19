import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { S3Client } from '@aws-sdk/client-s3';
import type { CompiledCodeRef } from '@dvt/contracts';
import {
  CompiledCodeNotFoundError,
  CompiledCodeReaderError,
  LINEAGE_ERROR_CODE,
  LINEAGE_ERROR_MESSAGE_KEY,
  LINEAGE_ERROR_REASON_CODE,
  sha256HexUtf8,
} from '@dvt/traceability-service';
import { describe, expect, it, vi } from 'vitest';

import { createCompiledCodeResolver } from '../src/compiledCodeResolver.js';

type ResolverEnv = Parameters<typeof createCompiledCodeResolver>[0];
type CompiledCodeReaderReasonCode =
  | typeof LINEAGE_ERROR_REASON_CODE.COMPILED_CODE_READER_EMPTY_S3_BODY
  | typeof LINEAGE_ERROR_REASON_CODE.COMPILED_CODE_READER_FILE_URI_PROHIBITED
  | typeof LINEAGE_ERROR_REASON_CODE.COMPILED_CODE_READER_MISSING_S3_REGION
  | typeof LINEAGE_ERROR_REASON_CODE.COMPILED_CODE_READER_READ_FAILED;

function mkRef(storageUri: string, sqlText: string): CompiledCodeRef {
  return {
    sha256: sha256HexUtf8(sqlText),
    storageUri,
    sizeBytes: Buffer.byteLength(sqlText, 'utf8'),
    encoding: 'utf-8',
  };
}

function makeResolverEnv(overrides: Partial<ResolverEnv> = {}): ResolverEnv {
  return {
    NODE_ENV: 'development',
    DVT_COMPILED_CODE_RESOLVER_BACKEND: 'auto',
    DVT_COMPILED_CODE_RESOLVER_S3_FORCE_PATH_STYLE: false,
    ...overrides,
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

function captureThrown(run: () => unknown): unknown {
  try {
    run();
  } catch (error) {
    return error;
  }

  throw new Error('expected function to throw');
}

async function captureRejected(run: () => Promise<unknown>): Promise<unknown> {
  try {
    await run();
  } catch (error) {
    return error;
  }

  throw new Error('expected promise to reject');
}

function expectCompiledCodeReaderError(
  error: unknown,
  expected: {
    reasonCode: CompiledCodeReaderReasonCode;
    sourceUri?: string;
  }
): void {
  expect(error).toBeInstanceOf(CompiledCodeReaderError);
  expect(error).toMatchObject({
    code: LINEAGE_ERROR_CODE.COMPILED_CODE_READER_ERROR,
    messageKey: LINEAGE_ERROR_MESSAGE_KEY.COMPILED_CODE_READER_ERROR,
    messageParams: {
      reasonCode: expected.reasonCode,
      ...(expected.sourceUri ? { sourceUri: expected.sourceUri } : {}),
    },
  });
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

    const resolver = createCompiledCodeResolver(makeResolverEnv(), {
      readerOverrides: new Map([['memory', { read }]]),
      retryPolicy: { maxAttempts: 1, initialDelayMs: 0, maxDelayMs: 0 },
    });

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
        makeResolverEnv({ DVT_COMPILED_CODE_RESOLVER_BACKEND: 'file' }),
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
      const error = captureThrown(() =>
        createCompiledCodeResolver(
          makeResolverEnv({
            NODE_ENV: 'production',
            DVT_COMPILED_CODE_RESOLVER_BACKEND: 'file',
          }),
          {
            retryPolicy: { maxAttempts: 1, initialDelayMs: 0, maxDelayMs: 0 },
          }
        )
      );

      expectCompiledCodeReaderError(error, {
        reasonCode: LINEAGE_ERROR_REASON_CODE.COMPILED_CODE_READER_FILE_URI_PROHIBITED,
      });
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
        makeResolverEnv({
          NODE_ENV: 'production',
        }),
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
      makeResolverEnv({ DVT_COMPILED_CODE_RESOLVER_BACKEND: 's3' }),
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
    const error = captureThrown(() =>
      createCompiledCodeResolver(makeResolverEnv({ DVT_COMPILED_CODE_RESOLVER_BACKEND: 's3' }), {
        retryPolicy: { maxAttempts: 1, initialDelayMs: 0, maxDelayMs: 0 },
      })
    );

    expectCompiledCodeReaderError(error, {
      reasonCode: LINEAGE_ERROR_REASON_CODE.COMPILED_CODE_READER_MISSING_S3_REGION,
    });
  });

  it('rejects s3:// compiled code in auto mode without a region', async () => {
    await withTemporaryEnv({ AWS_REGION: undefined, AWS_DEFAULT_REGION: undefined }, async () => {
      const sqlText = 'select count(*) from fct_sales';
      const ref = mkRef('s3://dvt-artifacts/prod/compiled/fct_sales.sql', sqlText);
      const resolver = createCompiledCodeResolver(makeResolverEnv(), {
        retryPolicy: { maxAttempts: 1, initialDelayMs: 0, maxDelayMs: 0 },
      });

      const error = await captureRejected(() => resolver.resolve(ref));

      expectCompiledCodeReaderError(error, {
        reasonCode: LINEAGE_ERROR_REASON_CODE.COMPILED_CODE_READER_MISSING_S3_REGION,
      });
    });
  });

  it('maps missing file:// compiled code to CompiledCodeNotFoundError', async () => {
    const tempDir = await mkdtemp(join(tmpdir(), 'dvt-lineage-worker-'));
    try {
      const missingPath = join(tempDir, 'missing.sql');
      const ref = mkRef(pathToFileURL(missingPath).href, 'select * from never_written');
      const resolver = createCompiledCodeResolver(
        makeResolverEnv({ DVT_COMPILED_CODE_RESOLVER_BACKEND: 'file' }),
        { retryPolicy: { maxAttempts: 3, initialDelayMs: 0, maxDelayMs: 0 } }
      );

      await expect(resolver.resolve(ref)).rejects.toMatchObject({
        code: LINEAGE_ERROR_CODE.COMPILED_CODE_NOT_FOUND,
        messageKey: LINEAGE_ERROR_MESSAGE_KEY.COMPILED_CODE_NOT_FOUND,
        messageParams: { storageUri: ref.storageUri },
        name: 'CompiledCodeNotFoundError',
      });
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it('maps S3 missing objects to CompiledCodeNotFoundError', async () => {
    const sqlText = 'select * from fct_missing';
    const ref = mkRef('s3://dvt-artifacts/prod/compiled/fct_missing.sql', sqlText);
    const send = vi
      .spyOn(S3Client.prototype, 'send')
      .mockRejectedValueOnce(Object.assign(new Error('missing'), { name: 'NoSuchKey' }));

    try {
      const resolver = createCompiledCodeResolver(
        makeResolverEnv({
          DVT_COMPILED_CODE_RESOLVER_BACKEND: 's3',
          DVT_COMPILED_CODE_RESOLVER_S3_REGION: 'eu-west-1',
        }),
        { retryPolicy: { maxAttempts: 3, initialDelayMs: 0, maxDelayMs: 0 } }
      );

      const error = await resolver.resolve(ref).catch((err: unknown) => err);

      expect(send).toHaveBeenCalledTimes(1);
      expect(error).toBeInstanceOf(CompiledCodeNotFoundError);
      expect(error).toMatchObject({
        code: LINEAGE_ERROR_CODE.COMPILED_CODE_NOT_FOUND,
        messageKey: LINEAGE_ERROR_MESSAGE_KEY.COMPILED_CODE_NOT_FOUND,
        messageParams: { storageUri: ref.storageUri },
        name: 'CompiledCodeNotFoundError',
      });
    } finally {
      send.mockRestore();
    }
  });

  it('serializes plain-object S3 failures instead of using default object stringification', async () => {
    const sqlText = 'select * from fct_broken';
    const ref = mkRef('s3://dvt-artifacts/prod/compiled/fct_broken.sql', sqlText);
    const send = vi.spyOn(S3Client.prototype, 'send').mockRejectedValueOnce({
      detail: 'bucket offline',
      kind: 'transport',
    });

    try {
      const resolver = createCompiledCodeResolver(
        makeResolverEnv({
          DVT_COMPILED_CODE_RESOLVER_BACKEND: 's3',
          DVT_COMPILED_CODE_RESOLVER_S3_REGION: 'eu-west-1',
        }),
        { retryPolicy: { maxAttempts: 1, initialDelayMs: 0, maxDelayMs: 0 } }
      );

      const error = await resolver.resolve(ref).catch((err: unknown) => err);

      expectCompiledCodeReaderError(error, {
        reasonCode: LINEAGE_ERROR_REASON_CODE.COMPILED_CODE_READER_READ_FAILED,
        sourceUri: ref.storageUri,
      });
      expect(error).toMatchObject({
        messageParams: {
          reason: JSON.stringify({ detail: 'bucket offline', kind: 'transport' }),
        },
      });
      expect(error).not.toMatchObject({
        messageParams: { reason: '[object Object]' },
      });
    } finally {
      send.mockRestore();
    }
  });
});
