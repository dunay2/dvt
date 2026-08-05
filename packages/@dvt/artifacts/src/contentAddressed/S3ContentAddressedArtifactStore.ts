import { PutObjectCommand, type S3Client } from '@aws-sdk/client-s3';
import { ArtifactStoreError } from '@dvt/contracts';

import { computeSha256 } from '../compiledCode/sha256.js';
import { ArtifactReadError } from '../runtime/ArtifactReadError.js';
import { readArtifact } from '../runtime/readArtifactBytes.js';

import type {
  IContentAddressedArtifactStore,
  PublishContentAddressedArtifactInput,
  PublishedContentAddressedArtifact,
} from './IContentAddressedArtifactStore.js';

type S3LikeClient = Pick<S3Client, 'send'>;

export interface S3ContentAddressedArtifactStoreOptions {
  readonly client: S3LikeClient;
}

export class S3ContentAddressedArtifactStore implements IContentAddressedArtifactStore {
  constructor(private readonly options: S3ContentAddressedArtifactStoreOptions) {}

  async publish(
    input: PublishContentAddressedArtifactInput
  ): Promise<PublishedContentAddressedArtifact> {
    const locator = parseAndValidateLocator(input);
    validateBytes(input);

    try {
      const command = new PutObjectCommand({
        Bucket: locator.bucket,
        Key: locator.key,
        Body: input.bytes,
        ContentType: input.mediaType,
        ContentLength: input.sizeBytes,
        IfNoneMatch: '*',
        Metadata: { sha256: input.sha256 },
      });
      if (input.abortSignal === undefined) {
        await this.options.client.send(command);
      } else {
        await this.options.client.send(command, { abortSignal: input.abortSignal });
      }
      return receipt(input, 'created');
    } catch (error) {
      if (!isAlreadyExistsError(error)) throw error;
    }

    const existing = await readExistingArtifact(input, this.options.client);
    validateExistingArtifact(input, existing);
    return receipt(input, 'verified-existing');
  }
}

async function readExistingArtifact(
  input: PublishContentAddressedArtifactInput,
  s3Client: S3LikeClient
): ReturnType<typeof readArtifact> {
  try {
    return await readArtifact(input.storageUri, {
      artifactLabel: 'content-addressed output',
      uriLabel: 'artifact.storageUri',
      s3Client,
      maxBytes: input.sizeBytes,
      ...(input.abortSignal === undefined ? {} : { abortSignal: input.abortSignal }),
    });
  } catch (error) {
    if (error instanceof ArtifactReadError && error.code === 'ARTIFACT_SIZE_LIMIT_EXCEEDED') {
      throw ArtifactStoreError.integritySizeMismatch(input.sizeBytes, input.sizeBytes + 1);
    }
    throw error;
  }
}

function receipt(
  input: PublishContentAddressedArtifactInput,
  disposition: PublishedContentAddressedArtifact['disposition']
): PublishedContentAddressedArtifact {
  return {
    disposition,
    storageUri: input.storageUri,
    sha256: input.sha256,
    sizeBytes: input.sizeBytes,
    mediaType: input.mediaType,
  };
}

function parseAndValidateLocator(input: PublishContentAddressedArtifactInput): {
  bucket: string;
  key: string;
} {
  let uri: globalThis.URL;
  try {
    uri = new globalThis.URL(input.storageUri);
  } catch (error) {
    throw ArtifactStoreError.uploadFailed('artifact storage URI is invalid', error);
  }

  const key = uri.pathname.slice(1);
  const parts = key.split('/');
  if (uri.protocol !== 's3:' || uri.hostname.length === 0 || parts.length !== 3) {
    throw ArtifactStoreError.uploadFailed('artifact storage URI is not content-addressed');
  }
  if (parts[0] !== 'tenants' || parts[1] !== input.tenantId) {
    throw ArtifactStoreError.tenantMismatch(input.tenantId, parts[1] ?? 'missing');
  }
  if (parts[2] !== input.sha256) {
    throw ArtifactStoreError.integrityDigestMismatch(input.sha256, parts[2] ?? 'missing');
  }

  return { bucket: uri.hostname, key };
}

function validateBytes(input: PublishContentAddressedArtifactInput): void {
  if (input.bytes.byteLength !== input.sizeBytes) {
    throw ArtifactStoreError.integritySizeMismatch(input.sizeBytes, input.bytes.byteLength);
  }
  const actualSha256 = computeSha256(Buffer.from(input.bytes));
  if (actualSha256 !== input.sha256) {
    throw ArtifactStoreError.integrityDigestMismatch(input.sha256, actualSha256);
  }
}

function validateExistingArtifact(
  input: PublishContentAddressedArtifactInput,
  existing: {
    readonly bytes: Uint8Array;
    readonly contentLength?: number;
    readonly contentType?: string;
  }
): void {
  if (existing.contentLength !== undefined && existing.contentLength !== input.sizeBytes) {
    throw ArtifactStoreError.integritySizeMismatch(input.sizeBytes, existing.contentLength);
  }
  if (existing.bytes.byteLength !== input.sizeBytes) {
    throw ArtifactStoreError.integritySizeMismatch(input.sizeBytes, existing.bytes.byteLength);
  }
  const actualSha256 = computeSha256(Buffer.from(existing.bytes));
  if (actualSha256 !== input.sha256) {
    throw ArtifactStoreError.integrityDigestMismatch(input.sha256, actualSha256);
  }
  if (existing.contentType !== undefined && existing.contentType !== input.mediaType) {
    throw ArtifactStoreError.uploadFailed('existing artifact media type conflicts with plan');
  }
}

function isAlreadyExistsError(error: unknown): boolean {
  if (error === null || typeof error !== 'object') return false;
  const candidate = error as { name?: unknown; $metadata?: { httpStatusCode?: unknown } };
  return candidate.name === 'PreconditionFailed' || candidate.$metadata?.httpStatusCode === 412;
}
