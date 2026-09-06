import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { URL } from 'node:url';

import { parseRunExecutionContext, type RunExecutionContextRef } from '@dvt/contracts';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type {
  RunExecutionContextExpectedBinding,
  RunExecutionContextReferenceQuery,
} from '../../../src/application/ports/runExecutionContextReferenceReader.js';
import { ArtifactBackedRunExecutionContextInheritanceWriter } from '../../../src/infrastructure/dbt/ArtifactBackedRunExecutionContextInheritanceWriter.js';
import { ArtifactBackedRunExecutionContextReferenceReader } from '../../../src/infrastructure/dbt/ArtifactBackedRunExecutionContextReferenceReader.js';
import { ArtifactBackedRunExecutionContextWriter } from '../../../src/infrastructure/dbt/ArtifactBackedRunExecutionContextWriter.js';
import { FileRunExecutionContextInheritanceWriter } from '../../../src/infrastructure/dbt/FileRunExecutionContextInheritanceWriter.js';
import { FileRunExecutionContextReferenceReader } from '../../../src/infrastructure/dbt/FileRunExecutionContextReferenceReader.js';
import {
  resolveRunExecutionContextArtifactPath,
  resolveRunExecutionContextReferenceArtifactPath,
} from '../../../src/infrastructure/dbt/runExecutionContextArtifactPath.js';

let root: string | undefined;

const EXPECTED_BINDING: RunExecutionContextExpectedBinding = {
  tenantId: 'tenant-1',
  projectId: 'project-1',
  environmentId: 'dev',
  planId: 'a'.repeat(64),
  planVersion: '1.0',
  planSha256: 'b'.repeat(64),
  targetAdapter: 'temporal' as const,
};

