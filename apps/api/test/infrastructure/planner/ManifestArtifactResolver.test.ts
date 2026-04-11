import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL, URL } from 'node:url';

import { describe, expect, it } from 'vitest';

import { ManifestArtifactResolver } from '../../../src/infrastructure/planner/ManifestArtifactResolver.js';

const FIXTURE_URL = new URL('../../fixtures/planner/basic-manifest.json', import.meta.url);
const FIXTURE_BYTES = readFileSync(FIXTURE_URL);
const FIXTURE_SHA256 = sha256Hex(FIXTURE_BYTES);

class FakeS3Client {
  public readonly commands: unknown[] = [];

  public constructor(private readonly behavior: () => Promise<unknown>) {}

  public async send(command: unknown): Promise<unknown> {
    this.commands.push(command);
    return this.behavior();
  }
}

describe('ManifestArtifactResolver', () => {
  it('resolves file:// manifests outside production', async () => {
    const resolver = new ManifestArtifactResolver({ nodeEnv: 'test' });

    const result = await resolver.resolveManifestRef({
      uri: FIXTURE_URL.href,
      sha256: FIXTURE_SHA256,
    });
    expect(result.kind).toBe('generic-graph-v1');
    expect(result.sourceFamily).toBe('dbt');
    expect(result.sourceVersion).toBe('1.0');
    expect(result.nodes).toHaveLength(3);
    expect(result.nodes).toEqual(
      expect.arrayContaining([
        {
          nodeId: 'model.analytics.order_items',
          stepKind: 'DBT_MODEL',
          dependsOn: ['model.analytics.orders'],
        },
        {
          nodeId: 'model.analytics.orders',
          stepKind: 'DBT_MODEL',
          dependsOn: [],
        },
        {
          nodeId: 'test.analytics.orders_not_null',
          stepKind: 'DBT_TEST',
          dependsOn: ['model.analytics.orders'],
        },
      ])
    );
  });

  it('rejects file:// manifests in production', async () => {
    const resolver = new ManifestArtifactResolver({ nodeEnv: 'production' });

    await expect(
      resolver.resolveManifestRef({ uri: FIXTURE_URL.href, sha256: FIXTURE_SHA256 })
    ).rejects.toMatchObject({
      name: 'ManifestArtifactResolutionError',
      kind: 'file_scheme_prohibited',
      message: 'file:// manifestRef is not allowed in production.',
    });
  });

  it('parses s3:// manifest refs and fetches the expected bucket/key', async () => {
    const client = new FakeS3Client(async () => ({
      Body: {
        async transformToByteArray() {
          return Uint8Array.from(FIXTURE_BYTES);
        },
      },
    }));
    const resolver = new ManifestArtifactResolver({
      s3Client: client as never,
      nodeEnv: 'production',
    });

    const result = await resolver.resolveManifestRef({
      uri: 's3://planner-bucket/path/to/manifest.json',
      sha256: FIXTURE_SHA256,
    });

    expect(result.kind).toBe('generic-graph-v1');
    expect(client.commands).toHaveLength(1);
    expect(client.commands[0]).toMatchObject({
      input: {
        Bucket: 'planner-bucket',
        Key: 'path/to/manifest.json',
      },
    });
  });

  it('preserves a leading slash in S3 object keys', async () => {
    const client = new FakeS3Client(async () => ({
      Body: {
        async transformToByteArray() {
          return Uint8Array.from(FIXTURE_BYTES);
        },
      },
    }));
    const resolver = new ManifestArtifactResolver({
      s3Client: client as never,
      nodeEnv: 'production',
    });

    const result = await resolver.resolveManifestRef({
      uri: 's3://planner-bucket//manifest.json',
      sha256: FIXTURE_SHA256,
    });

    expect(result.kind).toBe('generic-graph-v1');
    expect(client.commands).toHaveLength(1);
    expect(client.commands[0]).toMatchObject({
      input: {
        Bucket: 'planner-bucket',
        Key: '/manifest.json',
      },
    });
  });

  it.each([
    {
      uri: 's3:///manifest.json',
      detail: 'missing bucket',
    },
    {
      uri: 's3://planner-bucket',
      detail: 'missing key',
    },
    {
      uri: 's3:///',
      detail: 'missing bucket and key',
    },
  ])('rejects malformed s3 locator $uri with invalid_artifact_locator', async ({ uri, detail }) => {
    const client = new FakeS3Client(async () => ({
      Body: {
        async transformToByteArray() {
          return Uint8Array.from(FIXTURE_BYTES);
        },
      },
    }));
    const resolver = new ManifestArtifactResolver({
      s3Client: client as never,
      nodeEnv: 'production',
    });

    await expect(
      resolver.resolveManifestRef({
        uri,
        sha256: FIXTURE_SHA256,
      })
    ).rejects.toMatchObject({
      name: 'ManifestArtifactResolutionError',
      kind: 'invalid_artifact_locator',
      detail,
      message: `Manifest artifact locator is invalid: ${detail}.`,
    });
    expect(client.commands).toHaveLength(0);
  });

  it('rejects sha mismatches with integrity_mismatch', async () => {
    const resolver = new ManifestArtifactResolver({ nodeEnv: 'test' });

    await expect(
      resolver.resolveManifestRef({ uri: FIXTURE_URL.href, sha256: '0'.repeat(64) })
    ).rejects.toMatchObject({
      name: 'ManifestArtifactResolutionError',
      kind: 'integrity_mismatch',
      message: 'Manifest artifact integrity mismatch.',
    });
  });

  it('rejects missing artifacts with artifact_not_found', async () => {
    const client = new FakeS3Client(async () =>
      Promise.reject(Object.assign(new Error('missing'), { name: 'NotFound' }))
    );
    const resolver = new ManifestArtifactResolver({
      s3Client: client as never,
      nodeEnv: 'production',
    });

    await expect(
      resolver.resolveManifestRef({
        uri: 's3://planner-bucket/path/to/missing.json',
        sha256: FIXTURE_SHA256,
      })
    ).rejects.toMatchObject({
      name: 'ManifestArtifactResolutionError',
      kind: 'artifact_not_found',
      message: 'Manifest artifact could not be found.',
    });
  });

  it('rejects malformed JSON or invalid manifests with invalid_manifest_payload', async () => {
    const fileUrl = writeTempFixture('{not-json}');
    const resolver = new ManifestArtifactResolver({ nodeEnv: 'test' });

    await expect(
      resolver.resolveManifestRef({ uri: fileUrl, sha256: sha256Hex('{not-json}') })
    ).rejects.toMatchObject({
      name: 'ManifestArtifactResolutionError',
      kind: 'invalid_manifest_payload',
      message: 'Manifest artifact payload is invalid.',
    });
  });

  it('rejects unsupported URI schemes', async () => {
    const resolver = new ManifestArtifactResolver({ nodeEnv: 'test' });

    await expect(
      resolver.resolveManifestRef({
        uri: 'ftp://planner-bucket/manifest.json',
        sha256: FIXTURE_SHA256,
      })
    ).rejects.toMatchObject({
      name: 'ManifestArtifactResolutionError',
      kind: 'unsupported_scheme',
      detail: 'ftp',
      message: 'Unsupported manifestRef URI scheme: ftp.',
    });
  });
});

function sha256Hex(input: Uint8Array | string): string {
  return createHash('sha256').update(input).digest('hex');
}

function writeTempFixture(content: string): string {
  const directory = mkdtempSync(join(tmpdir(), 'dvt-api-manifest-'));
  const filePath = join(directory, 'manifest.json');
  writeFileSync(filePath, content, 'utf8');
  return pathToFileURL(filePath).href;
}
