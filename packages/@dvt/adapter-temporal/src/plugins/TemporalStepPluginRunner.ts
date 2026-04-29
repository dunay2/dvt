/**
 * @file packages/@dvt/adapter-temporal/src/plugins/TemporalStepPluginRunner.ts
 * @ownedConcern Define the generic execution port for Temporal step plugin runners
 * @baseline ADR-0003: Execution Model
 * @baseline ADR-0014: Run-Driven Adapter Model
 * @decision Model executable plugin runtimes behind a generic runner port
 * @consequence DBT, SQL, and future plugins can implement the same execution boundary
 * @version 1.0.0
 */
import type { StepResult } from '../activities/activityTypes.js';

export interface TemporalStepPluginRunner<TExecutionInput> {
  execute(input: TExecutionInput): Promise<StepResult>;
}
