/** Owned concern: reload immutable references for server-persisted run contexts. */
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

import type { DbtProjectBundleArtifactStore } from '@dvt/artifacts';
import { parseRunExecutionContextRef, type RunExecutionContextRef } from '@dvt/contracts';

import type {
  IRunExecutionContextReferenceReader,
  RunExecutionContextReferenceQuery,
  RunExecutionContextReferenceReadResult,
} from '../../application/ports/runExecutionContextReferenceReader.js';

import {
  resolveRunExecutionContextArtifactPath,
  resolveRunExecutionContextReferenceArtifactPath,
} from './runExecutionContextArtifactPath.js';

export class FileRunExecutionContextReferenceReader implements IRunExecutionContextReferenceReader {
  public constructor(private readonly store: DbtProjectBundleArtifactStore | undefined) {}

  public async read(
    query: RunExecutionContextReferenceQuery
  ): Promise<RunExecutionContextReferenceReadResult> {
    if (this.store?.kind !== 'file') return { kind: 'absent' };

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
    if (bytes === undefined) {
      const contextBytes = await readOptionalFile(artifactPath);
      return contextBytes === undefined
        ? { kind: 'absent' }
        : { kind: 'untrusted', reason: 'reference_missing' };
    }

    const ref = parseStoredReference(bytes);
    if (ref === undefined) {
      return { kind: 'untrusted', reason: 'reference_invalid' };
    }
    if (ref.uri !== pathToFileURL(artifactPath).href) {
      return { kind: 'untrusted', reason: 'reference_mismatch' };
    }
    return { kind: 'trusted', ref };
  }
}

function parseStoredReference(bytes: Buffer): RunExecutionContextRef | undefined {
  try {
    return parseRunExecutionContextRef(JSON.parse(bytes.toString('utf8')));
  } catch {
    return undefined;
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
