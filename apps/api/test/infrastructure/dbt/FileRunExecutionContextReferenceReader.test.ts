import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { URL } from 'node:url';

import { parseRunExecutionContext } from '@dvt/contracts';
import { afterEach, describe, expect, it } from 'vitest';

import { FileDbtRunExecutionContextWriter } from '../../../src/infrastructure/dbt/FileDbtRunExecutionContextWriter.js';
import { FileRunExecutionContextInheritanceWriter } from '../../../src/infrastructure/dbt/FileRunExecutionContextInheritanceWriter.js';
import { FileRunExecutionContextReferenceReader } from '../../../src/infrastructure/dbt/FileRunExecutionContextReferenceReader.js';
import { resolveRunExecutionContextArtifactPath } from '../../../src/infrastructure/dbt/runExecutionContextArtifactPath.js';

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
      written.ok ? { kind: 'trusted', ref: written.ref } : { kind: 'absent' }
    );
  });

  it('returns no reference when the source run has no persisted execution context', async () => {
    root = await mkdtemp(path.join(tmpdir(), 'dvt-run-context-reader-'));
    const reader = new FileRunExecutionContextReferenceReader({ kind: 'file', rootPath: root });

    await expect(reader.read({ tenantId: 'tenant-1', runId: 'missing-run' })).resolves.toEqual({
      kind: 'absent',
    });
  });

  it('returns the original reference when persisted context bytes are later modified', async () => {
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
      pluginContexts: {},
    });
    const writer = new FileDbtRunExecutionContextWriter(store);
    const reader = new FileRunExecutionContextReferenceReader(store);
    const written = await writer.write({ runId: 'run-source-1', context });
    if (!written.ok) throw new Error('Expected an immutable run-context reference.');

    await writeFile(
      new URL(written.ref.uri),
      JSON.stringify({ ...context, createdBy: 'modified' })
    );

    await expect(reader.read({ tenantId: 'tenant-1', runId: 'run-source-1' })).resolves.toEqual({
      kind: 'trusted',
      ref: written.ref,
    });
    await expect(
      new FileRunExecutionContextInheritanceWriter(store).inherit({
        tenantId: 'tenant-1',
        sourceRunId: 'run-source-1',
        recoveryRunId: 'run-recovery-1',
        sourceRef: written.ref,
      })
    ).rejects.toThrow('digest verification');
  });

  it('marks pre-reference context artifacts as untrusted instead of minting a digest', async () => {
    root = await mkdtemp(path.join(tmpdir(), 'dvt-run-context-reader-'));
    const artifactPath = resolveRunExecutionContextArtifactPath({
      rootPath: root,
      tenantId: 'tenant-1',
      runId: 'run-source-1',
    });
    await mkdir(path.dirname(artifactPath), { recursive: true });
    await writeFile(artifactPath, JSON.stringify({ schemaVersion: 'v1.0' }));
    const reader = new FileRunExecutionContextReferenceReader({ kind: 'file', rootPath: root });

    await expect(reader.read({ tenantId: 'tenant-1', runId: 'run-source-1' })).resolves.toEqual({
      kind: 'untrusted',
      reason: 'reference_missing',
    });
  });

  it('copies verified context bytes into a trusted recovery descendant artifact', async () => {
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
      pluginContexts: {},
    });
    const original = await new FileDbtRunExecutionContextWriter(store).write({
      runId: 'run-source-1',
      context,
    });
    if (!original.ok) throw new Error('Expected an immutable run-context reference.');

    const inherited = await new FileRunExecutionContextInheritanceWriter(store).inherit({
      tenantId: 'tenant-1',
      sourceRunId: 'run-source-1',
      recoveryRunId: 'run-recovery-1',
      sourceRef: original.ref,
    });

    await expect(
      new FileRunExecutionContextReferenceReader(store).read({
        tenantId: 'tenant-1',
        runId: 'run-recovery-1',
      })
    ).resolves.toEqual({ kind: 'trusted', ref: inherited });
    expect(inherited).toMatchObject({
      sha256: original.ref.sha256,
      planId: original.ref.planId,
      planVersion: original.ref.planVersion,
    });
    expect(inherited.uri).not.toBe(original.ref.uri);
  });
});