function referenceQuery(runId: string): RunExecutionContextReferenceQuery {
  return { tenantId: 'tenant-1', runId, expectedBinding: EXPECTED_BINDING };
}

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
    const writer = new ArtifactBackedRunExecutionContextWriter(store);
    const reader = new FileRunExecutionContextReferenceReader(store);
    const written = await writer.write({ runId: 'run-source-1', context });

    expect(written).toMatchObject({
      ok: true,
      ref: { sha256: 'f599f604f8f5dc22a6a8301a65528cbb2be89928d46b85019a6e7676acb4393a' },
    });

    await expect(reader.read(referenceQuery('run-source-1'))).resolves.toEqual(
      written.ok ? { kind: 'trusted', ref: written.ref } : { kind: 'absent' }
    );
  });

  it('returns no reference when the source run has no persisted execution context', async () => {
    root = await mkdtemp(path.join(tmpdir(), 'dvt-run-context-reader-'));
    const reader = new FileRunExecutionContextReferenceReader({ kind: 'file', rootPath: root });

    await expect(reader.read(referenceQuery('missing-run'))).resolves.toEqual({
      kind: 'absent',
    });
  });

  it('rejects persisted context bytes modified after the immutable reference was written', async () => {
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
    const writer = new ArtifactBackedRunExecutionContextWriter(store);
    const reader = new FileRunExecutionContextReferenceReader(store);
    const written = await writer.write({ runId: 'run-source-1', context });
    if (!written.ok) throw new Error('Expected an immutable run-context reference.');

    await writeFile(
      new URL(written.ref.uri),
      JSON.stringify({ ...context, createdBy: 'modified' })
    );

    await expect(reader.read(referenceQuery('run-source-1'))).resolves.toEqual({
      kind: 'untrusted',
      reason: 'digest_mismatch',
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

  it('rejects reference metadata that does not describe the verified context bytes', async () => {
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
    const written = await new ArtifactBackedRunExecutionContextWriter(store).write({
      runId: 'run-source-1',
      context,
    });
    if (!written.ok) throw new Error('Expected an immutable run-context reference.');
    const referencePath = resolveRunExecutionContextReferenceArtifactPath({
      rootPath: root,
      tenantId: 'tenant-1',
      runId: 'run-source-1',
    });
    const reference = JSON.parse(await readFile(referencePath, 'utf8')) as Record<string, unknown>;
    await writeFile(referencePath, JSON.stringify({ ...reference, planVersion: '2.0' }));

    await expect(
      new FileRunExecutionContextReferenceReader(store).read(referenceQuery('run-source-1'))
    ).resolves.toEqual({ kind: 'untrusted', reason: 'reference_mismatch' });
  });

  it.each([
    ['tenantId', { tenantId: 'tenant-other' }],
    ['projectId', { projectId: 'project-other' }],
    ['environmentId', { environmentId: 'prod' }],
    ['planSha256', { planSha256: 'd'.repeat(64) }],
    ['targetAdapter', { targetAdapter: 'conductor' }],
  ] as const)(
    'rejects a verified context whose %s is outside the authoritative binding',
    async (_field, mismatch) => {
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
      const written = await new ArtifactBackedRunExecutionContextWriter(store).write({
        runId: 'run-source-1',
        context,
      });
      if (!written.ok) throw new Error('Expected an immutable run-context reference.');

      await expect(
        new FileRunExecutionContextReferenceReader(store).read({
          tenantId: 'tenant-1',
          runId: 'run-source-1',
          expectedBinding: {
            tenantId: 'tenant-1',
            projectId: 'project-1',
            environmentId: 'dev',
            planId: 'a'.repeat(64),
            planVersion: '1.0',
            planSha256: 'b'.repeat(64),
            targetAdapter: 'temporal',
            ...mismatch,
          },
        })
      ).resolves.toEqual({ kind: 'untrusted', reason: 'binding_mismatch' });
    }
  );

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

    await expect(reader.read(referenceQuery('run-source-1'))).resolves.toEqual({
      kind: 'untrusted',
      reason: 'reference_missing',
    });
  });

  it('rejects an immutable reference whose context artifact is missing', async () => {
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
    const written = await new ArtifactBackedRunExecutionContextWriter(store).write({
      runId: 'run-source-1',
      context,
    });
    if (!written.ok) throw new Error('Expected an immutable run-context reference.');
    await rm(new URL(written.ref.uri));

    await expect(
      new FileRunExecutionContextReferenceReader(store).read(referenceQuery('run-source-1'))
    ).resolves.toEqual({ kind: 'untrusted', reason: 'context_missing' });
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
    const original = await new ArtifactBackedRunExecutionContextWriter(store).write({
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
      new FileRunExecutionContextReferenceReader(store).read(referenceQuery('run-recovery-1'))
    ).resolves.toEqual({ kind: 'trusted', ref: inherited });
    expect(inherited).toMatchObject({
      sha256: original.ref.sha256,
      planId: original.ref.planId,
      planVersion: original.ref.planVersion,
    });
    expect(inherited.uri).not.toBe(original.ref.uri);
  });

  it('persists and inherits a trusted S3 context reference for recovery', async () => {
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
    const references = new Map<string, RunExecutionContextRef>();
    const referenceStore = {
      get: vi.fn(async ({ runId }: { readonly runId: string }) => references.get(runId)),
      put: vi.fn(
        async ({
          runId,
          ref,
        }: {
          readonly runId: string;
          readonly ref: RunExecutionContextRef;
        }) => {
          references.set(runId, ref);
        }
      ),
    };
    const publish = vi.fn(async (input) => ({
      disposition: 'created' as const,
      storageUri: input.storageUri,
      sha256: input.sha256,
      sizeBytes: input.sizeBytes,
      mediaType: input.mediaType,
    }));
    const contextReader = { resolve: vi.fn(async () => context) };
    const store = { kind: 's3' as const, bucket: 'dvt-run-contexts' };
    const writer = new ArtifactBackedRunExecutionContextWriter(store, { publish }, referenceStore);
    const original = await writer.write({ runId: 'run-source-1', context });
    if (!original.ok) throw new Error('Expected an immutable run-context reference.');
    const originalRef = original.ref;
    const reader = new ArtifactBackedRunExecutionContextReferenceReader(
      store,
      referenceStore,
      contextReader
    );

    await expect(reader.read(referenceQuery('run-source-1'))).resolves.toEqual({
      kind: 'trusted',
      ref: originalRef,
    });

    const inherited = await new ArtifactBackedRunExecutionContextInheritanceWriter(
      store,
      referenceStore,
      contextReader
    ).inherit({
      tenantId: 'tenant-1',
      sourceRunId: 'run-source-1',
      recoveryRunId: 'run-recovery-1',
      sourceRef: originalRef,
    });

    await expect(reader.read(referenceQuery('run-recovery-1'))).resolves.toEqual({
      kind: 'trusted',
      ref: inherited,
    });
    expect(inherited).toEqual(originalRef);
    expect(referenceStore.put).toHaveBeenCalledTimes(2);
  });
});
