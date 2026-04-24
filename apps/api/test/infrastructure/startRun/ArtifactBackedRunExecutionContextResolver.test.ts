import { createHash } from 'node:crypto';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { parseRunExecutionContextRef, type RunExecutionContextRef } from '@dvt/contracts';
import { describe, expect, it } from 'vitest';

import { ArtifactBackedRunExecutionContextResolver } from '../../../src/infrastructure/startRun/ArtifactBackedRunExecutionContextResolver.js';

class FakeS3Client {
  public readonly commands: unknown[] = [];

  public constructor(private readonly behavior: () => Promise<unknown>) {}

  public async send(command: unknown): Promise<unknown> {
    this.commands.push(command);
    return this.behavior();
  }
}

describe('ArtifactBackedRunExecutionContextResolver', () => {
  it('resolves file:// artifacts outside production', async () => {
    const content = makeRunExecutionContextArtifact();
    const fileUrl = writeTempFixture(content);
    const resolver = new ArtifactBackedRunExecutionContextResolver({ nodeEnv: 'test' });

    const resolved = await resolver.resolve(
      makeRef({
        uri: fileUrl,
        sha256: sha256Hex(content),
        schemaVersion: 'v1.0',
        planId: 'plan-1',
        planVersion: '1.0',
        pluginCompatibilityFingerprint: FINGERPRINT,
      })
    );

    expect(resolved).toMatchObject({
      schemaVersion: 'v1.0',
      planId: 'plan-1',
      planVersion: '1.0',
      planSha256: PLAN_SHA256,
      targetAdapter: 'temporal',
      pluginCompatibilityFingerprint: FINGERPRINT,
      pluginContexts: {
        dbt: {
          projectBundleRef: {
            uri: `s3://bundle-bucket/tenants/tenant-1/${'b'.repeat(64)}`,
            kind: 'dbt-project-bundle',
            sha256: 'b'.repeat(64),
            tenantId: 'tenant-1',
          },
        },
      },
    });
  });

  it('rejects file:// artifacts in production', async () => {
    const content = makeRunExecutionContextArtifact();
    const fileUrl = writeTempFixture(content);
    const resolver = new ArtifactBackedRunExecutionContextResolver({ nodeEnv: 'production' });

    await expect(
      resolver.resolve(
        makeRef({
          uri: fileUrl,
          sha256: sha256Hex(content),
          schemaVersion: 'v1.0',
          planId: 'plan-1',
          planVersion: '1.0',
        })
      )
    ).rejects.toMatchObject({
      name: 'RunExecutionContextRejectedError',
      message: 'engine.error.run_execution_context_rejected',
      details: {
        reason: 'file:// runExecutionContextRef is not allowed in production',
      },
    });
  });

  it('parses s3:// refs and fetches the expected bucket/key', async () => {
    const content = makeRunExecutionContextArtifact();
    const client = new FakeS3Client(async () => ({
      Body: {
        async transformToByteArray() {
          return Uint8Array.from(Buffer.from(content, 'utf8'));
        },
      },
    }));
    const resolver = new ArtifactBackedRunExecutionContextResolver({
      nodeEnv: 'production',
      s3Client: client as never,
    });

    const resolved = await resolver.resolve(
      makeRef({
        uri: 's3://runctx-bucket/path/to/context.json',
        sha256: sha256Hex(content),
        schemaVersion: 'v1.0',
        planId: 'plan-1',
        planVersion: '1.0',
      })
    );

    expect(resolved.planId).toBe('plan-1');
    expect(client.commands).toHaveLength(1);
    expect(client.commands[0]).toMatchObject({
      input: {
        Bucket: 'runctx-bucket',
        Key: 'path/to/context.json',
      },
    });
  });

  it('rejects sha mismatches', async () => {
    const content = makeRunExecutionContextArtifact();
    const fileUrl = writeTempFixture(content);
    const resolver = new ArtifactBackedRunExecutionContextResolver({ nodeEnv: 'test' });

    await expect(
      resolver.resolve(
        makeRef({
          uri: fileUrl,
          sha256: '0'.repeat(64),
          schemaVersion: 'v1.0',
          planId: 'plan-1',
          planVersion: '1.0',
        })
      )
    ).rejects.toMatchObject({
      name: 'RunExecutionContextRejectedError',
      message: 'engine.error.run_execution_context_rejected',
      details: {
        reason: 'runExecutionContext artifact integrity mismatch',
      },
    });
  });

  it('rejects invalid payloads and ref drift', async () => {
    const invalidJsonUrl = writeTempFixture('{not-json}');
    const invalidPayloadResolver = new ArtifactBackedRunExecutionContextResolver({ nodeEnv: 'test' });

    await expect(
      invalidPayloadResolver.resolve(
        makeRef({
          uri: invalidJsonUrl,
          sha256: sha256Hex('{not-json}'),
          schemaVersion: 'v1.0',
          planId: 'plan-1',
          planVersion: '1.0',
        })
      )
    ).rejects.toMatchObject({
      details: {
        reason: 'runExecutionContext artifact payload is invalid',
      },
    });

    const driftedContent = makeRunExecutionContextArtifact({ planVersion: '2.0' });
    const driftedUrl = writeTempFixture(driftedContent);
    const driftedResolver = new ArtifactBackedRunExecutionContextResolver({ nodeEnv: 'test' });

    await expect(
      driftedResolver.resolve(
        makeRef({
          uri: driftedUrl,
          sha256: sha256Hex(driftedContent),
          schemaVersion: 'v1.0',
          planId: 'plan-1',
          planVersion: '1.0',
        })
      )
    ).rejects.toMatchObject({
      details: {
        reason: 'runExecutionContext.planVersion mismatch: ref=1.0 actual=2.0',
      },
    });
  });

  it('rejects unsupported schemes and malformed s3 locators', async () => {
    const resolver = new ArtifactBackedRunExecutionContextResolver({ nodeEnv: 'test' });

    await expect(
      resolver.resolve(
        makeRef({
          uri: 'ftp://runctx-bucket/context.json',
          sha256: '0'.repeat(64),
          schemaVersion: 'v1.0',
          planId: 'plan-1',
          planVersion: '1.0',
        })
      )
    ).rejects.toMatchObject({
      details: {
        reason: 'unsupported runExecutionContextRef URI scheme: ftp',
      },
    });

    const s3Resolver = new ArtifactBackedRunExecutionContextResolver({
      nodeEnv: 'production',
      s3Client: new FakeS3Client(async () => {
        throw new Error('should not be called');
      }) as never,
    });

    await expect(
      s3Resolver.resolve(
        makeRef({
          uri: 's3:///context.json',
          sha256: '0'.repeat(64),
          schemaVersion: 'v1.0',
          planId: 'plan-1',
          planVersion: '1.0',
        })
      )
    ).rejects.toMatchObject({
      details: {
        reason: 'runExecutionContext artifact locator is invalid: missing bucket',
      },
    });
  });
});

