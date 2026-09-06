import { createHash } from 'node:crypto';

import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { describe, expect, it, vi } from 'vitest';

import {
  createDefaultS3ContentAddressedArtifactStore,
  type PublishContentAddressedArtifactInput,
  S3ContentAddressedArtifactStore,
  S3RunExecutionContextReferenceStore,
} from '../src/index.js';

const TENANT_ID = 'tenant-a';
const BYTES = Buffer.from('{"order_id":1}\n', 'utf8');
const SHA256 = createHash('sha256').update(BYTES).digest('hex');
const STORAGE_URI = `s3://het2-artifacts/tenants/${TENANT_ID}/${SHA256}`;

function input(bytes: Uint8Array = BYTES): PublishContentAddressedArtifactInput {
  return {
    tenantId: TENANT_ID,
    storageUri: STORAGE_URI,
    sha256: SHA256,
    sizeBytes: BYTES.byteLength,
    mediaType: 'application/x-ndjson',
    bytes,
  };
}

describe('S3ContentAddressedArtifactStore', () => {
  it('reuses the default store instead of allocating an S3 client per publish', () => {
    expect(createDefaultS3ContentAddressedArtifactStore()).toBe(
      createDefaultS3ContentAddressedArtifactStore()
    );
  });

  it('creates the declared object once using a conditional put', async () => {
    const send = vi.fn(async () => ({}));
    const store = new S3ContentAddressedArtifactStore({ client: { send } as never });

    await expect(store.publish(input())).resolves.toEqual({
      disposition: 'created',
      storageUri: STORAGE_URI,
      sha256: SHA256,
      sizeBytes: BYTES.byteLength,
      mediaType: 'application/x-ndjson',
    });

    const command = send.mock.calls[0]?.[0];
    expect(command).toBeInstanceOf(PutObjectCommand);
    expect(command?.input).toMatchObject({
      Bucket: 'het2-artifacts',
      Key: `tenants/${TENANT_ID}/${SHA256}`,
      ContentType: 'application/x-ndjson',
      ContentLength: BYTES.byteLength,
      IfNoneMatch: '*',
      Metadata: { sha256: SHA256 },
    });
  });

  it('accepts a URL-encoded tenant path segment as the same tenant identity', async () => {
    const tenantId = 'tenant /#?';
    const tenantSegment = encodeURIComponent(tenantId);
    const send = vi.fn(async () => ({}));
    const store = new S3ContentAddressedArtifactStore({ client: { send } as never });

    await store.publish({
      ...input(),
      tenantId,
      storageUri: `s3://het2-artifacts/tenants/${tenantSegment}/${SHA256}`,
    });

    expect(send.mock.calls[0]?.[0]?.input).toMatchObject({
      Key: `tenants/${tenantSegment}/${SHA256}`,
    });
  });

  it('treats an identical existing object as an idempotent replay', async () => {
    const alreadyExists = Object.assign(new Error('provider detail'), {
      name: 'PreconditionFailed',
      $metadata: { httpStatusCode: 412 },
    });
    const send = vi.fn(async (command: unknown) => {
      if (command instanceof PutObjectCommand) throw alreadyExists;
      if (command instanceof GetObjectCommand) {
        return {
          Body: { transformToByteArray: async () => Uint8Array.from(BYTES) },
          ContentLength: BYTES.byteLength,
          ContentType: 'application/x-ndjson',
        };
      }
      throw new Error('unexpected command');
    });
    const store = new S3ContentAddressedArtifactStore({ client: { send } as never });

    await expect(store.publish(input())).resolves.toMatchObject({
      disposition: 'verified-existing',
      storageUri: STORAGE_URI,
    });
    expect(send).toHaveBeenCalledTimes(2);
  });

  it('rejects a conflicting existing object instead of overwriting it', async () => {
    const alreadyExists = Object.assign(new Error('provider detail'), {
      name: 'PreconditionFailed',
    });
    const conflicting = Buffer.from('{"order_id":2}\n', 'utf8');
    const send = vi.fn(async (command: unknown) => {
      if (command instanceof PutObjectCommand) throw alreadyExists;
      return {
        Body: { transformToByteArray: async () => Uint8Array.from(conflicting) },
        ContentLength: conflicting.byteLength,
        ContentType: 'application/x-ndjson',
      };
    });
    const store = new S3ContentAddressedArtifactStore({ client: { send } as never });

    await expect(store.publish(input())).rejects.toMatchObject({
      code: 'ARTIFACT_INTEGRITY_ERROR',
    });
  });

  it('classifies an oversized existing object as a permanent integrity conflict', async () => {
    const alreadyExists = Object.assign(new Error('provider detail'), {
      name: 'PreconditionFailed',
    });
    const oversized = Buffer.concat([BYTES, Buffer.from('x', 'utf8')]);
    const send = vi.fn(async (command: unknown) => {
      if (command instanceof PutObjectCommand) throw alreadyExists;
      return {
        Body: { transformToByteArray: async () => Uint8Array.from(oversized) },
        ContentLength: oversized.byteLength,
        ContentType: 'application/x-ndjson',
      };
    });
    const store = new S3ContentAddressedArtifactStore({ client: { send } as never });

    await expect(store.publish(input())).rejects.toMatchObject({
      name: 'ArtifactStoreError',
      code: 'ARTIFACT_INTEGRITY_ERROR',
    });
    expect(send).toHaveBeenCalledTimes(2);
  });

  it('rejects URI scope or digest drift before contacting S3', async () => {
    const send = vi.fn(async () => ({}));
    const store = new S3ContentAddressedArtifactStore({ client: { send } as never });

    await expect(
      store.publish({
        ...input(),
        storageUri: `s3://het2-artifacts/tenants/tenant-b/${SHA256}`,
      })
    ).rejects.toMatchObject({ code: 'ARTIFACT_TENANT_MISMATCH' });
    expect(send).not.toHaveBeenCalled();
  });

  it('forwards cancellation and never accepts bytes outside the declared identity', async () => {
    const signal = new globalThis.AbortController().signal;
    const send = vi.fn(async () => ({}));
    const store = new S3ContentAddressedArtifactStore({ client: { send } as never });

    await expect(
      store.publish({ ...input(), bytes: Buffer.from('different', 'utf8') })
    ).rejects.toMatchObject({ code: 'ARTIFACT_INTEGRITY_ERROR' });
    expect(send).not.toHaveBeenCalled();

    await store.publish({ ...input(), abortSignal: signal });
    expect(send.mock.calls[0]?.[1]).toEqual({ abortSignal: signal });
  });
});

