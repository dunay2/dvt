/** Owned concern: copy a verified execution context into a recovery descendant artifact. */
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

import type { DbtProjectBundleArtifactStore } from '@dvt/artifacts';
import { parseRunExecutionContextRef, type RunExecutionContextRef } from '@dvt/contracts';
import { sha256Hex } from '@dvt/crypto';

import type {
  IRunExecutionContextInheritanceWriter,
  RunExecutionContextInheritanceCommand,
} from '../../application/ports/runExecutionContextInheritanceWriter.js';

import { writeImmutableFileArtifact } from './immutableFileArtifactWriter.js';
import {
  resolveRunExecutionContextArtifactPath,
  resolveRunExecutionContextReferenceArtifactPath,
} from './runExecutionContextArtifactPath.js';

export class FileRunExecutionContextInheritanceWriter implements IRunExecutionContextInheritanceWriter {
  public constructor(private readonly store: DbtProjectBundleArtifactStore | undefined) {}

  public async inherit(
    command: RunExecutionContextInheritanceCommand
  ): Promise<RunExecutionContextRef> {
    if (this.store?.kind !== 'file') {
      throw new Error('The run-context artifact store cannot persist recovery descendants.');
    }

    const sourcePath = resolveRunExecutionContextArtifactPath({
      rootPath: this.store.rootPath,
      tenantId: command.tenantId,
      runId: command.sourceRunId,
    });
    if (command.sourceRef.uri !== pathToFileURL(sourcePath).href) {
      throw new Error('The recovery source context reference does not match its run identity.');
    }

    const contextBytes = await readFile(sourcePath);
    const digest = sha256Hex(contextBytes);
    if (digest !== command.sourceRef.sha256) {
      throw new Error('The recovery source context failed immutable digest verification.');
    }

    const targetPath = resolveRunExecutionContextArtifactPath({
      rootPath: this.store.rootPath,
      tenantId: command.tenantId,
      runId: command.recoveryRunId,
    });
    const targetReferencePath = resolveRunExecutionContextReferenceArtifactPath({
      rootPath: this.store.rootPath,
      tenantId: command.tenantId,
      runId: command.recoveryRunId,
    });
    const targetRef = parseRunExecutionContextRef({
      ...command.sourceRef,
      uri: pathToFileURL(targetPath).href,
    });

    await writeImmutableFileArtifact(targetPath, contextBytes);
    await writeImmutableFileArtifact(
      targetReferencePath,
      Buffer.from(JSON.stringify(targetRef), 'utf8')
    );
    return targetRef;
  }
}
