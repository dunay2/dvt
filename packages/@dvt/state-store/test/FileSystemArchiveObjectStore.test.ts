import { describe, expect, it } from 'vitest';

import { FileSystemArchiveObjectStore } from '../src/lifecycle/adapters/FileSystemArchiveObjectStore.js';

function makeDirectoryTag(): string {
  const randomPart = Math.random().toString(16).slice(2);
  return `.tmp/dvt-archive-store-${Date.now()}-${randomPart}`;
}

describe('FileSystemArchiveObjectStore.existsObject', () => {
  it('returns true when object exists', async () => {
    const directory = makeDirectoryTag();
    const store = new FileSystemArchiveObjectStore({ directory });
    await store.putObject('bucket/events.jsonl', Buffer.from('hello', 'utf8'), 'text/plain');

    await expect(store.existsObject('bucket/events.jsonl')).resolves.toBe(true);
  });

  it('returns false when object is missing', async () => {
    const directory = makeDirectoryTag();
    const store = new FileSystemArchiveObjectStore({ directory });
    await expect(store.existsObject('bucket/missing.jsonl')).resolves.toBe(false);
  });

  it('throws when object key is empty', async () => {
    const directory = makeDirectoryTag();
    const store = new FileSystemArchiveObjectStore({ directory });
    await expect(store.existsObject('  ')).rejects.toThrow(/ARCHIVE_OBJECT_KEY_REQUIRED/);
  });
});
