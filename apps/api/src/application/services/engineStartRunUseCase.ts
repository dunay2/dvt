/**
 * Owned concern: bridge the canonical start-run command boundary into the
 * engine-facing `IWorkflowEngine.startRun()` call.
 */
import type { StartRunAcceptedResult, StartRunCommand } from '@dvt/contracts';
import type { IWorkflowEngine } from '@dvt/engine';

import type { AuthorizedCommandExecutionContext } from '../ports/authContract.js';
import type { IStartRunUseCase, StartRunUseCaseResult } from '../ports/startRunUseCasePort.js';

import {
  mapEngineStartRunError,
  toAcceptedStartRunResult,
  toEnginePlanRef,
  toEngineRunContext,
  validateStartRunPlanRef,
} from './startRunEngineBridge.js';

export class EngineStartRunUseCase implements IStartRunUseCase {
  public constructor(private readonly engine: IWorkflowEngine) {}

  public async execute(
    command: StartRunCommand,
    context: AuthorizedCommandExecutionContext
  ): Promise<StartRunUseCaseResult> {
    const planRef = validateStartRunPlanRef(command);
    if (!planRef.ok) {
      return { ok: false, error: planRef.error };
    }

    try {
      return await this.startRunInEngine(planRef.value, command, context);
    } catch (error) {
      const mapped = mapEngineStartRunError(error, command);
      if (mapped !== null) {
        return mapped;
      }

      throw error;
    }
  }

  private async startRunInEngine(
    planRef: NonNullable<StartRunCommand['planRef']>,
    command: StartRunCommand,
    context: AuthorizedCommandExecutionContext
  ): Promise<StartRunUseCaseResult> {
    const ref = await this.engine.startRun(
      toEnginePlanRef(planRef),
      toEngineRunContext(command, context)
    );
    return ok(toAcceptedStartRunResult(ref.runId));
  }
}

function ok(value: StartRunAcceptedResult): StartRunUseCaseResult {
  return { ok: true, value };
}
