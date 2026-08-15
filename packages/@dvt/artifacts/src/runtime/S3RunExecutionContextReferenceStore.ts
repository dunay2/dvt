import { createHash } from 'node:crypto';
import { URL } from 'node:url';

import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import {
  ArtifactStoreError,
  parseRunExecutionContextRef,
  type RunExecutionContextRef,
} from '@dvt/contracts';

import { encodeS3TenantPathSegment } from '../contentAddressed/S3ContentAddressedArtifactStore.js';
import type {
  IRunExecutionContextReferenceStore,
  PutRunExecutionContextReferenceInput,
  RunExecutionContextReferenceIdentity,
} from '../ports/IRunExecutionContextReferenceStore.js';

import { ArtifactReadError } from './ArtifactReadError.js';
import { readArtifact } from './readArtifactBytes.js';

type S3LikeClient = Pick<S3Client, 'send'>;

const REFERENCE_MEDIA_TYPE = 'application/json';
const MAX_REFERENCE_BYTES = 16 * 1024;

export interface S3RunExecutionContextReferenceStoreOptions {
  readonly bucket: string;
  readonly client?: S3LikeClient;
}

export class S3RunExecutionContextReferenceStore implements IRunExecutionContextReferenceStore {
  private readonly bucket: string;
  private readonly client: S3LikeClient;

  public constructor(options: S3RunExecutionContextReferenceStoreOptions) {
    if (options.bucket.trim().length === 0) {
      throw new Error('The run-context reference bucket is required.');
    }
    this.bucket = options.bucket;
    this.client = options.client ?? new S3Client({});
  }

  public async put(input: PutRunExecutionContextReferenceInput): Promise<void> {
    assertReferenceBinding(this.bucket, input.tenantId, input.ref);
    const bytes = Buffer.from(JSON.stringify(input.ref), 'utf8');
    if (bytes.byteLength > MAX_REFERENCE_BYTES) {
      throw ArtifactStoreError.uploadFailed('run-context reference exceeds its size limit');
    }

    try {
      await this.client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: buildReferenceKey(input),
          Body: bytes,
          ContentType: REFERENCE_MEDIA_TYPE,
          ContentLength: bytes.byteLength,
          IfNoneMatch: '*',
        })
      );
      return;
    } catch (error) {
      if (!isAlreadyExistsError(error)) throw error;
    }

    const existing = await this.readBytes(input);
    if (existing === undefined || !Buffer.from(existing).equals(bytes)) {
      throw ArtifactStoreError.uploadFailed(
        'run-context reference conflicts with an existing immutable run identity'
      );
    }
  }

  public async get(
    input: RunExecutionContextReferenceIdentity
  ): Promise<RunExecutionContextRef | undefined> {
    const bytes = await this.readBytes(input);
    if (bytes === undefined) return undefined;

    let ref: RunExecutionContextRef;
    try {
      ref = parseRunExecutionContextRef(JSON.parse(Buffer.from(bytes).toString('utf8')));
    } catch (error) {
      throw new ArtifactReadError(
        'ARTIFACT_PAYLOAD_INVALID',
        'run-context reference artifact payload is invalid',
        { cause: error }
      );
    }
    assertReferenceBinding(this.bucket, input.tenantId, ref);
    return ref;
  }

  private async readBytes(
    input: RunExecutionContextReferenceIdentity
  ): Promise<Uint8Array | undefined> {
    try {
      const result = await readArtifact(`s3://${this.bucket}/${buildReferenceKey(input)}`, {
        artifactLabel: 'run-context reference',
        uriLabel: 'run-context reference URI',
        s3Client: this.client,
        maxBytes: MAX_REFERENCE_BYTES,
      });
      if (
        result.contentType !== undefined &&
        !result.contentType.toLowerCase().startsWith(REFERENCE_MEDIA_TYPE)
      ) {
        throw new ArtifactReadError(
          'ARTIFACT_PAYLOAD_INVALID',
          'run-context reference artifact media type is invalid'
        );
      }
      return result.bytes;
    } catch (error) {
      if (error instanceof ArtifactReadError && error.code === 'ARTIFACT_NOT_FOUND') {
        return undefined;
      }
      throw error;
    }
  }
}

function buildReferenceKey(input: RunExecutionContextReferenceIdentity): string {
  return `run-context-references/${hashIdentity(input.tenantId)}/${hashIdentity(input.runId)}.json`;
}

function hashIdentity(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

function assertReferenceBinding(
  bucket: string,
  tenantId: string,
  ref: RunExecutionContextRef
): void {
  let uri: URL;
  try {
    uri = new URL(ref.uri);
  } catch (error) {
    throw new ArtifactReadError('ARTIFACT_URI_INVALID', 'run-context reference URI is invalid', {
      cause: error,
    });
  }
  if (
    uri.protocol !== 's3:' ||
    uri.hostname !== bucket ||
    uri.pathname !== `/tenants/${encodeS3TenantPathSegment(tenantId)}/${ref.sha256}`
  ) {
    throw new ArtifactReadError(
      'ARTIFACT_STORE_MISMATCH',
      'run-context reference is outside its configured tenant artifact store'
    );
  }
}

function isAlreadyExistsError(error: unknown): boolean {
  if (error === null || typeof error !== 'object') return false;
  const candidate = error as { name?: unknown; $metadata?: { httpStatusCode?: unknown } };
  return candidate.name === 'PreconditionFailed' || candidate.$metadata?.httpStatusCode === 412;
}
