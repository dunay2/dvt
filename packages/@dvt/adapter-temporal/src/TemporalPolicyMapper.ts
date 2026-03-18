import type {
  AdapterPolicyMapper,
  ConcurrencyPolicy,
  RetryPolicy,
  TimeoutPolicy,
} from '@dvt/contracts';
import { UnsupportedPlannerPolicyError } from '@dvt/contracts';
import type { WorkerOptions } from '@temporalio/worker';
import type { RetryPolicy as TemporalRetryPolicy } from '@temporalio/workflow';

/**
 * Minimal Temporal activity timeout mapping used as the adapter reference
 * implementation for the canonical planner timeout vocabulary.
 */
export interface TemporalActivityTimeoutConfig {
  scheduleToCloseTimeout?: `${number}s`;
}

/**
 * Worker-level concurrency hint. This is adapter-specific host configuration
 * and does not by itself define the planner's semantic concurrency guarantee.
 */
export type TemporalWorkerConcurrencyConfig = Pick<
  WorkerOptions,
  'maxConcurrentActivityTaskExecutions' | 'maxConcurrentWorkflowTaskExecutions'
>;

const DEFAULT_TEMPORAL_RETRY_BACKOFF = Object.freeze({
  initialInterval: '1s' as const,
  maximumInterval: '60s' as const,
  backoffCoefficient: 2,
  nonRetryableErrorTypes: ['PermanentStepError'],
});

export class TemporalPolicyMapper implements AdapterPolicyMapper<
  TemporalRetryPolicy,
  TemporalActivityTimeoutConfig,
  TemporalWorkerConcurrencyConfig
> {
  mapRetry(policy: RetryPolicy): TemporalRetryPolicy {
    switch (policy.kind) {
      case 'at-most-once':
        return {
          maximumAttempts: 1,
          nonRetryableErrorTypes: ['PermanentStepError'],
        };
      case 'at-most-N':
        return {
          ...DEFAULT_TEMPORAL_RETRY_BACKOFF,
          // Canonical maxAttempts counts total attempts including the first run.
          // Temporal maximumAttempts uses the same total-attempt semantics, so
          // this mapping is intentionally 1:1 rather than retries-only.
          maximumAttempts: policy.maxAttempts,
        };
      default: {
        const exhaustive: never = policy;
        throw new UnsupportedPlannerPolicyError({
          adapterId: 'temporal',
          policyType: 'retry',
          policy: exhaustive,
          reason: 'Unknown canonical retry policy kind.',
        });
      }
    }
  }

  mapTimeout(policy: TimeoutPolicy): TemporalActivityTimeoutConfig {
    switch (policy.kind) {
      case 'unbounded':
        return {};
      case 'budget':
        return {
          // Stage 1.1 models timeout as one end-to-end step budget.
          // Temporal's closest direct activity knob is scheduleToCloseTimeout.
          scheduleToCloseTimeout: `${policy.maxSeconds}s`,
        };
      default: {
        const exhaustive: never = policy;
        throw new UnsupportedPlannerPolicyError({
          adapterId: 'temporal',
          policyType: 'timeout',
          policy: exhaustive,
          reason: 'Unknown canonical timeout policy kind.',
        });
      }
    }
  }

  mapConcurrency(policy: ConcurrencyPolicy): TemporalWorkerConcurrencyConfig {
    switch (policy.kind) {
      case 'sequential':
        return {
          maxConcurrentActivityTaskExecutions: 1,
          maxConcurrentWorkflowTaskExecutions: 1,
        };
      case 'bounded':
        return {
          maxConcurrentActivityTaskExecutions: policy.maxParallel,
          maxConcurrentWorkflowTaskExecutions: policy.maxParallel,
        };
      case 'unbounded':
        return {};
      default: {
        const exhaustive: never = policy;
        throw new UnsupportedPlannerPolicyError({
          adapterId: 'temporal',
          policyType: 'concurrency',
          policy: exhaustive,
          reason: 'Unknown canonical concurrency policy kind.',
        });
      }
    }
  }
}
