/** Owned concern: persist one server-created run execution context in the configured artifact store. */
import { pathToFileURL } from 'node:url';

import {
  createDefaultS3ContentAddressedArtifactStore,
  encodeS3TenantPathSegment,
  type DbtProjectBundleArtifactStore,
  type IContentAddressedArtifactStore,
  type IRunExecutionContextReferenceStore,
} from '@dvt/artifacts';
import { parseRunExecutionContextRef, type RunExecutionContextRef } from '@dvt/contracts';
import { sha256Hex } from '@dvt/crypto';

import type {
  IRunExecutionContextWriter,
  RunExecutionContextWriteResult,
} from '../../application/ports/runExecutionContextWriter.js';

import { writeImmutableFileArtifact } from './immutableFileArtifactWriter.js';
import {
  resolveRunExecutionContextArtifactPath,
  resolveRunExecutionContextReferenceArtifactPath,
} from './runExecutionContextArtifactPath.js';

const RUN_EXECUTION_CONTEXT_MEDIA_TYPE = 'application/json';

export class ArtifactBackedRunExecutionContextWriter implements IRunExecutionContextWriter {
  public constructor(
    private readonly store: DbtProjectBundleArtifactStore | undefined,
    private readonly s3ArtifactStore?: IContentAddressedArtifactStore,
    private readonly referenceStore?: IRunExecutionContextReferenceStore
  ) {}

  public async write(
    input: Parameters<IRunExecutionContextWriter['write']>[0]
  ): Promise<RunExecutionContextWriteResult> {
    if (this.store === undefined) return { ok: false, reason: 'artifact_store_unavailable' };

    const bytes = Buffer.from(JSON.stringify(input.context), 'utf8');
    const sha256 = sha256Hex(bytes);

    if (this.store.kind === 's3') {
      if (this.referenceStore === undefined) {
        return { ok: false, reason: 'artifact_store_unavailable' };
      }
      const uri = `s3://${this.store.bucket}/tenants/${encodeS3TenantPathSegment(input.context.tenantId)}/${sha256}`;
      const ref = buildReference(input.context, uri, sha256);
      const artifactStore = this.s3ArtifactStore ?? createDefaultS3ContentAddressedArtifactStore();
      await artifactStore.publish({
        tenantId: input.context.tenantId,
        storageUri: uri,
        sha256,
        sizeBytes: bytes.byteLength,
        mediaType: RUN_EXECUTION_CONTEXT_MEDIA_TYPE,
        bytes,
      });
      await this.referenceStore.put({
        tenantId: input.context.tenantId,
        runId: input.runId,
        ref,
      });
      return { ok: true, ref };
    }

    const artifactPath = resolveRunExecutionContextArtifactPath({
      rootPath: this.store.rootPath,
      tenantId: input.context.tenantId,
      runId: input.runId,
    });
    const ref = buildReference(input.context, pathToFileURL(artifactPath).href, sha256);
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

function buildReference(
  context: Parameters<IRunExecutionContextWriter['write']>[0]['context'],
  uri: string,
  sha256: string
): RunExecutionContextRef {
  return parseRunExecutionContextRef({
    uri,
    sha256,
    schemaVersion: context.schemaVersion,
    planId: context.planId,
    planVersion: context.planVersion,
    ...(context.pluginCompatibilityFingerprint === undefined
      ? {}
      : { pluginCompatibilityFingerprint: context.pluginCompatibilityFingerprint }),
  });
}
