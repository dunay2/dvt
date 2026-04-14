import type { IRunExecutionContextReader } from '@dvt/artifacts';
import type {
  MaterializationEvidence,
  PlanRef,
  ResolvedRunContext,
  RunExecutionContext,
} from '@dvt/contracts';

import type {
  EventType,
  ExecutionPlan,
  IClock,
  IIdempotencyKeyBuilder,
  RunStateCommandPort,
} from '../engine-types.js';

import { ActivityErrorCode } from './activityFailures.js';

export type StepDefinition = ExecutionPlan['steps'][number];

export interface EventEmitterDeps {
  runStateCommandPort: RunStateCommandPort;
  clock: IClock;
  idempotency: IIdempotencyKeyBuilder;
  getEngineAttemptId?: () => number;
}

export interface RunBootstrapperDeps {
  runStateCommandPort: RunStateCommandPort;
}

export interface StepExecutionIdentity {
  tenantId: string;
  runId: string;
  environmentId: string;
}

export interface DbtPluginExecutionInput {
  step: StepDefinition;
  executionIdentity: StepExecutionIdentity;
  runContext: ResolvedRunContext;
  runExecutionContext: RunExecutionContext;
  pluginContext: Record<string, string>;
}

export interface DbtPluginRunner {
  execute(input: DbtPluginExecutionInput): Promise<StepResult>;
}

export interface ActivityDeps extends EventEmitterDeps, RunBootstrapperDeps {
  runExecutionContextReader?: IRunExecutionContextReader;
  dbtPluginRunner?: DbtPluginRunner;
}

export interface StepInput {
  step: StepDefinition;
  ctx: ResolvedRunContext;
  gatewayContext?: Record<string, unknown>;
}

export interface StepResult {
  stepId: string;
  status: 'COMPLETED' | 'FAILED';
  gatewayDecision?: boolean;
  resultEvidence?: MaterializationEvidence;
  failureReason?: string;
  retriable?: boolean;
  error?: string;
}

export interface EmitEventInput {
  ctx: ResolvedRunContext;
  planRef: PlanRef;
  eventType: EventType;
  stepId?: string;
  payload?: Record<string, unknown>;
  logicalAttemptId?: number;
}

export interface StepExecutionContext {
  executionIdentity: StepExecutionIdentity;
  runContext: ResolvedRunContext;
  gatewayContext?: Record<string, unknown>;
}

export interface StepExecutor {
  canExecute(step: StepDefinition): boolean;
  execute(step: StepDefinition, context: StepExecutionContext): Promise<StepResult>;
}

export interface StepActivity {
  execute(step: StepDefinition, context: StepExecutionContext): Promise<StepResult>;
}

export type StepActivityRegistry = ReadonlyMap<string, StepActivity>;

export class UnsupportedStepKindError extends Error {
  constructor(
    readonly stepKind: string,
    readonly stepId: string
  ) {
    super(`${ActivityErrorCode.UNSUPPORTED_STEP_KIND}:${stepKind}:${stepId}`);
    this.name = 'UnsupportedStepKindError';
  }
}
