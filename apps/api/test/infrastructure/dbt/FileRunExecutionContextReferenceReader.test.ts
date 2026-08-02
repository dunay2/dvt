import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { parseRunExecutionContext } from '@dvt/contracts';
import { afterEach, describe, expect, it } from 'vitest';

import { FileDbtRunExecutionContextWriter } from '../../../src/infrastructure/dbt/FileDbtRunExecutionContextWriter.js';
import { FileRunExecutionContextReferenceReader } from '../../../src/infrastructure/dbt/FileRunExecutionContextReferenceReader.js';

let root: string | undefined;

describe('FileRunExecutionContextReferenceReader', () => {
  afterEach(async () => {
    if (root !== undefined) await rm(root, { recursive: true, force: true });
    root = undefined;
  });

  it('reconstructs the immutable reference written for the authorized source run', async () => {
    root = await mkdtemp(path.join(tmpdir(), 'dvt-run-context-reader-'));
    const store = { kind: 'file' as const, rootPath: root };
    const context = parseRunExecutionContext({
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
      pluginCompatibilityFingerprint: 'c'.repeat(64),
      pluginContexts: {},
    });
    const writer = new FileDbtRunExecutionContextWriter(store);
    const reader = new FileRunExecutionContextReferenceReader(store);
    const written = await writer.write({ runId: 'run-source-1', context });

    await expect(reader.read({ tenantId: 'tenant-1', runId: 'run-source-1' })).resolves.toEqual(
      written.ok ? written.ref : undefined
    );
  });

  it('returns no reference when the source run has no persisted execution context', async () => {
    root = await mkdtemp(path.join(tmpdir(), 'dvt-run-context-reader-'));
    const reader = new FileRunExecutionContextReferenceReader({ kind: 'file', rootPath: root });

    await expect(
      reader.read({ tenantId: 'tenant-1', runId: 'missing-run' })
    ).resolves.toBeUndefined();
  });
});
