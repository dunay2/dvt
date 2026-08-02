/** Owned concern: reload immutable references for server-persisted run contexts. */
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

import type { DbtProjectBundleArtifactStore } from '@dvt/artifacts';
import { parseRunExecutionContextRef, type RunExecutionContextRef } from '@dvt/contracts';

import type {
  IRunExecutionContextReferenceReader,
  RunExecutionContextReferenceQuery,
} from '../../application/ports/runExecutionContextReferenceReader.js';

import {
  resolveRunExecutionContextArtifactPath,
  resolveRunExecutionContextReferenceArtifactPath,
} from './runExecutionContextArtifactPath.js';

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
    const referenceArtifactPath = resolveRunExecutionContextReferenceArtifactPath({
      rootPath: this.store.rootPath,
      tenantId: query.tenantId,
      runId: query.runId,
    });
    const bytes = await readOptionalFile(referenceArtifactPath);
    if (bytes === undefined) return undefined;

    const ref = parseRunExecutionContextRef(JSON.parse(bytes.toString('utf8')));
    if (ref.uri !== pathToFileURL(artifactPath).href) {
      throw new Error('Stored run-context reference does not match the authorized source run.');
    }
    return ref;
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
