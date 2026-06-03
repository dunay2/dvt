/**
 * Owned concern: define the application-facing admission seam for start-run
 * execution capacity.
 *
 * The port returns start-run admission semantics only. It does not expose
 * adapter-native queue metrics or provider-specific transport details.
 */
import type { StartRunTargetAdapter } from '@dvt/contracts';

export const START_RUN_EXECUTION_CAPACITY_RESULT_KIND = {
  admissible: 'admissible',
  saturated: 'saturated',
} as const;

export const START_RUN_EXECUTION_CAPACITY_REASON = {
  capacityExhausted: 'capacity_exhausted',
  executorUnavailable: 'executor_unavailable',
  capacitySignalUnavailable: 'capacity_signal_unavailable',
} as const;

export type StartRunExecutionCapacityRequest = {
  readonly targetAdapter: StartRunTargetAdapter;
};

export type StartRunExecutionCapacityResult =
  | {
      readonly kind: typeof START_RUN_EXECUTION_CAPACITY_RESULT_KIND.admissible;
    }
  | {
      readonly kind: typeof START_RUN_EXECUTION_CAPACITY_RESULT_KIND.saturated;
      readonly reason:
        | typeof START_RUN_EXECUTION_CAPACITY_REASON.capacityExhausted
        | typeof START_RUN_EXECUTION_CAPACITY_REASON.executorUnavailable
        | typeof START_RUN_EXECUTION_CAPACITY_REASON.capacitySignalUnavailable;
      readonly retryAfterSeconds?: number;
    };

export interface IStartRunExecutionCapacityPort {
  evaluate(request: StartRunExecutionCapacityRequest): Promise<StartRunExecutionCapacityResult>;
}
