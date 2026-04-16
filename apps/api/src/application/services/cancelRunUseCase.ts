import type { IRunStateStoreRead, IWorkflowEngine } from '@dvt/engine';
import { RunMetadataNotFoundError } from '@dvt/engine';

import type { AuthorizedCommandExecutionContext } from '../ports/auth.js';
import type { CancelRunCommand, ICancelRunUseCase, SignalRunResult } from '../ports/runtime.js';

import { runMetadataToEngineRunRef } from './runMetadataToEngineRunRef.js';

export class CancelRunUseCase implements ICancelRunUseCase {
  public constructor(
    private readonly engine: IWorkflowEngine,
    private readonly stateStore: IRunStateStoreRead
  ) {}

  public async execute(
    command: CancelRunCommand,
    context: AuthorizedCommandExecutionContext
  ): Promise<SignalRunResult> {
    const metadata = await this.stateStore.getRunMetadataByRunId(
      context.scope.tenantId.value,
      command.runId
    );
    if (!metadata) {
      throw new RunMetadataNotFoundError(command.runId);
    }

    await this.engine.cancelRun(runMetadataToEngineRunRef(metadata));

    return {
      runId: command.runId,
      signalType: 'CANCEL',
      accepted: true,
    };
  }
}
