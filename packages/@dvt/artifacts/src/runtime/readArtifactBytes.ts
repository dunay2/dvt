import { readFile } from 'node:fs/promises';
import { fileURLToPath, URL } from 'node:url';

import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';

import { ArtifactReadError } from './ArtifactReadError.js';

type S3LikeClient = Pick<S3Client, 'send'>;

export interface ArtifactReadRuntimeOptions {
  readonly nodeEnv?: string;
  readonly s3Client?: S3LikeClient;
  readonly abortSignal?: globalThis.AbortSignal;
}

export interface ReadArtifactBytesOptions extends ArtifactReadRuntimeOptions {
  readonly artifactLabel: string;
  readonly uriLabel: string;
}

export interface ReadArtifactResult {
  readonly bytes: Uint8Array;
  readonly contentLength?: number;
  readonly contentType?: string;
}

const DEFAULT_NODE_ENV = 'development';
let defaultS3Client: S3LikeClient | undefined;

export async function readArtifactBytes(
  uri: string,
  options: ReadArtifactBytesOptions
): Promise<Uint8Array> {
  return (await readArtifact(uri, options)).bytes;
}

export async function readArtifact(
  uri: string,
  options: ReadArtifactBytesOptions
): Promise<ReadArtifactResult> {
  const parsedUri = parseArtifactUri(uri, options.uriLabel);
  const nodeEnv = options.nodeEnv ?? process.env['NODE_ENV'] ?? DEFAULT_NODE_ENV;
  const s3Client = options.s3Client ?? getDefaultS3Client();
  const scheme = normalizeScheme(parsedUri.protocol);

  if (scheme === 's3') {
    return readS3Artifact(parsedUri, s3Client, options.artifactLabel, options.abortSignal);
  }

  if (scheme === 'file') {
    if (nodeEnv === 'production') {
      throw new ArtifactReadError(
        'ARTIFACT_FILE_NOT_ALLOWED_IN_PRODUCTION',
        `file:// ${options.uriLabel} is not allowed in production`
      );
    }

    return readFileArtifact(parsedUri, options.artifactLabel, options.abortSignal);
  }

  throw new ArtifactReadError(
    'ARTIFACT_URI_UNSUPPORTED',
    `unsupported ${options.uriLabel} URI scheme: ${scheme}`
  );
}

function getDefaultS3Client(): S3LikeClient {
  defaultS3Client ??= new S3Client({});
  return defaultS3Client;
}

function parseArtifactUri(uri: string, uriLabel: string): URL {
  try {
    return new URL(uri);
  } catch (error) {
    throw new ArtifactReadError(
      'ARTIFACT_URI_INVALID',
      `unsupported ${uriLabel} URI scheme: ${readSchemeToken(uri)}`,
      { cause: error }
    );
  }
}

async function readFileArtifact(
  uri: URL,
  artifactLabel: string,
  abortSignal?: globalThis.AbortSignal
): Promise<ReadArtifactResult> {
  try {
    const bytes = await readFile(fileURLToPath(uri), { signal: abortSignal });
    return {
      bytes,
      contentLength: bytes.byteLength,
    };
  } catch (error) {
    if (isMissingFileError(error)) {
      throw new ArtifactReadError(
        'ARTIFACT_NOT_FOUND',
        `${artifactLabel} artifact could not be found`,
        { cause: error }
      );
    }

    throw error;
  }
}

async function readS3Artifact(
  uri: URL,
  s3Client: S3LikeClient,
  artifactLabel: string,
  abortSignal?: globalThis.AbortSignal
): Promise<ReadArtifactResult> {
  const bucket = uri.hostname;
  const key = uri.pathname.slice(1);

  if (bucket.length === 0 || key.length === 0) {
    const detail =
      bucket.length === 0 && key.length === 0
        ? 'missing bucket and key'
        : bucket.length === 0
          ? 'missing bucket'
          : 'missing key';

    throw new ArtifactReadError(
      'ARTIFACT_URI_LOCATOR_INVALID',
      `${artifactLabel} artifact locator is invalid: ${detail}`
    );
  }

  try {
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    });
    const response = abortSignal
      ? await s3Client.send(command, { abortSignal })
      : await s3Client.send(command);
    const bytes = await readS3ResponseBody(response.Body, artifactLabel);
    return {
      bytes,
      ...(response.ContentLength === undefined ? {} : { contentLength: response.ContentLength }),
      ...(response.ContentType === undefined ? {} : { contentType: response.ContentType }),
    };
  } catch (error) {
    if (isS3NotFoundError(error)) {
      throw new ArtifactReadError(
        'ARTIFACT_NOT_FOUND',
        `${artifactLabel} artifact could not be found`,
        { cause: error }
      );
    }

    throw error;
  }
}

async function readS3ResponseBody(body: unknown, artifactLabel: string): Promise<Uint8Array> {
  if (body && typeof body === 'object' && 'transformToByteArray' in body) {
    const transformToByteArray = (body as { transformToByteArray?: () => Promise<Uint8Array> })
      .transformToByteArray;
    if (typeof transformToByteArray === 'function') {
      return transformToByteArray.call(body);
    }
  }

  if (body instanceof Uint8Array) {
    return body;
  }

  if (typeof body === 'string') {
    return Buffer.from(body, 'utf8');
  }

  throw new ArtifactReadError(
    'ARTIFACT_PAYLOAD_INVALID',
    `${artifactLabel} artifact payload is invalid`
  );
}

function normalizeScheme(protocol: string): string {
  return protocol.replace(/:$/, '').toLowerCase();
}

function readSchemeToken(uri: string): string {
  const token = uri.split(':', 1)[0]?.trim().toLowerCase();
  return token && token.length > 0 ? token : 'unknown';
}

function isMissingFileError(error: unknown): boolean {
  return (
    error instanceof Error &&
    ((error as Error & { code?: unknown }).code === 'ENOENT' ||
      (error as Error & { code?: unknown }).code === 'ENOTDIR')
  );
}

function isS3NotFoundError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const name = (error as Error & { name?: unknown }).name;
  if (name === 'NoSuchKey' || name === 'NotFound') {
    return true;
  }

  const statusCode = (error as Error & { $metadata?: { httpStatusCode?: unknown } }).$metadata
    ?.httpStatusCode;
  return statusCode === 404;
}
