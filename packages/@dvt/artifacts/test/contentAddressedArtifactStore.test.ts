import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { describe, expect, it, vi } from 'vitest';

import {
  computeSha256,
  type PublishContentAddressedArtifactInput,
  S3ContentAddressedArtifactStore,
} from '../src/index.js';

const TENANT_ID = 'tenant-a';
const BYTES = Buffer.from('{"order_id":1}\n', 'utf8');
const SHA256 = computeSha256(BYTES);
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
