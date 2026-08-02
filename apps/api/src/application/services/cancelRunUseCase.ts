import type { IRunStateStoreRead, IWorkflowEngine } from '@dvt/engine';
import { RunMetadataNotFoundError } from '@dvt/engine';

import { RunControlUnavailableError } from '../errors/runControlErrors.js';
import type { AuthorizedCommandExecutionContext } from '../ports/auth.js';
import {
  RUN_CONTROL_RESULT_CONTRACT_VERSION,
  type CancelRunCommand,
  type CancelRunResult,
  type ICancelRunUseCase,
} from '../ports/runtime.js';

import { decideCancelRun } from './runControlPolicy.js';
import { runMetadataToEngineRunRef } from './runMetadataToEngineRunRef.js';

export class CancelRunUseCase implements ICancelRunUseCase {
  public constructor(
    private readonly engine: IWorkflowEngine,
    private readonly stateStore: IRunStateStoreRead
  ) {}

  public async execute(
    command: CancelRunCommand,
    context: AuthorizedCommandExecutionContext
  ): Promise<CancelRunResult> {
    const metadata = await this.stateStore.getRunMetadataByRunId(
      context.scope.tenantId.value,
      command.runId
    );
    if (!metadata) {
      throw new RunMetadataNotFoundError(command.runId);
    }

    const runRef = runMetadataToEngineRunRef(metadata);
    const status = await this.engine.getRunStatus(runRef);
    const settledResult = resolveCancelDecision(command, status);
    if (settledResult !== undefined) {
      return settledResult;
    }

    try {
      await this.engine.cancelRun(runRef);
    } catch (providerFailure) {
      let reconciledStatus: Awaited<ReturnType<IWorkflowEngine['getRunStatus']>>;
      try {
        reconciledStatus = await this.engine.getRunStatus(runRef);
      } catch {
        throw providerFailure;
      }

      const reconciledResult = resolveCancelDecision(command, reconciledStatus);
      if (reconciledResult !== undefined) {
        return reconciledResult;
      }
      throw providerFailure;
    }

    return acceptedCancellation(command, 'requested');
  }
}

function resolveCancelDecision(
  command: CancelRunCommand,
  status: Awaited<ReturnType<IWorkflowEngine['getRunStatus']>>
): CancelRunResult | undefined {
  const decision = decideCancelRun(status);
  if (decision.kind === 'dispatch') {
    return undefined;
  }
  if (decision.kind === 'reject') {
    throw new RunControlUnavailableError('cancel', status.status, decision.reason);
  }
  return acceptedCancellation(command, decision.disposition);
}

function acceptedCancellation(
  command: CancelRunCommand,
  disposition: CancelRunResult['disposition']
): CancelRunResult {
  return {
    contractVersion: RUN_CONTROL_RESULT_CONTRACT_VERSION,
    runId: command.runId,
    signalType: 'CANCEL',
    accepted: true,
    disposition,
  };
}
