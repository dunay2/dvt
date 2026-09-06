import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL, URL } from 'node:url';

import { parseRunExecutionContextRef } from '@dvt/contracts';
import { describe, expect, it } from 'vitest';

import {
  ArtifactBackedDbtProjectBundleReader,
  ArtifactBackedRunExecutionContextReader,
  resolveRunExecutionContextArtifactStore,
} from '../src/index.js';

class FakeS3Client {
  public constructor(private readonly body: Uint8Array) {}

  public async send(): Promise<unknown> {
    const body = this.body;
    return {
      Body: {
        async transformToByteArray() {
          return Uint8Array.from(body);
        },
      },
    };
  }
}

describe('@dvt/artifacts runtime readers', () => {
  it('resolves one run-context store authority for API and worker composition', () => {
    expect(
      resolveRunExecutionContextArtifactStore({
        dbtBundleStoreBackend: 's3',
        dbtBundleS3Bucket: 'context-bucket',
        workingDirectory: '/runtime',
      })
    ).toEqual({ kind: 's3', bucket: 'context-bucket' });
    expect(
      resolveRunExecutionContextArtifactStore({
        dbtBundleStoreBackend: 'file',
        dbtBundleFileRoot: '/shared/dbt-bundles',
        workingDirectory: '/runtime',
      })
    ).toEqual({ kind: 'file', rootPath: '/shared/dbt-bundles' });
    expect(
      resolveRunExecutionContextArtifactStore({
        workspaceFilesRoot: '/shared/workspaces',
        workingDirectory: '/runtime',
      })
    ).toEqual({
      kind: 'file',
      rootPath: join('/shared/workspaces', '.dvt', 'run-context-artifacts'),
    });
  });

  it('resolves runExecutionContext artifacts from file:// outside production', async () => {
    const { fileUrl: bundleFileUrl } = writeCanonicalBundleFixture('bundle');
    const content = makeRunExecutionContextArtifact(bundleFileUrl);
    const fileUrl = writeTempFixture('runctx.json', content);
    const reader = new ArtifactBackedRunExecutionContextReader({ nodeEnv: 'test' });

    const resolved = await reader.resolve(
      parseRunExecutionContextRef({
        uri: fileUrl,
        sha256: sha256Hex(content),
        schemaVersion: 'v1.0',
        planId: 'plan-1',
        planVersion: '1.0',
      })
    );

    expect(resolved.pluginContexts.dbt?.projectBundleRef.uri).toBe(bundleFileUrl);
  });

  it('rejects file:// runExecutionContext artifacts in production', async () => {
    const { fileUrl: bundleFileUrl } = writeCanonicalBundleFixture('bundle');
    const content = makeRunExecutionContextArtifact(bundleFileUrl);
    const fileUrl = writeTempFixture('runctx-prod.json', content);
    const reader = new ArtifactBackedRunExecutionContextReader({ nodeEnv: 'production' });

    await expect(
      reader.resolve(
        parseRunExecutionContextRef({
          uri: fileUrl,
          sha256: sha256Hex(content),
          schemaVersion: 'v1.0',
          planId: 'plan-1',
          planVersion: '1.0',
        })
      )
    ).rejects.toMatchObject({
      name: 'ArtifactReadError',
      message: 'file:// runExecutionContextRef is not allowed in production',
    });
  });

  it('resolves production file artifacts only from an explicitly allowed root', async () => {
    const content = makeRunExecutionContextArtifact(
      `s3://bundle-bucket/tenants/tenant-1/${'b'.repeat(64)}`
    );
    const allowedRoot = mkdtempSync(join(tmpdir(), 'dvt-artifacts-runctx-root-'));
    const allowedPath = join(allowedRoot, 'tenants', 'tenant-1', sha256Hex(content));
    mkdirSync(join(allowedRoot, 'tenants', 'tenant-1'), { recursive: true });
    writeFileSync(allowedPath, content, 'utf8');
    const reader = new ArtifactBackedRunExecutionContextReader({
      nodeEnv: 'production',
      fileReadRoot: allowedRoot,
    });

    await expect(
      reader.resolve(
        parseRunExecutionContextRef({
          uri: pathToFileURL(allowedPath).href,
          sha256: sha256Hex(content),
          schemaVersion: 'v1.0',
          planId: 'plan-1',
          planVersion: '1.0',
        })
      )
    ).resolves.toMatchObject({ planId: 'plan-1' });

    const outsideUrl = writeTempFixture('outside.json', content);
    await expect(
      reader.resolve(
        parseRunExecutionContextRef({
          uri: outsideUrl,
          sha256: sha256Hex(content),
          schemaVersion: 'v1.0',
          planId: 'plan-1',
          planVersion: '1.0',
        })
      )
    ).rejects.toMatchObject({
      name: 'ArtifactReadError',
      message: 'file:// runExecutionContextRef resolves outside its allowed root',
    });
  });

  it('reads DBT project bundles from s3://', async () => {
    const bundleBytes = Buffer.from('fake bundle');
    const reader = new ArtifactBackedDbtProjectBundleReader({
      nodeEnv: 'production',
      s3Client: new FakeS3Client(bundleBytes) as never,
      bundleStore: {
        kind: 's3',
        bucket: 'bundle-bucket',
      },
    });
    const bundleSha = sha256Hex(bundleBytes);

    await expect(
      reader.read(
        {
          uri: `s3://bundle-bucket/tenants/tenant-1/${bundleSha}`,
          kind: 'dbt-project-bundle',
          sha256: bundleSha,
          tenantId: 'tenant-1',
        },
        {
          expectedTenantId: 'tenant-1',
        }
      )
    ).resolves.toEqual(Uint8Array.from(bundleBytes));
  });

  it('rejects DBT project file:// bundles in production', async () => {
    const { fileUrl, rootDirectory } = writeCanonicalBundleFixture('bundle');
    const reader = new ArtifactBackedDbtProjectBundleReader({
      nodeEnv: 'production',
      bundleStore: {
        kind: 'file',
        rootPath: rootDirectory,
      },
    });

    await expect(
      reader.read(
        {
          uri: fileUrl,
          kind: 'dbt-project-bundle',
          sha256: sha256Hex('bundle'),
          tenantId: 'tenant-1',
        },
        {
          expectedTenantId: 'tenant-1',
        }
      )
    ).rejects.toMatchObject({
      name: 'ArtifactReadError',
    });
    await expect(
      reader.read(
        {
          uri: fileUrl,
          kind: 'dbt-project-bundle',
          sha256: sha256Hex('bundle'),
          tenantId: 'tenant-1',
        },
        {
          expectedTenantId: 'tenant-1',
        }
      )
    ).rejects.toThrow(/file:\/\/ dbt project bundle is not allowed in production/);
  });

  it('rejects DBT project bundles when the bundle tenant does not match the expected tenant', async () => {
    const bundleBytes = Buffer.from('fake bundle');
    const reader = new ArtifactBackedDbtProjectBundleReader({
      nodeEnv: 'production',
      s3Client: new FakeS3Client(bundleBytes) as never,
      bundleStore: {
        kind: 's3',
        bucket: 'bundle-bucket',
      },
    });
    const bundleSha = sha256Hex(bundleBytes);

    await expect(
      reader.read(
        {
          uri: `s3://bundle-bucket/tenants/tenant-2/${bundleSha}`,
          kind: 'dbt-project-bundle',
          sha256: bundleSha,
          tenantId: 'tenant-2',
        },
        {
          expectedTenantId: 'tenant-1',
        }
      )
    ).rejects.toMatchObject({
      name: 'ArtifactReadError',
      message: 'dbt project bundle artifact tenant mismatch: expected=tenant-1 actual=tenant-2',
    });
  });

  it('rejects DBT project bundles when the bytes do not match the declared sha256', async () => {
    const bundleBytes = Buffer.from('fake bundle');
    const reader = new ArtifactBackedDbtProjectBundleReader({
      nodeEnv: 'production',
      s3Client: new FakeS3Client(bundleBytes) as never,
      bundleStore: {
        kind: 's3',
        bucket: 'bundle-bucket',
      },
    });

    await expect(
      reader.read(
        {
          uri: `s3://bundle-bucket/tenants/tenant-1/${'0'.repeat(64)}`,
          kind: 'dbt-project-bundle',
          sha256: '0'.repeat(64),
          tenantId: 'tenant-1',
        },
        {
          expectedTenantId: 'tenant-1',
        }
      )
    ).rejects.toMatchObject({
      name: 'ArtifactStoreError',
      code: 'ARTIFACT_INTEGRITY_ERROR',
      messageKey: 'contracts.error.artifact_integrity_digest_mismatch',
    });
  });

  it('rejects DBT project bundles when the locator is not tenant-scoped canonically', async () => {
    const bundleBytes = Buffer.from('fake bundle');
    const bundleSha = sha256Hex(bundleBytes);
    const reader = new ArtifactBackedDbtProjectBundleReader({
      nodeEnv: 'production',
      s3Client: new FakeS3Client(bundleBytes) as never,
      bundleStore: {
        kind: 's3',
        bucket: 'bundle-bucket',
      },
    });

    await expect(
      reader.read(
        {
          uri: `s3://bundle-bucket/runs/run-1/${bundleSha}`,
          kind: 'dbt-project-bundle',
          sha256: bundleSha,
          tenantId: 'tenant-1',
        },
        {
          expectedTenantId: 'tenant-1',
        }
      )
    ).rejects.toMatchObject({
      name: 'ArtifactReadError',
      message: `DBT project bundle URI must resolve to s3://bundle-bucket/tenants/tenant-1/${bundleSha}`,
    });
  });

  it('rejects DBT project bundles when the bucket does not match the configured artifact store', async () => {
    const bundleBytes = Buffer.from('fake bundle');
    const bundleSha = sha256Hex(bundleBytes);
    const reader = new ArtifactBackedDbtProjectBundleReader({
      nodeEnv: 'production',
      s3Client: new FakeS3Client(bundleBytes) as never,
      bundleStore: {
        kind: 's3',
        bucket: 'canonical-bundle-bucket',
      },
    });

    await expect(
      reader.read(
        {
          uri: `s3://foreign-bucket/tenants/tenant-1/${bundleSha}`,
          kind: 'dbt-project-bundle',
          sha256: bundleSha,
          tenantId: 'tenant-1',
        },
        {
          expectedTenantId: 'tenant-1',
        }
      )
    ).rejects.toMatchObject({
      name: 'ArtifactReadError',
      message:
        'dbt project bundle artifact bucket mismatch: expected=canonical-bundle-bucket actual=foreign-bucket',
    });
  });

  it('rejects DBT project bundles when a file locator redirects to another subtree inside the root', async () => {
    const content = 'bundle';
    const bundleSha = sha256Hex(content);
    const rootDirectory = mkdtempSync(join(tmpdir(), 'dvt-artifacts-bundle-root-'));
    const redirectedPath = join(rootDirectory, 'other-subtree', 'tenants', 'tenant-1', bundleSha);
    mkdirSync(join(rootDirectory, 'other-subtree', 'tenants', 'tenant-1'), { recursive: true });
    writeFileSync(redirectedPath, content, 'utf8');
    const reader = new ArtifactBackedDbtProjectBundleReader({
      nodeEnv: 'test',
      bundleStore: {
        kind: 'file',
        rootPath: rootDirectory,
      },
    });

    await expect(
      reader.read(
        {
          uri: pathToFileURL(redirectedPath).href,
          kind: 'dbt-project-bundle',
          sha256: bundleSha,
          tenantId: 'tenant-1',
        },
        {
          expectedTenantId: 'tenant-1',
        }
      )
    ).rejects.toMatchObject({
      name: 'ArtifactReadError',
      message: `dbt project bundle artifact path mismatch: expected=${join(rootDirectory, 'tenants', 'tenant-1', bundleSha)} actual=${redirectedPath}`,
    });
  });
});

