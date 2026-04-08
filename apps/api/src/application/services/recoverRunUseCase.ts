import {
  RunMetadataNotFoundError,
  type IRunStateStoreRead,
  type IWorkflowEngine,
  type PlanRef,
  type RunContext,
} from '@dvt/engine';

import type { AuthorizedCommandExecutionContext } from '../ports/auth.js';
import type { IRecoverRunUseCase, RecoverRunCommand, RecoverRunResult } from '../ports/runtime.js';

export class RecoverRunUseCase implements IRecoverRunUseCase {
  public constructor(
    private readonly engine: IWorkflowEngine,
    private readonly stateStore: IRunStateStoreRead
  ) {}

  public async execute(
    command: RecoverRunCommand,
    context: AuthorizedCommandExecutionContext
  ): Promise<RecoverRunResult> {
    const source = await this.stateStore.getRunMetadataByRunId(
      context.scope.tenantId.value,
      command.sourceRunId
    );
    if (!source) {
      throw new RunMetadataNotFoundError(command.sourceRunId);
    }

    await this.engine.recoverRun(
      command.sourceRunId,
      toEnginePlanRef(command.planRef),
      toEngineRunContext(
        command,
        source.projectId,
        source.environmentId,
        context.scope.tenantId.value,
        source.provider
      )
    );

    return {
      sourceRunId: command.sourceRunId,
      recoveryRunId: command.recoveryRunId,
      accepted: true,
    };
  }
}

function toEnginePlanRef(input: RecoverRunCommand['planRef']): PlanRef {
  return {
    uri: input.uri,
    sha256: input.sha256,
    schemaVersion: input.schemaVersion,
    planId: input.planId,
    planVersion: input.planVersion,
  };
}

function toEngineRunContext(
  command: RecoverRunCommand,
  projectId: string,
  environmentId: string,
  tenantId: string,
  sourceProvider: 'temporal' | 'conductor' | 'mock'
): RunContext {
  const targetAdapter = command.targetAdapter ?? sourceProvider;
  return {
    tenantId,
    projectId,
    environmentId,
    runId: command.recoveryRunId,
    targetAdapter,
    ...(command.runExecutionContextRef !== undefined
      ? { runExecutionContextRef: command.runExecutionContextRef }
      : {}),
  };
}
