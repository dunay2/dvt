/**
 * @file packages/@dvt/adapter-temporal/src/plugins/dbt/DbtStepActivity.ts
 * @ownedConcern DBT step activity profile composed explicitly by Temporal worker runtime
 * @baseline ADR-0003: Execution Model
 * @baseline ADR-0046: Execution Plan Definition And Run Execution Policy Separation
 * @decision Keep DBT step-kind ownership in the worker plugin profile instead of core Temporal dispatch
 * @consequence DBT execution can be enabled, replaced, or omitted without changing workflow orchestration
 * @version 1.0.0
 */
import {
  parseDbtPluginContext,
  type DbtPluginContext,
  type RunExecutionContext,
  type RunExecutionContextRef,
} from '@dvt/contracts';
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

import { TEMPORAL_DBT_PLUGIN_STEP_KINDS } from './dbtPluginManifest.js';
import type { DbtStepActivityDeps } from './dbtPluginTypes.js';

export class DbtStepActivity implements StepActivity {
  static readonly SUPPORTED_STEP_KINDS = new Set<string>(TEMPORAL_DBT_PLUGIN_STEP_KINDS);

  constructor(private readonly deps: DbtStepActivityDeps) {}

  async execute(step: StepDefinition, context: StepExecutionContext): Promise<StepResult> {
    const runExecutionContext = await this.resolveRunExecutionContext(step, context);
    const pluginContext = this.resolveDbtPluginContext(step, runExecutionContext);
    const result = await this.deps.dbtPluginRunner.execute({
      step,
      executionIdentity: context.executionIdentity,
      runContext: context.runContext,
      runExecutionContext,
      pluginContext,
    });

    this.assertResultMatchesStep(step, result);
    return result;
  }

  private async resolveRunExecutionContext(
    step: StepDefinition,
    context: StepExecutionContext
  ): Promise<RunExecutionContext> {
    const ref = this.requireRunExecutionContextRef(step, context);
    return this.readRunExecutionContext(ref);
  }

  private requireRunExecutionContextRef(
    step: StepDefinition,
    context: StepExecutionContext
  ): RunExecutionContextRef {
    const ref = context.runContext.runExecutionContextRef;
    if (ref === undefined) {
      throw this.reject(`${ActivityErrorCode.RUN_EXECUTION_CONTEXT_REQUIRED}:${step.stepId}`);
    }

    return ref;
  }

  private async readRunExecutionContext(ref: RunExecutionContextRef): Promise<RunExecutionContext> {
    try {
      return await this.deps.runExecutionContextReader.resolve(ref);
    } catch (error) {
      throw this.mapRunExecutionContextReadError(error);
    }
  }

  private mapRunExecutionContextReadError(error: unknown): unknown {
    if (error instanceof RunExecutionContextRejectedError) {
      const reason = error.details?.['reason'];
      return this.reject(typeof reason === 'string' ? reason : error.message);
    }

    return error;
  }

  private resolveDbtPluginContext(
    step: StepDefinition,
    runExecutionContext: RunExecutionContext
  ): DbtPluginContext {
    const pluginContextInput = runExecutionContext.pluginContexts['dbt'];
    if (pluginContextInput === undefined) {
      throw this.reject(`${ActivityErrorCode.DBT_PLUGIN_CONTEXT_REQUIRED}:${step.stepId}`);
    }

    const pluginContext = parseDbtPluginContext(pluginContextInput);
    if (pluginContext === undefined || Object.keys(pluginContext).length === 0) {
      throw this.reject(`${ActivityErrorCode.DBT_PLUGIN_CONTEXT_REQUIRED}:${step.stepId}`);
    }

    return pluginContext;
  }

  private assertResultMatchesStep(step: StepDefinition, result: StepResult): void {
    if (result.stepId !== step.stepId) {
      throw this.reject(
        `${ActivityErrorCode.DBT_PLUGIN_RESULT_INVALID}: stepId_mismatch:${step.stepId}:${result.stepId}`
      );
    }
  }

  private reject(message: string): ReturnType<typeof createPermanentStepFailure> {
    return createPermanentStepFailure(message);
  }
}

export function createDbtStepActivityRegistry(deps: DbtStepActivityDeps): StepActivityRegistry {
  const activity = new DbtStepActivity(deps);
  return new Map(TEMPORAL_DBT_PLUGIN_STEP_KINDS.map((stepKind) => [stepKind, activity] as const));
}
