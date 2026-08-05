import { createPermanentStepFailure } from '@dvt/adapter-temporal';
import type {
  StepActivity,
  StepDefinition,
  StepExecutionContext,
  StepResult,
  TemporalStepPluginProfile,
} from '@dvt/adapter-temporal';
import {
  ACQUIRE_HTTP_JSON_ARTIFACT_STEP_KIND,
  HttpJsonArtifactStepTypeConfigSchema,
} from '@dvt/contracts';

import { HttpJsonArtifactAcquisitionRejectedError } from './httpJsonArtifactPluginErrors.js';
import type { HttpJsonArtifactPluginRunnerPort } from './httpJsonArtifactPluginTypes.js';

export const HTTP_JSON_ARTIFACT_PLUGIN_ID = 'http-json-artifact' as const;

export class HttpJsonArtifactStepActivity implements StepActivity {
  public constructor(private readonly runner: HttpJsonArtifactPluginRunnerPort) {}

  public async execute(step: StepDefinition, context: StepExecutionContext): Promise<StepResult> {
    const parsed = HttpJsonArtifactStepTypeConfigSchema.safeParse(step.stepTypeConfig);
    if (!parsed.success) {
      throw createPermanentStepFailure(
        `INVALID_STEP_SCHEMA:${ACQUIRE_HTTP_JSON_ARTIFACT_STEP_KIND}:${step.stepId}`
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
      if (error instanceof HttpJsonArtifactAcquisitionRejectedError) {
        throw createPermanentStepFailure(`${error.code}:${step.stepId}`);
      }
      throw error;
    }
  }
}

export function createHttpJsonArtifactPluginProfile(
  runner: HttpJsonArtifactPluginRunnerPort
): TemporalStepPluginProfile {
  return {
    pluginId: HTTP_JSON_ARTIFACT_PLUGIN_ID,
    stepActivitiesByKind: new Map([
      [ACQUIRE_HTTP_JSON_ARTIFACT_STEP_KIND, new HttpJsonArtifactStepActivity(runner)],
    ]),
  };
}
