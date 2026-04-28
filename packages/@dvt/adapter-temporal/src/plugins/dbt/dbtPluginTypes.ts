/**
 * @file packages/@dvt/adapter-temporal/src/plugins/dbt/dbtPluginTypes.ts
 * @ownedConcern DBT plugin activity contracts owned by the worker plugin profile
 * @baseline ADR-0003: Execution Model
 * @baseline ADR-0046: Execution Plan Definition And Run Execution Policy Separation
 * @decision Keep DBT execution contracts outside the Temporal core activity dispatcher
 * @consequence Core Temporal activity wiring remains plugin-agnostic while DBT can be composed explicitly
 * @version 1.0.0
 */
import type { IRunExecutionContextReader } from '@dvt/artifacts';
import type { DbtPluginContext, ResolvedRunContext, RunExecutionContext } from '@dvt/contracts';

import type {
  StepDefinition,
  StepExecutionIdentity,
  StepResult,
} from '../../activities/activityTypes.js';

export interface DbtPluginExecutionInput {
  step: StepDefinition;
  executionIdentity: StepExecutionIdentity;
  runContext: ResolvedRunContext;
  runExecutionContext: RunExecutionContext;
  pluginContext: DbtPluginContext;
}

export interface DbtPluginRunner {
  execute(input: DbtPluginExecutionInput): Promise<StepResult>;
}

export interface DbtStepActivityDeps {
  runExecutionContextReader: IRunExecutionContextReader;
  dbtPluginRunner: DbtPluginRunner;
}
