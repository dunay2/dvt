/** Owned concern: recover a run from server-owned source lineage and immutable artifacts. */
import type { IStoredPlanRefReader } from '@dvt/artifacts';
import { asNonBlankString } from '@dvt/contracts';
import {
  RunMetadataNotFoundError,
  type IRunStateStoreRead,
  type IWorkflowEngine,
  type RunContext,
  type RunMetadata,
} from '@dvt/engine';

import {
  RunControlUnavailableError,
  RunRecoveryUnavailableError,
} from '../errors/runControlErrors.js';
import type { AuthorizedCommandExecutionContext } from '../ports/auth.js';
import type { IRunExecutionContextInheritanceWriter } from '../ports/runExecutionContextInheritanceWriter.js';
import type { IRunExecutionContextReferenceReader } from '../ports/runExecutionContextReferenceReader.js';
import {
  RUN_CONTROL_RESULT_CONTRACT_VERSION,
  type IRecoverRunUseCase,
  type RecoverRunCommand,
  type RecoverRunResult,
} from '../ports/runtime.js';

import { decideRecoverRun } from './runControlPolicy.js';
import { runMetadataToEngineRunRef } from './runMetadataToEngineRunRef.js';

export interface RecoverRunUseCaseDependencies {
  readonly engine: IWorkflowEngine;
  readonly stateStore: IRunStateStoreRead;
  readonly planStore: IStoredPlanRefReader;
  readonly executionContextReader: IRunExecutionContextReferenceReader;
  readonly executionContextInheritanceWriter: IRunExecutionContextInheritanceWriter;
}

export class RecoverRunUseCase implements IRecoverRunUseCase {
  public constructor(private readonly dependencies: RecoverRunUseCaseDependencies) {}

  public async execute(
    command: RecoverRunCommand,
    context: AuthorizedCommandExecutionContext
  ): Promise<RecoverRunResult> {
    const tenantId = context.scope.tenantId.value;
    const source = await this.dependencies.stateStore.getRunMetadataByRunId(
      tenantId,
      command.sourceRunId
    );
    if (!source) {
      throw new RunMetadataNotFoundError(command.sourceRunId);
    }
    const repeatedRecovery = await this.dependencies.stateStore.getRunMetadataByRunId(
      tenantId,
      command.recoveryRunId
    );
    if (repeatedRecovery !== null) {
      if (!isRecoveryChildOf(repeatedRecovery, source)) {
        throw new RunRecoveryUnavailableError(command.sourceRunId, 'recovery_identity_conflict');
      }
      return acceptedRecovery(command);
    }

    const status = await this.dependencies.engine.getRunStatus(runMetadataToEngineRunRef(source));
    const recoveryDecision = decideRecoverRun(status);
    if (recoveryDecision.kind === 'reject') {
      throw new RunControlUnavailableError('recover', status.status, recoveryDecision.reason);
    }

    const planRef = await this.dependencies.planStore.getStoredPlanRef({
      tenantId,
      projectId: source.projectId,
      environmentId: source.environmentId,
      planId: source.planId,
    });
    if (!planRef) {
      throw new RunRecoveryUnavailableError(command.sourceRunId, 'source_plan_unavailable');
    }

    const runExecutionContext = await this.dependencies.executionContextReader.read({
      tenantId,
      runId: command.sourceRunId,
    });
    if (runExecutionContext.kind === 'untrusted') {
      throw new RunRecoveryUnavailableError(command.sourceRunId, 'source_context_untrusted');
    }
    const recoveryExecutionContextRef =
      runExecutionContext.kind === 'trusted'
        ? await this.dependencies.executionContextInheritanceWriter.inherit({
            tenantId,
            sourceRunId: command.sourceRunId,
            recoveryRunId: command.recoveryRunId,
            sourceRef: runExecutionContext.ref,
          })
        : undefined;
    await this.dependencies.engine.recoverRun(
      command.sourceRunId,
      planRef,
      toEngineRunContext(command, source, tenantId, recoveryExecutionContextRef)
    );

    return acceptedRecovery(command);
  }
}

function isRecoveryChildOf(candidate: RunMetadata, source: RunMetadata): boolean {
  return (
    candidate.parentRunId === source.runId &&
    candidate.originRunId === (source.originRunId ?? source.runId) &&
    candidate.projectId === source.projectId &&
    candidate.environmentId === source.environmentId &&
    candidate.planId === source.planId &&
    candidate.planVersion === source.planVersion
  );
}

function acceptedRecovery(command: RecoverRunCommand): RecoverRunResult {
  return {
    contractVersion: RUN_CONTROL_RESULT_CONTRACT_VERSION,
    sourceRunId: command.sourceRunId,
    recoveryRunId: command.recoveryRunId,
    accepted: true,
  };
}

function toEngineRunContext(
  command: RecoverRunCommand,
  source: RunMetadata,
  tenantId: string,
  runExecutionContextRef: RunContext['runExecutionContextRef']
): RunContext {
  return {
    tenantId: asNonBlankString(tenantId),
    projectId: asNonBlankString(source.projectId),
    environmentId: asNonBlankString(source.environmentId),
    runId: asNonBlankString(command.recoveryRunId),
    targetAdapter: source.providerRef.provider,
    ...(runExecutionContextRef === undefined ? {} : { runExecutionContextRef }),
  };
}
