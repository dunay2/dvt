import { URL } from 'node:url';

import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import type { CompiledCodeRef } from '@dvt/contracts';
import {
  CompiledCodeReaderError,
  CompiledCodeUnsupportedSchemeError,
  LINEAGE_ERROR_REASON_CODE,
  sha256HexUtf8,
  type CompiledCodeBlob,
  type ICompiledCodeReader,
} from '@dvt/traceability-service';

import { resolveUriScheme, toCompiledCodeReaderError } from './errorMapping.js';
import { resolveS3Region } from './policy.js';
import type { CompiledCodeResolverEnv, S3ResolverEnv } from './types.js';

export function createS3UriCompiledCodeReader(env: CompiledCodeResolverEnv): ICompiledCodeReader {
  return new S3UriCompiledCodeReader(env);
}

class S3UriCompiledCodeReader implements ICompiledCodeReader {
  private client: S3Client | null = null;

  constructor(private readonly env: S3ResolverEnv) {}

  private getClient(): S3Client {
    this.client ??= createS3Client(this.env);
    return this.client;
  }

  async read(ref: CompiledCodeRef): Promise<CompiledCodeBlob> {
    const parsed = parseS3Uri(ref.storageUri);
    if (parsed === null) {
      throw new CompiledCodeUnsupportedSchemeError({
        actualScheme: resolveUriScheme(ref.storageUri),
        expectedScheme: 's3',
        storageUri: ref.storageUri,
      });
    }

    try {
      const bytes = await this.readObjectBytes(parsed, ref.storageUri);
      return toCompiledCodeBlob(ref.storageUri, bytes);
    } catch (error) {
      throw toCompiledCodeReaderError(ref.storageUri, error);
    }
  }

  private async readObjectBytes(
    parsed: { bucket: string; key: string },
    storageUri: string
  ): Promise<Uint8Array> {
    const response = await this.getClient().send(
      new GetObjectCommand({ Bucket: parsed.bucket, Key: parsed.key })
    );
    const bytes = await response.Body?.transformToByteArray();
    if (!bytes) {
      throw new CompiledCodeReaderError({
        reasonCode: LINEAGE_ERROR_REASON_CODE.COMPILED_CODE_READER_EMPTY_S3_BODY,
        reason: 'Empty S3 body',
        sourceUri: storageUri,
      });
    }
    return bytes;
  }
}

function createS3Client(env: S3ResolverEnv): S3Client {
  const region = resolveS3Region(env);
  if (!region) {
    throw new CompiledCodeReaderError({
      reasonCode: LINEAGE_ERROR_REASON_CODE.COMPILED_CODE_READER_MISSING_S3_REGION,
      reason:
        'Missing S3 region for compiled code resolver. Set DVT_COMPILED_CODE_RESOLVER_S3_REGION, AWS_REGION, or AWS_DEFAULT_REGION.',
    });
  }

  return new S3Client({
    region,
    ...(env.DVT_COMPILED_CODE_RESOLVER_S3_ENDPOINT
      ? { endpoint: env.DVT_COMPILED_CODE_RESOLVER_S3_ENDPOINT }
      : {}),
    forcePathStyle: env.DVT_COMPILED_CODE_RESOLVER_S3_FORCE_PATH_STYLE,
  });
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

function toCompiledCodeBlob(sourceUri: string, bytes: Uint8Array): CompiledCodeBlob {
  const sqlText = Buffer.from(bytes).toString('utf8');
  return {
    sourceUri,
    sqlText,
    sha256: sha256HexUtf8(sqlText),
    sizeBytes: Buffer.byteLength(sqlText, 'utf8'),
    encoding: 'utf-8',
  };
}
