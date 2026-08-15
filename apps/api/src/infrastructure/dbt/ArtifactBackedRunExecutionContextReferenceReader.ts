/** Owned concern: verify run-scoped execution-context references across configured artifact stores. */
import {
  ArtifactBackedRunExecutionContextReader,
  ArtifactReadError,
  type DbtProjectBundleArtifactStore,
  type IRunExecutionContextReader,
  type IRunExecutionContextReferenceStore,
} from '@dvt/artifacts';

import type {
  IRunExecutionContextReferenceReader,
  RunExecutionContextReferenceQuery,
  RunExecutionContextReferenceReadResult,
} from '../../application/ports/runExecutionContextReferenceReader.js';

import { FileRunExecutionContextReferenceReader } from './FileRunExecutionContextReferenceReader.js';
import {
  runExecutionContextMatchesBinding,
  runExecutionContextRefMatchesS3Store,
} from './runExecutionContextTrust.js';

export class ArtifactBackedRunExecutionContextReferenceReader implements IRunExecutionContextReferenceReader {
  private readonly fileReader: FileRunExecutionContextReferenceReader;
  private readonly contextReader: IRunExecutionContextReader;

  public constructor(
    private readonly store: DbtProjectBundleArtifactStore | undefined,
    private readonly referenceStore?: IRunExecutionContextReferenceStore,
    contextReader?: IRunExecutionContextReader
  ) {
    this.fileReader = new FileRunExecutionContextReferenceReader(store);
    this.contextReader = contextReader ?? new ArtifactBackedRunExecutionContextReader();
  }

  public async read(
    query: RunExecutionContextReferenceQuery
  ): Promise<RunExecutionContextReferenceReadResult> {
    if (this.store === undefined) return { kind: 'absent' };
    if (this.store.kind === 'file') return this.fileReader.read(query);
    if (this.referenceStore === undefined) {
      throw new Error('The S3 run-context reference store is not configured.');
    }

    let ref;
    try {
      ref = await this.referenceStore.get({ tenantId: query.tenantId, runId: query.runId });
    } catch (error) {
      if (error instanceof ArtifactReadError) {
        return { kind: 'untrusted', reason: 'reference_invalid' };
      }
      throw error;
    }
    if (ref === undefined) return { kind: 'absent' };
    if (
      !runExecutionContextRefMatchesS3Store({
        bucket: this.store.bucket,
        tenantId: query.tenantId,
        ref,
      })
    ) {
      return { kind: 'untrusted', reason: 'reference_mismatch' };
    }

    try {
      const context = await this.contextReader.resolve(ref);
      if (!runExecutionContextMatchesBinding(context, query.expectedBinding)) {
        return { kind: 'untrusted', reason: 'binding_mismatch' };
      }
    } catch (error) {
      if (!(error instanceof ArtifactReadError)) throw error;
      return { kind: 'untrusted', reason: mapContextReadFailure(error) };
    }
    return { kind: 'trusted', ref };
  }
}

function mapContextReadFailure(
  error: ArtifactReadError
): Extract<RunExecutionContextReferenceReadResult, { kind: 'untrusted' }>['reason'] {
  if (error.code === 'ARTIFACT_NOT_FOUND') return 'context_missing';
  if (error.code === 'ARTIFACT_INTEGRITY_MISMATCH') return 'digest_mismatch';
  return 'reference_mismatch';
}