describe('S3RunExecutionContextReferenceStore', () => {
  it('persists and reloads an immutable run-scoped reference without exposing raw ids', async () => {
    const ref = {
      uri: `s3://het2-artifacts/tenants/${TENANT_ID}/${'a'.repeat(64)}`,
      sha256: 'a'.repeat(64),
      schemaVersion: 'v1.0' as const,
      planId: 'b'.repeat(64),
      planVersion: '1.0',
    };
    const send = vi.fn(async (command: unknown) => {
      if (command instanceof PutObjectCommand) return {};
      if (command instanceof GetObjectCommand) {
        const bytes = Buffer.from(JSON.stringify(ref), 'utf8');
        return {
          Body: { transformToByteArray: async () => Uint8Array.from(bytes) },
          ContentLength: bytes.byteLength,
          ContentType: 'application/json',
        };
      }
      throw new Error('unexpected command');
    });
    const store = new S3RunExecutionContextReferenceStore({
      bucket: 'het2-artifacts',
      client: { send } as never,
    });

    await store.put({ tenantId: TENANT_ID, runId: '../unsafe/run', ref });
    await expect(store.get({ tenantId: TENANT_ID, runId: '../unsafe/run' })).resolves.toEqual(ref);

    const command = send.mock.calls[0]?.[0];
    expect(command).toBeInstanceOf(PutObjectCommand);
    expect(command?.input).toMatchObject({
      Bucket: 'het2-artifacts',
      ContentType: 'application/json',
      IfNoneMatch: '*',
    });
    expect(command?.input.Key).not.toContain(TENANT_ID);
    expect(command?.input.Key).not.toContain('unsafe');
  });

  it('accepts an encoded tenant segment in the referenced context URI', async () => {
    const tenantId = 'tenant /#?';
    const ref = {
      uri: `s3://het2-artifacts/tenants/${encodeURIComponent(tenantId)}/${'a'.repeat(64)}`,
      sha256: 'a'.repeat(64),
      schemaVersion: 'v1.0' as const,
      planId: 'b'.repeat(64),
      planVersion: '1.0',
    };
    const send = vi.fn(async () => ({}));
    const store = new S3RunExecutionContextReferenceStore({
      bucket: 'het2-artifacts',
      client: { send } as never,
    });

    await expect(store.put({ tenantId, runId: 'run-1', ref })).resolves.toBeUndefined();
    expect(send).toHaveBeenCalledOnce();
  });

  it('rejects a conflicting reference for an existing run identity', async () => {
    const ref = {
      uri: `s3://het2-artifacts/tenants/${TENANT_ID}/${'a'.repeat(64)}`,
      sha256: 'a'.repeat(64),
      schemaVersion: 'v1.0' as const,
      planId: 'b'.repeat(64),
      planVersion: '1.0',
    };
    const conflictingRef = {
      ...ref,
      uri: `s3://het2-artifacts/tenants/${TENANT_ID}/${'c'.repeat(64)}`,
      sha256: 'c'.repeat(64),
    };
    const alreadyExists = Object.assign(new Error('provider detail'), {
      name: 'PreconditionFailed',
      $metadata: { httpStatusCode: 412 },
    });
    const send = vi.fn(async (command: unknown) => {
      if (command instanceof PutObjectCommand) throw alreadyExists;
      const bytes = Buffer.from(JSON.stringify(conflictingRef), 'utf8');
      return {
        Body: { transformToByteArray: async () => Uint8Array.from(bytes) },
        ContentLength: bytes.byteLength,
        ContentType: 'application/json',
      };
    });
    const store = new S3RunExecutionContextReferenceStore({
      bucket: 'het2-artifacts',
      client: { send } as never,
    });

    await expect(store.put({ tenantId: TENANT_ID, runId: 'run-1', ref })).rejects.toMatchObject({
      code: 'ARTIFACT_UPLOAD_FAILED',
    });
  });
});
