import { asNonBlankString } from '@dvt/contracts';
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
        source.providerRef.provider
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
    uri: asNonBlankString(input.uri),
    sha256: asNonBlankString(input.sha256),
    schemaVersion: asNonBlankString(input.schemaVersion),
    planId: asNonBlankString(input.planId),
    planVersion: asNonBlankString(input.planVersion),
  };
}

function toEngineRunContext(
  command: RecoverRunCommand,
  projectId: string,
  environmentId: string,
  tenantId: string,
  sourceProvider: 'temporal' | 'conductor'
): RunContext {
  const targetAdapter = command.targetAdapter ?? sourceProvider;
  const runContext: RunContext = {
    tenantId: asNonBlankString(tenantId),
    projectId: asNonBlankString(projectId),
    environmentId: asNonBlankString(environmentId),
    runId: asNonBlankString(command.recoveryRunId),
    targetAdapter,
  };

  if (command.runExecutionContextRef === undefined) {
    return runContext;
  }

  return {
    ...runContext,
    runExecutionContextRef: command.runExecutionContextRef,
  };
}
