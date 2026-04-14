import { createHash } from 'node:crypto';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { parseRunExecutionContextRef } from '@dvt/contracts';
import { describe, expect, it } from 'vitest';

import {
  ArtifactBackedDbtProjectBundleReader,
  ArtifactBackedRunExecutionContextReader,
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
  it('resolves runExecutionContext artifacts from file:// outside production', async () => {
    const content = makeRunExecutionContextArtifact();
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

    expect(resolved.pluginContexts.dbt.projectBundleRef).toBe('file:///tmp/project.tgz');
  });

  it('rejects file:// runExecutionContext artifacts in production', async () => {
    const content = makeRunExecutionContextArtifact();
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

  it('reads DBT project bundles from s3://', async () => {
    const bundleBytes = Buffer.from('fake bundle');
    const reader = new ArtifactBackedDbtProjectBundleReader({
      nodeEnv: 'production',
      s3Client: new FakeS3Client(bundleBytes) as never,
    });

    await expect(reader.read('s3://bundle-bucket/dbt/project.tgz')).resolves.toEqual(
      Uint8Array.from(bundleBytes)
    );
  });

  it('rejects DBT project file:// bundles in production', async () => {
    const fileUrl = writeTempFixture('project.tgz', 'bundle');
    const reader = new ArtifactBackedDbtProjectBundleReader({ nodeEnv: 'production' });

    await expect(reader.read(fileUrl)).rejects.toMatchObject({
      name: 'ArtifactReadError',
      message: 'file:// dbt project bundle is not allowed in production',
    });
  });
});

function makeRunExecutionContextArtifact(): string {
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
        projectBundleRef: 'file:///tmp/project.tgz',
      },
    },
  });
}

function sha256Hex(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

function writeTempFixture(filename: string, content: string): string {
  const directory = mkdtempSync(join(tmpdir(), 'dvt-artifacts-'));
  const filePath = join(directory, filename);
  writeFileSync(filePath, content, 'utf8');
  return pathToFileURL(filePath).href;
}
