import type { IRunStateStoreRead, IWorkflowEngine } from '@dvt/engine';
import { RunMetadataNotFoundError } from '@dvt/engine';

import { RunControlUnavailableError } from '../errors/runControlErrors.js';
import type { AuthorizedCommandExecutionContext } from '../ports/auth.js';
import {
  toRunCancellationReceiptKey,
  type IRunCancellationReceiptStore,
} from '../ports/runCancellationReceiptStore.js';
import type { IRunControlCommandCoordinator } from '../ports/runControlCommandCoordinator.js';
import {
  RUN_CONTROL_RESULT_CONTRACT_VERSION,
  type CancelRunCommand,
  type CancelRunResult,
  type ICancelRunUseCase,
} from '../ports/runtime.js';

import { decideCancelRun } from './runControlPolicy.js';
import { runMetadataToEngineRunRef } from './runMetadataToEngineRunRef.js';
import type { IRunStartDispatchResolver } from './runStartDispatchResolver.js';

export class CancelRunUseCase implements ICancelRunUseCase {
  public constructor(
    private readonly engine: IWorkflowEngine,
    private readonly stateStore: IRunStateStoreRead,
    private readonly commandCoordinator: IRunControlCommandCoordinator,
    private readonly cancellationReceipts: IRunCancellationReceiptStore,
    private readonly startDispatchResolver?: IRunStartDispatchResolver
  ) {}

  public async execute(
    command: CancelRunCommand,
    context: AuthorizedCommandExecutionContext
  ): Promise<CancelRunResult> {
    const tenantId = context.scope.tenantId.value;
    return this.commandCoordinator.executeExclusive(
      { action: 'cancel', tenantId, runId: command.runId },
      () => this.executeExclusive(command, tenantId)
    );
  }

  private async executeExclusive(
    command: CancelRunCommand,
    tenantId: string
  ): Promise<CancelRunResult> {
    const metadata = await this.stateStore.getRunMetadataByRunId(tenantId, command.runId);
    if (!metadata) {
      throw new RunMetadataNotFoundError(command.runId);
    }

    const persistedRunRef = runMetadataToEngineRunRef(metadata);
    const status = await this.engine.getRunStatus(persistedRunRef);
    const startDispatch = await this.resolveStartDispatch(metadata, status);
    const settledResult = resolveCancelDecision(
      command,
      status,
      startDispatch.kind === 'confirmed'
    );
    if (settledResult !== undefined) {
      return settledResult;
    }

    if (await this.cancellationReceipts.hasAccepted(toRunCancellationReceiptKey(metadata))) {
      return acceptedCancellation(command, 'already_requested');
    }

    const runRef = startDispatch.kind === 'confirmed' ? startDispatch.runRef : persistedRunRef;
    try {
      await this.engine.cancelRun(runRef);
    } catch (providerFailure) {
      let reconciledStatus: Awaited<ReturnType<IWorkflowEngine['getRunStatus']>>;
      try {
        reconciledStatus = await this.engine.getRunStatus(runRef);
      } catch {
        throw providerFailure;
      }

      const reconciledResult = resolveReconciledCancelDecision(command, reconciledStatus);
      if (reconciledResult !== undefined) {
        return reconciledResult;
      }
      throw providerFailure;
    }

    await this.cancellationReceipts.recordAccepted(metadata);

    return acceptedCancellation(command, 'requested');
  }

  private async resolveStartDispatch(
    metadata: Parameters<IRunStartDispatchResolver['resolve']>[0],
    status: Parameters<IRunStartDispatchResolver['resolve']>[1]
  ) {
    if (this.startDispatchResolver) {
      return this.startDispatchResolver.resolve(metadata, status);
    }
    return status.status === 'PENDING'
      ? ({ kind: 'unconfirmed' } as const)
      : ({ kind: 'confirmed', runRef: metadata.providerRef } as const);
  }
}

function resolveReconciledCancelDecision(
  command: CancelRunCommand,
  status: Awaited<ReturnType<IWorkflowEngine['getRunStatus']>>
): CancelRunResult | undefined {
  const decision = decideCancelRun(status);
  if (decision.kind === 'settled') {
    return acceptedCancellation(command, decision.disposition);
  }
  if (decision.kind === 'reject' && decision.reason === 'run_terminal') {
    throw new RunControlUnavailableError('cancel', status.status, decision.reason);
  }
  return undefined;
}

function resolveCancelDecision(
  command: CancelRunCommand,
  status: Awaited<ReturnType<IWorkflowEngine['getRunStatus']>>,
  startDispatchConfirmed: boolean
): CancelRunResult | undefined {
  const decision = decideCancelRun(status, startDispatchConfirmed);
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
