import type { IRunStateStoreRead, IWorkflowEngine } from '@dvt/engine';
import { RunMetadataNotFoundError } from '@dvt/engine';

import type { AuthorizedCommandExecutionContext } from '../ports/auth.js';
import type { ISignalRunUseCase, SignalRunCommand, SignalRunResult } from '../ports/runtime.js';

import { runMetadataToEngineRunRef } from './runMetadataToEngineRunRef.js';

export class SignalRunUseCase implements ISignalRunUseCase {
  public constructor(
    private readonly engine: IWorkflowEngine,
    private readonly stateStore: IRunStateStoreRead,
    private readonly nowIsoUtc: () => string = () => new Date().toISOString()
  ) {}

  public async execute(
    command: SignalRunCommand,
    context: AuthorizedCommandExecutionContext
  ): Promise<SignalRunResult> {
    const metadata = await this.stateStore.getRunMetadataByRunId(
      context.scope.tenantId.value,
      command.runId
    );
    if (!metadata) {
      throw new RunMetadataNotFoundError(command.runId);
    }

    await this.engine.signal(runMetadataToEngineRunRef(metadata), {
      signalId: `${context.requestId}:${command.runId}:${command.signalType}`,
      type: command.signalType,
      ...(command.reason !== undefined ? { reason: command.reason } : {}),
      requestedAt: this.nowIsoUtc(),
    });

    return {
      runId: command.runId,
      signalType: command.signalType,
      accepted: true,
    };
  }
}