const FINGERPRINT = '1'.repeat(64);
const PLAN_SHA256 = 'a'.repeat(64);

function makeRef(
  overrides?: Partial<{
    uri: string;
    sha256: string;
    schemaVersion: string;
    planId: string;
    planVersion: string;
    pluginCompatibilityFingerprint: string;
  }>
): RunExecutionContextRef {
  return parseRunExecutionContextRef({
    uri: 's3://runctx-bucket/path/to/context.json',
    sha256: sha256Hex(makeRunExecutionContextArtifact()),
    schemaVersion: 'v1.0',
    planId: 'plan-1',
    planVersion: '1.0',
    ...overrides,
  });
}

function makeRunExecutionContextArtifact(
  overrides?: Partial<{
    schemaVersion: string;
    planId: string;
    planVersion: string;
    planSha256: string;
    tenantId: string;
    projectId: string;
    environmentId: string;
    targetAdapter: 'temporal' | 'conductor';
    createdAtIso: string;
    createdBy: string;
    pluginCompatibilityFingerprint: string;
    pluginContexts: Record<string, Record<string, unknown>>;
  }>
): string {
  return JSON.stringify({
    schemaVersion: 'v1.0',
    planId: 'plan-1',
    planVersion: '1.0',
    planSha256: PLAN_SHA256,
    pluginCompatibilityFingerprint: FINGERPRINT,
    tenantId: 'tenant-1',
    projectId: 'project-1',
    environmentId: 'dev',
    targetAdapter: 'temporal',
    createdAtIso: '2026-04-14T10:00:00.000Z',
    createdBy: 'planner-runtime',
    pluginContexts: {
      dbt: {
        projectBundleRef: {
          uri: `s3://bundle-bucket/tenants/tenant-1/${'b'.repeat(64)}`,
          kind: 'dbt-project-bundle',
          sha256: 'b'.repeat(64),
          tenantId: 'tenant-1',
        },
      },
    },
    ...overrides,
  });
}

function sha256Hex(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

function writeTempFixture(content: string): string {
  const directory = mkdtempSync(join(tmpdir(), 'dvt-api-runctx-'));
  const filePath = join(directory, 'run-context.json');
  writeFileSync(filePath, content, 'utf8');
  return pathToFileURL(filePath).href;
}
