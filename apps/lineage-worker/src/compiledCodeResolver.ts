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
    | 'NODE_ENV'
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
    | 'NODE_ENV'
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
    | 'NODE_ENV'
    | 'DVT_COMPILED_CODE_RESOLVER_BACKEND'
    | 'DVT_COMPILED_CODE_RESOLVER_S3_ENDPOINT'
    | 'DVT_COMPILED_CODE_RESOLVER_S3_REGION'
    | 'DVT_COMPILED_CODE_RESOLVER_S3_FORCE_PATH_STYLE'
  >,
  options: CompiledCodeResolverOptions
): ICompiledCodeReader {
  const backend = options.backend ?? env.DVT_COMPILED_CODE_RESOLVER_BACKEND;
  validateCompiledCodeResolverConfiguration(
    env,
    backend,
    options.readerOverrides?.has('s3') ?? false
  );
  const fileReader = createFileUriCompiledCodeReader(
    env,
    options.readerOverrides?.get('file') ?? new FileUriCompiledCodeReader()
  );
  const s3Reader = options.readerOverrides?.get('s3') ?? createS3UriCompiledCodeReader(env);

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
    | 'NODE_ENV'
    | 'DVT_COMPILED_CODE_RESOLVER_S3_ENDPOINT'
    | 'DVT_COMPILED_CODE_RESOLVER_S3_REGION'
    | 'DVT_COMPILED_CODE_RESOLVER_S3_FORCE_PATH_STYLE'
  >
): S3Client {
  const region = resolveS3Region(env);
  if (!region) {
    throw new CompiledCodeReaderError(
      'Missing S3 region for compiled code resolver. Set DVT_COMPILED_CODE_RESOLVER_S3_REGION, AWS_REGION, or AWS_DEFAULT_REGION.'
    );
  }

  return new S3Client({
    region,
    ...(env.DVT_COMPILED_CODE_RESOLVER_S3_ENDPOINT
      ? { endpoint: env.DVT_COMPILED_CODE_RESOLVER_S3_ENDPOINT }
      : {}),
    forcePathStyle: env.DVT_COMPILED_CODE_RESOLVER_S3_FORCE_PATH_STYLE,
  });
}

function createS3UriCompiledCodeReader(
  env: Pick<
    Env,
    | 'NODE_ENV'
    | 'DVT_COMPILED_CODE_RESOLVER_S3_ENDPOINT'
    | 'DVT_COMPILED_CODE_RESOLVER_S3_REGION'
    | 'DVT_COMPILED_CODE_RESOLVER_S3_FORCE_PATH_STYLE'
  >
): ICompiledCodeReader {
  return new S3UriCompiledCodeReader(env);
}

function createFileUriCompiledCodeReader(
  env: Pick<Env, 'NODE_ENV'>,
  delegate: ICompiledCodeReader
): ICompiledCodeReader {
  return new ProductionGuardedFileUriCompiledCodeReader(env.NODE_ENV, delegate);
}

class ProductionGuardedFileUriCompiledCodeReader implements ICompiledCodeReader {
  constructor(
    private readonly nodeEnv: Env['NODE_ENV'],
    private readonly delegate: ICompiledCodeReader
  ) {}

  async read(ref: CompiledCodeRef): Promise<CompiledCodeBlob> {
    if (this.nodeEnv === 'production' && isFileUri(ref.storageUri)) {
      throw new CompiledCodeReaderError(
        `INV-CCREF-007: file:// URIs are prohibited in NODE_ENV=production: ${ref.storageUri}`
      );
    }

    return this.delegate.read(ref);
  }
}

class S3UriCompiledCodeReader implements ICompiledCodeReader {
  private client: S3Client | null = null;

  constructor(
    private readonly env: Pick<
      Env,
      | 'NODE_ENV'
      | 'DVT_COMPILED_CODE_RESOLVER_S3_ENDPOINT'
      | 'DVT_COMPILED_CODE_RESOLVER_S3_REGION'
      | 'DVT_COMPILED_CODE_RESOLVER_S3_FORCE_PATH_STYLE'
    >
  ) {}

  private getClient(): S3Client {
    if (this.client === null) {
      this.client = createS3Client(this.env);
    }

    return this.client;
  }

  async read(ref: CompiledCodeRef): Promise<CompiledCodeBlob> {
    const parsed = parseS3Uri(ref.storageUri);
    if (parsed === null) {
      throw new CompiledCodeUnsupportedSchemeError(
        `S3UriCompiledCodeReader only supports s3:// URIs: ${ref.storageUri}`
      );
    }

    try {
      const response = await this.getClient().send(
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

function resolveS3Region(
  env: Pick<
    Env,
    | 'NODE_ENV'
    | 'DVT_COMPILED_CODE_RESOLVER_S3_ENDPOINT'
    | 'DVT_COMPILED_CODE_RESOLVER_S3_REGION'
    | 'DVT_COMPILED_CODE_RESOLVER_S3_FORCE_PATH_STYLE'
  >
): string | null {
  return (
    env.DVT_COMPILED_CODE_RESOLVER_S3_REGION ??
    process.env['AWS_REGION'] ??
    process.env['AWS_DEFAULT_REGION'] ??
    null
  );
}

function isFileUri(uri: string): boolean {
  try {
    return new URL(uri).protocol === 'file:';
  } catch {
    return false;
  }
}

function validateCompiledCodeResolverConfiguration(
  env: Pick<
    Env,
    | 'NODE_ENV'
    | 'DVT_COMPILED_CODE_RESOLVER_S3_ENDPOINT'
    | 'DVT_COMPILED_CODE_RESOLVER_S3_REGION'
    | 'DVT_COMPILED_CODE_RESOLVER_S3_FORCE_PATH_STYLE'
  >,
  backend: CompiledCodeResolverBackend,
  hasS3ReaderOverride: boolean
): void {
  if (backend === 'file') {
    if (env.NODE_ENV === 'production') {
      throw new CompiledCodeReaderError(
        'INV-CCREF-007: file:// compiled code is prohibited when NODE_ENV=production.'
      );
    }

    return;
  }

  const hasS3Region = resolveS3Region(env) !== null;
  if (backend === 's3' && !hasS3Region && !hasS3ReaderOverride) {
    throw new CompiledCodeReaderError(
      'Missing S3 region for compiled code resolver. Set DVT_COMPILED_CODE_RESOLVER_S3_REGION, AWS_REGION, or AWS_DEFAULT_REGION.'
    );
  }
}
