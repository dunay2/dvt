import type { IRunStateStoreRead, IWorkflowEngine } from '@dvt/engine';
import { RunMetadataNotFoundError } from '@dvt/engine';

import { RunControlUnavailableError } from '../errors/runControlErrors.js';
import type { AuthorizedCommandExecutionContext } from '../ports/auth.js';
import type { CancelRunCommand, CancelRunResult, ICancelRunUseCase } from '../ports/runtime.js';

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
    const decision = decideCancelRun(status);

    if (decision.kind === 'settled') {
      return {
        runId: command.runId,
        signalType: 'CANCEL',
        accepted: true,
        disposition: decision.disposition,
      };
    }
    if (decision.kind === 'reject') {
      throw new RunControlUnavailableError('cancel', status.status, decision.reason);
    }

    await this.engine.cancelRun(runRef);

    return {
      runId: command.runId,
      signalType: 'CANCEL',
      accepted: true,
      disposition: decision.disposition,
    };
  }
}
