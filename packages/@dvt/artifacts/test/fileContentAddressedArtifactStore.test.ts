import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, describe, expect, it } from 'vitest';

import {
  FileContentAddressedArtifactStore,
  locateFileContentAddressedArtifact,
} from '../src/index.js';

const roots: string[] = [];
const tenantId = 'tenant /#?';
const bytes = Buffer.from('select order_id from raw.orders', 'utf8');
const sha256 = createHash('sha256').update(bytes).digest('hex');

async function root(): Promise<string> {
  const value = await mkdtemp(path.join(tmpdir(), 'dvt-file-cas-'));
  roots.push(value);
  return value;
}

afterEach(async () => {
  for (const value of roots.splice(0)) {
    await rm(value, { recursive: true, force: true });
  }
});

describe('FileContentAddressedArtifactStore', () => {
  it('creates the exact content-addressed file and returns its identity', async () => {
    const rootPath = await root();
    const storageUri = locateFileContentAddressedArtifact({ rootPath, tenantId, sha256 });
    const store = new FileContentAddressedArtifactStore({ rootPath });

    await expect(
      store.publish({
        tenantId,
        storageUri,
        sha256,
        sizeBytes: bytes.byteLength,
        mediaType: 'application/sql; charset=utf-8',
        bytes,
      })
    ).resolves.toEqual({
      disposition: 'created',
      storageUri,
      sha256,
      sizeBytes: bytes.byteLength,
      mediaType: 'application/sql; charset=utf-8',
    });
    await expect(readFile(new globalThis.URL(storageUri))).resolves.toEqual(bytes);
  });

  it('treats an identical existing file as an idempotent replay', async () => {
    const rootPath = await root();
    const storageUri = locateFileContentAddressedArtifact({ rootPath, tenantId, sha256 });
    const store = new FileContentAddressedArtifactStore({ rootPath });
    const input = {
      tenantId,
      storageUri,
      sha256,
      sizeBytes: bytes.byteLength,
      mediaType: 'application/sql; charset=utf-8',
      bytes,
    };

    await store.publish(input);
    await expect(store.publish(input)).resolves.toMatchObject({
      disposition: 'verified-existing',
      storageUri,
    });
  });

  it('rejects conflicting existing bytes instead of overwriting them', async () => {
    const rootPath = await root();
    const storageUri = locateFileContentAddressedArtifact({ rootPath, tenantId, sha256 });
    const artifactPath = new globalThis.URL(storageUri);
    await mkdir(path.dirname(fileURLToPath(artifactPath)), { recursive: true });
    await writeFile(artifactPath, Buffer.from('conflict', 'utf8'));
    const store = new FileContentAddressedArtifactStore({ rootPath });

    await expect(
      store.publish({
        tenantId,
        storageUri,
        sha256,
        sizeBytes: bytes.byteLength,
        mediaType: 'application/sql; charset=utf-8',
        bytes,
      })
    ).rejects.toMatchObject({ code: 'ARTIFACT_INTEGRITY_ERROR' });
    await expect(readFile(artifactPath)).resolves.toEqual(Buffer.from('conflict', 'utf8'));
  });

  it('rejects tenant, digest, and byte identity drift before publication', async () => {
    const rootPath = await root();
    const store = new FileContentAddressedArtifactStore({ rootPath });
    const input = {
      tenantId,
      storageUri: locateFileContentAddressedArtifact({ rootPath, tenantId, sha256 }),
      sha256,
      sizeBytes: bytes.byteLength,
      mediaType: 'application/sql; charset=utf-8',
      bytes,
    };

    await expect(
      store.publish({
        ...input,
        storageUri: locateFileContentAddressedArtifact({
          rootPath,
          tenantId: 'another-tenant',
          sha256,
        }),
      })
    ).rejects.toMatchObject({ code: 'ARTIFACT_TENANT_MISMATCH' });
    await expect(
      store.publish({
        ...input,
        storageUri: locateFileContentAddressedArtifact({
          rootPath,
          tenantId,
          sha256: 'a'.repeat(64),
        }),
      })
    ).rejects.toMatchObject({ code: 'ARTIFACT_INTEGRITY_ERROR' });
    await expect(
      store.publish({ ...input, bytes: Buffer.from('different', 'utf8') })
    ).rejects.toMatchObject({ code: 'ARTIFACT_INTEGRITY_ERROR' });
  });
});
