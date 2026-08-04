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
});
