/** Owned concern: persist and address one server-created run execution context. */
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';

import type { DbtProjectBundleArtifactStore } from '@dvt/artifacts';
import { parseRunExecutionContextRef } from '@dvt/contracts';

import type {
  IRunExecutionContextWriter,
  RunExecutionContextWriteResult,
} from '../../application/ports/runExecutionContextWriter.js';

import { writeImmutableFileArtifact } from './immutableFileArtifactWriter.js';
import {
  resolveRunExecutionContextArtifactPath,
  resolveRunExecutionContextReferenceArtifactPath,
} from './runExecutionContextArtifactPath.js';

export class FileRunExecutionContextWriter implements IRunExecutionContextWriter {
  public constructor(private readonly store: DbtProjectBundleArtifactStore | undefined) {}

  public async write(
    input: Parameters<IRunExecutionContextWriter['write']>[0]
  ): Promise<RunExecutionContextWriteResult> {
    if (this.store === undefined) return { ok: false, reason: 'artifact_store_unavailable' };
    if (this.store.kind !== 'file') return { ok: false, reason: 'artifact_store_unsupported' };

    const bytes = Buffer.from(JSON.stringify(input.context), 'utf8');
    const sha256 = createHash('sha256').update(bytes).digest('hex');
    const artifactPath = resolveRunExecutionContextArtifactPath({
      rootPath: this.store.rootPath,
      tenantId: input.context.tenantId,
      runId: input.runId,
    });
    const ref = parseRunExecutionContextRef({
      uri: pathToFileURL(artifactPath).href,
      sha256,
      schemaVersion: input.context.schemaVersion,
      planId: input.context.planId,
      planVersion: input.context.planVersion,
      ...(input.context.pluginCompatibilityFingerprint === undefined
        ? {}
        : { pluginCompatibilityFingerprint: input.context.pluginCompatibilityFingerprint }),
    });
    const referenceArtifactPath = resolveRunExecutionContextReferenceArtifactPath({
      rootPath: this.store.rootPath,
      tenantId: input.context.tenantId,
      runId: input.runId,
    });

    await writeImmutableFileArtifact(artifactPath, bytes);
    await writeImmutableFileArtifact(
      referenceArtifactPath,
      Buffer.from(JSON.stringify(ref), 'utf8')
    );

    return { ok: true, ref };
  }
}
