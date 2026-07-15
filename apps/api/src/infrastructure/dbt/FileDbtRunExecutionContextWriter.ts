/** Owned concern: persist and address the server-created DBT run execution context. */
import { createHash } from 'node:crypto';
import { mkdir, open, readFile, type FileHandle } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import type { DbtProjectBundleArtifactStore } from '@dvt/artifacts';
import { parseRunExecutionContextRef } from '@dvt/contracts';

import type {
  DbtRunExecutionContextWriteResult,
  IDbtRunExecutionContextWriter,
} from '../../application/ports/dbtRunExecutionContextWriter.js';

export class FileDbtRunExecutionContextWriter implements IDbtRunExecutionContextWriter {
  public constructor(private readonly store: DbtProjectBundleArtifactStore | undefined) {}

  public async write(
    input: Parameters<IDbtRunExecutionContextWriter['write']>[0]
  ): Promise<DbtRunExecutionContextWriteResult> {
    if (this.store === undefined) return { ok: false, reason: 'artifact_store_unavailable' };
    if (this.store.kind !== 'file') return { ok: false, reason: 'artifact_store_unsupported' };

    const bytes = Buffer.from(JSON.stringify(input.context), 'utf8');
    const sha256 = createHash('sha256').update(bytes).digest('hex');
    const runKey = createHash('sha256').update(input.runId, 'utf8').digest('hex');
    const artifactPath = path.resolve(
      this.store.rootPath,
      'run-contexts',
      input.context.tenantId,
      `${runKey}.json`
    );
    await writeOnceOrVerify(artifactPath, bytes);

    return {
      ok: true,
      ref: parseRunExecutionContextRef({
        uri: pathToFileURL(artifactPath).href,
        sha256,
        schemaVersion: input.context.schemaVersion,
        planId: input.context.planId,
        planVersion: input.context.planVersion,
        ...(input.context.pluginCompatibilityFingerprint === undefined
          ? {}
          : { pluginCompatibilityFingerprint: input.context.pluginCompatibilityFingerprint }),
      }),
    };
  }
}

async function writeOnceOrVerify(artifactPath: string, bytes: Buffer): Promise<void> {
  await mkdir(path.dirname(artifactPath), { recursive: true });
  let handle: FileHandle | null = null;
  try {
    handle = await open(artifactPath, 'wx');
    await writeAll(handle, bytes);
  } catch (error) {
    if (!isAlreadyExistsError(error)) throw error;
    const existing = await readFile(artifactPath);
    if (!existing.equals(bytes)) {
      throw new Error('The DBT run context already exists with different content.', {
        cause: error,
      });
    }
  } finally {
    await handle?.close();
  }
}

async function writeAll(handle: FileHandle, bytes: Buffer): Promise<void> {
  let offset = 0;
  while (offset < bytes.byteLength) {
    const result = await handle.write(bytes, offset, bytes.byteLength - offset, null);
    if (result.bytesWritten === 0) throw new Error('DBT run-context write made no progress.');
    offset += result.bytesWritten;
  }
}

function isAlreadyExistsError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && 'code' in error && error.code === 'EEXIST';
}
