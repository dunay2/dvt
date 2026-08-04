import { createPermanentStepFailure } from '@dvt/adapter-temporal';
import type {
  StepActivity,
  StepDefinition,
  StepExecutionContext,
  StepResult,
  TemporalStepPluginProfile,
} from '@dvt/adapter-temporal';
import {
  LOAD_OBJECT_FILE_TO_POSTGRES_STEP_KIND,
  LoadObjectFileToPostgresStepTypeConfigSchema,
} from '@dvt/contracts';

import { ObjectFileIngestionRejectedError } from './objectFilePostgresPluginErrors.js';
import type { ObjectFilePostgresPluginRunner } from './objectFilePostgresPluginTypes.js';

export const OBJECT_FILE_POSTGRES_PLUGIN_ID = 'object-file-postgres' as const;

export class ObjectFilePostgresStepActivity implements StepActivity {
  public constructor(private readonly runner: ObjectFilePostgresPluginRunner) {}

  public async execute(step: StepDefinition, context: StepExecutionContext): Promise<StepResult> {
    const parsed = LoadObjectFileToPostgresStepTypeConfigSchema.safeParse(step.stepTypeConfig);
    if (!parsed.success) {
      throw createPermanentStepFailure(
        `INVALID_STEP_SCHEMA:${LOAD_OBJECT_FILE_TO_POSTGRES_STEP_KIND}:${step.stepId}`
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
      if (error instanceof ObjectFileIngestionRejectedError) {
        throw createPermanentStepFailure(`${error.code}:${step.stepId}`);
      }
      throw error;
    }
  }
}

export function createObjectFilePostgresPluginProfile(
  runner: ObjectFilePostgresPluginRunner
): TemporalStepPluginProfile {
  const activity = new ObjectFilePostgresStepActivity(runner);
  return {
    pluginId: OBJECT_FILE_POSTGRES_PLUGIN_ID,
    stepActivitiesByKind: new Map([[LOAD_OBJECT_FILE_TO_POSTGRES_STEP_KIND, activity]]),
  };
}
