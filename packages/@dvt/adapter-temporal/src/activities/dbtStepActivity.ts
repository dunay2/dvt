import { parseDbtPluginContext, type RunExecutionContext } from '@dvt/contracts';
import { RunExecutionContextRejectedError } from '@dvt/engine';

import { ActivityErrorCode, createPermanentStepFailure } from './activityFailures.js';
import type {
  ActivityDeps,
  StepActivity,
  StepDefinition,
  StepExecutionContext,
  StepResult,
} from './activityTypes.js';

export class DbtStepActivity implements StepActivity {
  static readonly SUPPORTED_STEP_KINDS = new Set(['DBT_MODEL', 'DBT_TEST', 'DBT_SNAPSHOT']);

  constructor(
    private readonly deps?: Pick<ActivityDeps, 'runExecutionContextReader' | 'dbtPluginRunner'>
  ) {}

  async execute(step: StepDefinition, context: StepExecutionContext): Promise<StepResult> {
    const ref = context.runContext.runExecutionContextRef;
    if (ref === undefined) {
      throw this.reject(`${ActivityErrorCode.RUN_EXECUTION_CONTEXT_REQUIRED}:${step.stepId}`);
    }

    const reader = this.deps?.runExecutionContextReader;
    if (reader === undefined) {
      throw this.reject(`${ActivityErrorCode.DBT_PLUGIN_RUNTIME_NOT_CONFIGURED}:${step.stepId}`);
    }

    const runner = this.deps?.dbtPluginRunner;
    if (runner === undefined) {
      throw this.reject(`${ActivityErrorCode.DBT_PLUGIN_RUNTIME_NOT_CONFIGURED}:${step.stepId}`);
    }

    let runExecutionContext: RunExecutionContext;
    try {
      runExecutionContext = await reader.resolve(ref);
    } catch (error) {
      if (error instanceof RunExecutionContextRejectedError) {
        const reason = error.details?.['reason'];
        throw this.reject(typeof reason === 'string' ? reason : error.message);
      }
      throw error;
    }

    const pluginContextInput = runExecutionContext.pluginContexts['dbt'];
    if (pluginContextInput === undefined) {
      throw this.reject(`${ActivityErrorCode.DBT_PLUGIN_CONTEXT_REQUIRED}:${step.stepId}`);
    }

    const pluginContext = parseDbtPluginContext(pluginContextInput);
    if (pluginContext === undefined || Object.keys(pluginContext).length === 0) {
      throw this.reject(`${ActivityErrorCode.DBT_PLUGIN_CONTEXT_REQUIRED}:${step.stepId}`);
    }

    const result = await runner.execute({
      step,
      executionIdentity: context.executionIdentity,
      runContext: context.runContext,
      runExecutionContext,
      pluginContext,
    });

    if (result.stepId !== step.stepId) {
      throw this.reject(
        `${ActivityErrorCode.DBT_PLUGIN_RESULT_INVALID}: stepId_mismatch:${step.stepId}:${result.stepId}`
      );
    }
    return result;
  }

  private reject(message: string): ReturnType<typeof createPermanentStepFailure> {
    return createPermanentStepFailure(message);
  }
}
