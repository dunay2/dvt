import { URL } from 'node:url';

import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import type { CompiledCodeRef } from '@dvt/contracts';
import {
  CachedRetryCompiledCodeResolver,
  CompositeCompiledCodeReader,
  FileUriCompiledCodeReader,
  InMemoryCompiledCodeCache,
  SqlJobFacetBuilder,
  StepStartedLineageMapper,
  type CompiledCodeBlob,
  type ICompiledCodeCache,
  type ICompiledCodeReader,
  type ICompiledCodeResolver,
  type ICompiledCodeRetryPolicy,
  sha256HexUtf8,
  CompiledCodeReaderError,
  CompiledCodeUnsupportedSchemeError,
} from '@dvt/traceability-service';

import type { Env } from './env.js';

export type CompiledCodeResolverBackend = 'auto' | 'file' | 's3';

export interface CompiledCodeResolverOptions {
  backend?: CompiledCodeResolverBackend;
  cache?: ICompiledCodeCache;
  readerOverrides?: ReadonlyMap<string, ICompiledCodeReader>;
  retryPolicy?: Partial<ICompiledCodeRetryPolicy>;
}

export function createCompiledCodeResolver(
  env: Pick<
    Env,
    | 'DVT_COMPILED_CODE_RESOLVER_BACKEND'
    | 'DVT_COMPILED_CODE_RESOLVER_S3_ENDPOINT'
    | 'DVT_COMPILED_CODE_RESOLVER_S3_REGION'
    | 'DVT_COMPILED_CODE_RESOLVER_S3_FORCE_PATH_STYLE'
  >,
  options: CompiledCodeResolverOptions = {}
): ICompiledCodeResolver {
  const reader = createCompiledCodeReader(env, options);
  const cache = options.cache ?? new InMemoryCompiledCodeCache();

  return new CachedRetryCompiledCodeResolver({
    reader,
    cache,
    ...(options.retryPolicy ? { retryPolicy: options.retryPolicy } : {}),
  });
}

export function createStepStartedLineageMapper(
  env: Pick<
    Env,
    | 'DVT_COMPILED_CODE_RESOLVER_BACKEND'
    | 'DVT_COMPILED_CODE_RESOLVER_S3_ENDPOINT'
    | 'DVT_COMPILED_CODE_RESOLVER_S3_REGION'
    | 'DVT_COMPILED_CODE_RESOLVER_S3_FORCE_PATH_STYLE'
  >,
  options: CompiledCodeResolverOptions = {}
): StepStartedLineageMapper {
  return new StepStartedLineageMapper({
    compiledCodeResolver: createCompiledCodeResolver(env, options),
    sqlFacetBuilder: new SqlJobFacetBuilder(),
  });
}

function createCompiledCodeReader(
  env: Pick<
    Env,
    | 'DVT_COMPILED_CODE_RESOLVER_BACKEND'
    | 'DVT_COMPILED_CODE_RESOLVER_S3_ENDPOINT'
    | 'DVT_COMPILED_CODE_RESOLVER_S3_REGION'
    | 'DVT_COMPILED_CODE_RESOLVER_S3_FORCE_PATH_STYLE'
  >,
  options: CompiledCodeResolverOptions
): ICompiledCodeReader {
  const backend = options.backend ?? env.DVT_COMPILED_CODE_RESOLVER_BACKEND;
  const fileReader = options.readerOverrides?.get('file') ?? new FileUriCompiledCodeReader();
  const s3Reader =
    options.readerOverrides?.get('s3') ?? new S3UriCompiledCodeReader(createS3Client(env));

  if (backend === 'file') return fileReader;
  if (backend === 's3') return s3Reader;

  const readersByScheme = new Map<string, ICompiledCodeReader>([
    ['file', fileReader],
    ['s3', s3Reader],
  ]);

  for (const [scheme, reader] of options.readerOverrides ?? []) {
    if (!readersByScheme.has(scheme)) {
      readersByScheme.set(scheme, reader);
    }
  }

  return new CompositeCompiledCodeReader(readersByScheme);
}

function createS3Client(
  env: Pick<
    Env,
    | 'DVT_COMPILED_CODE_RESOLVER_BACKEND'
    | 'DVT_COMPILED_CODE_RESOLVER_S3_ENDPOINT'
    | 'DVT_COMPILED_CODE_RESOLVER_S3_REGION'
    | 'DVT_COMPILED_CODE_RESOLVER_S3_FORCE_PATH_STYLE'
  >
): S3Client {
  const region =
    env.DVT_COMPILED_CODE_RESOLVER_S3_REGION ??
    process.env['AWS_REGION'] ??
    process.env['AWS_DEFAULT_REGION'] ??
    'us-east-1';

  return new S3Client({
    region,
    ...(env.DVT_COMPILED_CODE_RESOLVER_S3_ENDPOINT
      ? { endpoint: env.DVT_COMPILED_CODE_RESOLVER_S3_ENDPOINT }
      : {}),
    forcePathStyle: env.DVT_COMPILED_CODE_RESOLVER_S3_FORCE_PATH_STYLE,
  });
}

class S3UriCompiledCodeReader implements ICompiledCodeReader {
  constructor(private readonly client: S3Client) {}

  async read(ref: CompiledCodeRef): Promise<CompiledCodeBlob> {
    const parsed = parseS3Uri(ref.storageUri);
    if (parsed === null) {
      throw new CompiledCodeUnsupportedSchemeError(
        `S3UriCompiledCodeReader only supports s3:// URIs: ${ref.storageUri}`
      );
    }

    try {
      const response = await this.client.send(
        new GetObjectCommand({ Bucket: parsed.bucket, Key: parsed.key })
      );
      const bytes = await response.Body?.transformToByteArray();
      if (!bytes) {
        throw new CompiledCodeReaderError(`Empty S3 body: ${ref.storageUri}`);
      }

      const sqlText = Buffer.from(bytes).toString('utf8');
      return {
        sourceUri: ref.storageUri,
        sqlText,
        sha256: sha256HexUtf8(sqlText),
        sizeBytes: Buffer.byteLength(sqlText, 'utf8'),
        encoding: 'utf-8',
      };
    } catch (error) {
      if (error instanceof CompiledCodeReaderError) {
        throw error;
      }

      if (error instanceof Error) {
        throw new CompiledCodeReaderError(
          `Failed to read compiled code from URI ${ref.storageUri}: ${error.message}`
        );
      }

      throw new CompiledCodeReaderError(
        `Failed to read compiled code from URI ${ref.storageUri}: ${String(error)}`
      );
    }
  }
}

function parseS3Uri(uri: string): { bucket: string; key: string } | null {
  let parsed: URL;
  try {
    parsed = new URL(uri);
  } catch {
    return null;
  }

  if (parsed.protocol !== 's3:') return null;

  const bucket = parsed.hostname;
  const key = decodeURIComponent(parsed.pathname.replace(/^\/+/u, ''));
  if (bucket.length === 0 || key.length === 0) return null;

  return { bucket, key };
}
