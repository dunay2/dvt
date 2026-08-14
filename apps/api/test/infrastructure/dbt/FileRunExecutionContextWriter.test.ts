import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { URL } from 'node:url';

import { parseRunExecutionContext, type RunExecutionContext } from '@dvt/contracts';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { FileRunExecutionContextWriter } from '../../../src/infrastructure/dbt/FileRunExecutionContextWriter.js';

let root: string | undefined;

describe('FileRunExecutionContextWriter', () => {
  afterEach(async () => {
    if (root !== undefined) await rm(root, { recursive: true, force: true });
    root = undefined;
  });

  it('writes an immutable context without exposing the caller run id as a path segment', async () => {
    root = await mkdtemp(path.join(tmpdir(), 'dvt-dbt-run-context-'));
    const context = buildContext();
    const writer = new FileRunExecutionContextWriter({ kind: 'file', rootPath: root });

    const result = await writer.write({ runId: '../unsafe/run', context });

    expect(result).toMatchObject({ ok: true });
    if (!result.ok) throw new Error('Expected a run context reference.');
    expect(result.ref.uri).not.toContain('unsafe');
    await expect(readFile(new URL(result.ref.uri), 'utf8')).resolves.toBe(JSON.stringify(context));
  });

  it('publishes an S3-backed context through the existing content-addressed store', async () => {
    const context = buildContext();
    const publish = vi.fn(async (input) => ({
      disposition: 'created' as const,
      storageUri: input.storageUri,
      sha256: input.sha256,
      sizeBytes: input.sizeBytes,
      mediaType: input.mediaType,
    }));
    const writer = new FileRunExecutionContextWriter(
      { kind: 's3', bucket: 'dvt-run-contexts' },
      { publish }
    );

    const result = await writer.write({ runId: 'run-1', context });

    expect(result).toMatchObject({ ok: true });
    if (!result.ok) throw new Error('Expected a run context reference.');
    expect(result.ref.uri).toBe(
      `s3://dvt-run-contexts/tenants/${context.tenantId}/${result.ref.sha256}`
    );
    expect(publish).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: context.tenantId,
        storageUri: result.ref.uri,
        sha256: result.ref.sha256,
        mediaType: 'application/json',
      })
    );
  });
});

function buildContext(): RunExecutionContext {
  return parseRunExecutionContext({
    schemaVersion: 'v1.0',
    planId: 'a'.repeat(64),
    planVersion: '1.0',
    planSha256: 'b'.repeat(64),
    tenantId: 'tenant-1',
    projectId: 'project-1',
    environmentId: 'dev',
    targetAdapter: 'temporal',
    createdAtIso: '2026-07-15T00:00:00.000Z',
    createdBy: 'principal-1',
    pluginContexts: {
      dbt: {
        credentialRef: 'env:DBT_PROFILES_DIR',
        projectBundleRef: {
          uri: `file:///bundles/tenants/tenant-1/${'c'.repeat(64)}`,
          kind: 'dbt-project-bundle',
          sha256: 'c'.repeat(64),
          tenantId: 'tenant-1',
        },
        targetProfile: 'production',
      },
    },
  });
}
