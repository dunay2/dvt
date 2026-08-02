/** Owned concern: reconstruct immutable references for server-persisted run contexts. */
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

import type { DbtProjectBundleArtifactStore } from '@dvt/artifacts';
import {
  parseRunExecutionContext,
  parseRunExecutionContextRef,
  type RunExecutionContextRef,
} from '@dvt/contracts';

import type {
  IRunExecutionContextReferenceReader,
  RunExecutionContextReferenceQuery,
} from '../../application/ports/runExecutionContextReferenceReader.js';

import { resolveRunExecutionContextArtifactPath } from './runExecutionContextArtifactPath.js';

export class FileRunExecutionContextReferenceReader implements IRunExecutionContextReferenceReader {
  public constructor(private readonly store: DbtProjectBundleArtifactStore | undefined) {}

  public async read(
    query: RunExecutionContextReferenceQuery
  ): Promise<RunExecutionContextRef | undefined> {
    if (this.store?.kind !== 'file') return undefined;

    const artifactPath = resolveRunExecutionContextArtifactPath({
      rootPath: this.store.rootPath,
      tenantId: query.tenantId,
      runId: query.runId,
    });
    const bytes = await readOptionalFile(artifactPath);
    if (bytes === undefined) return undefined;

    const context = parseRunExecutionContext(JSON.parse(bytes.toString('utf8')));
    return parseRunExecutionContextRef({
      uri: pathToFileURL(artifactPath).href,
      sha256: createHash('sha256').update(bytes).digest('hex'),
      schemaVersion: context.schemaVersion,
      planId: context.planId,
      planVersion: context.planVersion,
      ...(context.pluginCompatibilityFingerprint === undefined
        ? {}
        : { pluginCompatibilityFingerprint: context.pluginCompatibilityFingerprint }),
    });
  }
}

async function readOptionalFile(artifactPath: string): Promise<Buffer | undefined> {
  try {
    return await readFile(artifactPath);
  } catch (error) {
    if (isNotFoundError(error)) return undefined;
    throw error;
  }
}

function isNotFoundError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && 'code' in error && error.code === 'ENOENT';
}
