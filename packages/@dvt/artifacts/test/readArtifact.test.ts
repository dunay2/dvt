import { describe, expect, it, vi } from 'vitest';

import { readArtifact } from '../src/index.js';

describe('readArtifact', () => {
  it('returns S3 bytes and provider metadata while forwarding cancellation', async () => {
    const signal = new globalThis.AbortController().signal;
    const send = vi.fn(async () => ({
      Body: {
        async transformToByteArray() {
          return Uint8Array.from(Buffer.from('order_id\n1\n', 'utf8'));
        },
      },
      ContentLength: 11,
      ContentType: 'text/csv',
    }));

    const artifact = await readArtifact('s3://fixtures/tenants/tenant-a/digest', {
      artifactLabel: 'source object',
      uriLabel: 'source.storageUri',
      abortSignal: signal,
      s3Client: { send } as never,
    });

    expect(artifact).toEqual({
      bytes: Uint8Array.from(Buffer.from('order_id\n1\n', 'utf8')),
      contentLength: 11,
      contentType: 'text/csv',
    });
    expect(send).toHaveBeenCalledWith(expect.anything(), { abortSignal: signal });
  });

  it('maps a missing S3 object to the stable artifact-not-found code', async () => {
    const missing = Object.assign(new Error('provider key detail'), { name: 'NoSuchKey' });

    await expect(
      readArtifact('s3://fixtures/tenants/tenant-a/missing-digest', {
        artifactLabel: 'source object',
        uriLabel: 'source.storageUri',
        s3Client: { send: vi.fn(async () => Promise.reject(missing)) } as never,
      })
    ).rejects.toMatchObject({ code: 'ARTIFACT_NOT_FOUND' });
  });

  it('propagates an unavailable object-store failure for retry classification by its caller', async () => {
    const unavailable = new Error('object store unavailable');

    await expect(
      readArtifact('s3://fixtures/tenants/tenant-a/digest', {
        artifactLabel: 'source object',
        uriLabel: 'source.storageUri',
        s3Client: { send: vi.fn(async () => Promise.reject(unavailable)) } as never,
      })
    ).rejects.toBe(unavailable);
  });
});
