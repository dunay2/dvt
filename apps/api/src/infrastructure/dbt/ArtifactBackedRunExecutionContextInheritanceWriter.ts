/** Owned concern: persist trusted recovery descendants across configured artifact stores. */
import {
  ArtifactBackedRunExecutionContextReader,
  type DbtProjectBundleArtifactStore,
  type IRunExecutionContextReader,
  type IRunExecutionContextReferenceStore,
} from '@dvt/artifacts';
import type { RunExecutionContextRef } from '@dvt/contracts';

import type {
  IRunExecutionContextInheritanceWriter,
  RunExecutionContextInheritanceCommand,
} from '../../application/ports/runExecutionContextInheritanceWriter.js';

import { FileRunExecutionContextInheritanceWriter } from './FileRunExecutionContextInheritanceWriter.js';
import {
  runExecutionContextRefMatchesS3Store,
  sameRunExecutionContextRef,
} from './runExecutionContextTrust.js';

export class ArtifactBackedRunExecutionContextInheritanceWriter implements IRunExecutionContextInheritanceWriter {
  private readonly fileWriter: FileRunExecutionContextInheritanceWriter;
  private readonly contextReader: IRunExecutionContextReader;

  public constructor(
    private readonly store: DbtProjectBundleArtifactStore | undefined,
    private readonly referenceStore?: IRunExecutionContextReferenceStore,
    contextReader?: IRunExecutionContextReader
  ) {
    this.fileWriter = new FileRunExecutionContextInheritanceWriter(store);
    this.contextReader = contextReader ?? new ArtifactBackedRunExecutionContextReader();
  }

  public async inherit(
    command: RunExecutionContextInheritanceCommand
  ): Promise<RunExecutionContextRef> {
    if (this.store?.kind === 'file') return this.fileWriter.inherit(command);
    if (this.store?.kind !== 's3' || this.referenceStore === undefined) {
      throw new Error('The run-context artifact store cannot persist recovery descendants.');
    }
    if (
      !runExecutionContextRefMatchesS3Store({
        bucket: this.store.bucket,
        tenantId: command.tenantId,
        ref: command.sourceRef,
      })
    ) {
      throw new Error('The recovery source context reference is outside its artifact store.');
    }

    const storedSourceRef = await this.referenceStore.get({
      tenantId: command.tenantId,
      runId: command.sourceRunId,
    });
    if (
      storedSourceRef === undefined ||
      !sameRunExecutionContextRef(storedSourceRef, command.sourceRef)
    ) {
      throw new Error('The recovery source context reference does not match its run identity.');
    }
    const context = await this.contextReader.resolve(command.sourceRef);
    if (context.tenantId !== command.tenantId) {
      throw new Error('The recovery source context is outside its tenant boundary.');
    }

    await this.referenceStore.put({
      tenantId: command.tenantId,
      runId: command.recoveryRunId,
      ref: command.sourceRef,
    });
    return command.sourceRef;
  }
}
