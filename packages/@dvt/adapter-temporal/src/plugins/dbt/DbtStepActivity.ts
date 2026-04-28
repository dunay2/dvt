/**
 * @file packages/@dvt/adapter-temporal/src/plugins/dbt/DbtStepActivity.ts
 * @ownedConcern DBT step activity profile composed explicitly by Temporal worker runtime
 * @baseline ADR-0003: Execution Model
 * @baseline ADR-0046: Execution Plan Definition And Run Execution Policy Separation
 * @decision Keep DBT step-kind ownership in the worker plugin profile instead of core Temporal dispatch
 * @consequence DBT execution can be enabled, replaced, or omitted without changing workflow orchestration
 * @version 1.0.0
 */
import { parseDbtPluginContext, type RunExecutionContext } from '@dvt/contracts';
import { RunExecutionContextRejectedError } from '@dvt/engine';

import {
  ActivityErrorCode,
  createPermanentStepFailure,
} from '../../activities/activityFailures.js';
import type {
  StepActivity,
  StepActivityRegistry,
  StepDefinition,
  StepExecutionContext,
  StepResult,
} from '../../activities/activityTypes.js';

import type { DbtStepActivityDeps } from './dbtPluginTypes.js';

export const DBT_STEP_KINDS = ['DBT_MODEL', 'DBT_TEST', 'DBT_SNAPSHOT'] as const;

export class DbtStepActivity implements StepActivity {
  static readonly SUPPORTED_STEP_KINDS = new Set<string>(DBT_STEP_KINDS);

  constructor(private readonly deps: DbtStepActivityDeps) {}

  async execute(step: StepDefinition, context: StepExecutionContext): Promise<StepResult> {
    const ref = context.runContext.runExecutionContextRef;
    if (ref === undefined) {
      throw this.reject(`${ActivityErrorCode.RUN_EXECUTION_CONTEXT_REQUIRED}:${step.stepId}`);
    }

    let runExecutionContext: RunExecutionContext;
    try {
      runExecutionContext = await this.deps.runExecutionContextReader.resolve(ref);
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

    const result = await this.deps.dbtPluginRunner.execute({
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

export function createDbtStepActivityRegistry(deps: DbtStepActivityDeps): StepActivityRegistry {
  const activity = new DbtStepActivity(deps);
  return new Map(DBT_STEP_KINDS.map((stepKind) => [stepKind, activity] as const));
}
