import { createPermanentStepFailure } from '@dvt/adapter-temporal';
import type {
  StepActivity,
  StepDefinition,
  StepExecutionContext,
  StepResult,
  TemporalStepPluginProfile,
} from '@dvt/adapter-temporal';
import {
  EXECUTE_PYTHON_CODE_STEP_KIND,
  PythonCodeStepTypeConfigSchema,
} from '@dvt/contracts/python-code';

import { PythonCodeExecutionRejectedError } from './pythonCodePluginErrors.js';
import type { PythonCodePluginRunnerPort } from './pythonCodePluginTypes.js';

export const PYTHON_CODE_PLUGIN_ID = 'python-code' as const;

export class PythonCodeStepActivity implements StepActivity {
  public constructor(private readonly runner: PythonCodePluginRunnerPort) {}

  public async execute(step: StepDefinition, context: StepExecutionContext): Promise<StepResult> {
    const parsed = PythonCodeStepTypeConfigSchema.safeParse(step.stepTypeConfig);
    if (!parsed.success) {
      throw createPermanentStepFailure(
        `INVALID_STEP_SCHEMA:${EXECUTE_PYTHON_CODE_STEP_KIND}:${step.stepId}`
      );
    }

    try {
      return await this.runner.execute({
        step,
        config: parsed.data,
        executionIdentity: context.executionIdentity,
        runContext: context.runContext,
      });
    } catch (error) {
      if (error instanceof PythonCodeExecutionRejectedError) {
        throw createPermanentStepFailure(formatPermanentFailure(error, step.stepId));
      }
      throw error;
    }
  }
}

export function createPythonCodePluginProfile(
  runner: PythonCodePluginRunnerPort
): TemporalStepPluginProfile {
  return {
    pluginId: PYTHON_CODE_PLUGIN_ID,
    stepActivitiesByKind: new Map([
      [EXECUTE_PYTHON_CODE_STEP_KIND, new PythonCodeStepActivity(runner)],
    ]),
  };
}

function formatPermanentFailure(error: PythonCodeExecutionRejectedError, stepId: string): string {
  const location = error.diagnostic;
  const line = location?.line === undefined ? '' : `:line=${location.line}`;
  const column = location?.column === undefined ? '' : `:column=${location.column}`;
  return `${error.code}${line}${column}:${stepId}`;
}
