import type { ExecutionPlan } from './ExecutionPlan.v2';

export interface IExecutionPlanner {
  plan(input: unknown): Promise<ExecutionPlan>;
}
