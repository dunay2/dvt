import { describe, expect, it } from 'vitest';

import { S3ArchiveObjectStore } from '../src/lifecycle/adapters/S3ArchiveObjectStore.js';

class FakeS3Client {
  constructor(private readonly behavior: () => Promise<unknown>) {}

  async send(): Promise<unknown> {
    return this.behavior();
  }
}

function makeStore(client: FakeS3Client): S3ArchiveObjectStore {
  return new S3ArchiveObjectStore({
    bucket: 'archive-bucket',
    client: client as unknown as import('@aws-sdk/client-s3').S3Client,
  });
}

describe('S3ArchiveObjectStore.existsObject', () => {
  it('returns true when head succeeds', async () => {
    const store = makeStore(new FakeS3Client(async () => ({ ok: true })));
    await expect(store.existsObject('unit/events.jsonl')).resolves.toBe(true);
  });

  it('returns false for not-found symbolic errors', async () => {
    const error = Object.assign(new Error('missing'), { name: 'NotFound' });
    const store = makeStore(new FakeS3Client(async () => Promise.reject(error)));
    await expect(store.existsObject('unit/events.jsonl')).resolves.toBe(false);
  });

  it('returns false for HTTP 404 metadata', async () => {
    const error = Object.assign(new Error('missing'), { $metadata: { httpStatusCode: 404 } });
    const store = makeStore(new FakeS3Client(async () => Promise.reject(error)));
    await expect(store.existsObject('unit/events.jsonl')).resolves.toBe(false);
  });

  it('rethrows non-not-found S3 errors', async () => {
    const error = Object.assign(new Error('throttled'), { name: 'ThrottlingException' });
    const store = makeStore(new FakeS3Client(async () => Promise.reject(error)));
    await expect(store.existsObject('unit/events.jsonl')).rejects.toThrow('throttled');
  });
});