function makeRunExecutionContextArtifact(projectBundleUri: string): string {
  const projectBundleSha = readTerminalPathSegment(projectBundleUri);
  return JSON.stringify({
    schemaVersion: 'v1.0',
    planId: 'plan-1',
    planVersion: '1.0',
    planSha256: 'a'.repeat(64),
    tenantId: 'tenant-1',
    projectId: 'project-1',
    environmentId: 'env-1',
    targetAdapter: 'temporal',
    createdAtIso: '2026-04-14T00:00:00.000Z',
    createdBy: 'test',
    pluginContexts: {
      dbt: {
        credentialRef: 'env:DVT_TEST_DBT_PROFILES',
        projectBundleRef: {
          uri: projectBundleUri,
          kind: 'dbt-project-bundle',
          sha256: projectBundleSha,
          tenantId: 'tenant-1',
        },
      },
    },
  });
}

function sha256Hex(input: string | Uint8Array): string {
  return createHash('sha256').update(input).digest('hex');
}

function writeTempFixture(filename: string, content: string): string {
  const directory = mkdtempSync(join(tmpdir(), 'dvt-artifacts-'));
  const filePath = join(directory, filename);
  writeFileSync(filePath, content, 'utf8');
  return pathToFileURL(filePath).href;
}

function writeCanonicalBundleFixture(
  content: string,
  tenantId = 'tenant-1'
): { fileUrl: string; rootDirectory: string } {
  const sha = sha256Hex(content);
  const rootDirectory = mkdtempSync(join(tmpdir(), 'dvt-artifacts-bundle-'));
  const filePath = join(rootDirectory, 'tenants', tenantId, sha);
  mkdirSync(join(rootDirectory, 'tenants', tenantId), { recursive: true });
  writeFileSync(filePath, content, 'utf8');
  return {
    fileUrl: pathToFileURL(filePath).href,
    rootDirectory,
  };
}

function readTerminalPathSegment(uri: string): string {
  const pathname = decodeURIComponent(new URL(uri).pathname).replace(/\/+$/, '');
  const segment = pathname.split('/').at(-1);
  if (typeof segment !== 'string' || segment.length === 0) {
    throw new Error(`INVALID_BUNDLE_URI:${uri}`);
  }
  return segment;
}
