/**
 * Owned concern: project the standalone Temporal worker `readyz` signal into
 * canonical start-run execution-capacity semantics.
 */
import {
  START_RUN_EXECUTION_CAPACITY_REASON,
  START_RUN_EXECUTION_CAPACITY_RESULT_KIND,
  type IStartRunExecutionCapacityPort,
  type StartRunExecutionCapacityRequest,
  type StartRunExecutionCapacityResult,
} from '../../application/ports/IStartRunExecutionCapacityPort.js';

type FetchLike = (
  input: URL | string,
  init?: {
    readonly method?: string;
    readonly headers?: Record<string, string>;
    readonly signal?: AbortSignal;
  }
) => Promise<{
  readonly status: number;
  json(): Promise<unknown>;
}>;

type TemporalWorkerReadyzPayload = {
  readonly ready: boolean;
  readonly runStateCircuitState?: 'closed' | 'open' | 'half_open' | null;
};

const DEFAULT_READYZ_TIMEOUT_MS = 1000;

export interface TemporalWorkerReadyzExecutionCapacityPortOptions {
  readonly readyzUrl: URL | string;
  readonly fetch?: FetchLike;
  readonly timeoutMs?: number;
}

export class TemporalWorkerReadyzExecutionCapacityPort
  implements IStartRunExecutionCapacityPort
{
  private readonly fetch: FetchLike;

  public constructor(
    private readonly options: TemporalWorkerReadyzExecutionCapacityPortOptions
  ) {
    this.fetch = options.fetch ?? globalThis.fetch.bind(globalThis);
  }

  public async evaluate(
    request: StartRunExecutionCapacityRequest
  ): Promise<StartRunExecutionCapacityResult> {
    if (request.targetAdapter !== 'temporal') {
      return unavailableCapacitySignalResult();
    }

    try {
      const timeoutSignal = resolveTimeoutSignal(this.options.timeoutMs);
      const response = await this.fetch(this.options.readyzUrl, {
        method: 'GET',
        headers: { accept: 'application/json' },
        ...(timeoutSignal === undefined ? {} : { signal: timeoutSignal }),
      });
      const payload = await response.json();
      if (!isTemporalWorkerReadyzPayload(payload)) {
        return unavailableCapacitySignalResult();
      }

      if (response.status === 200 && payload.ready) {
        return {
          kind: START_RUN_EXECUTION_CAPACITY_RESULT_KIND.admissible,
        };
      }

      if (!payload.ready) {
        return {
          kind: START_RUN_EXECUTION_CAPACITY_RESULT_KIND.saturated,
          reason: START_RUN_EXECUTION_CAPACITY_REASON.executorUnavailable,
        };
      }
    } catch {
      return unavailableCapacitySignalResult();
    }

    return unavailableCapacitySignalResult();
  }
}

function isTemporalWorkerReadyzPayload(value: unknown): value is TemporalWorkerReadyzPayload {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  return typeof Reflect.get(value, 'ready') === 'boolean';
}

function unavailableCapacitySignalResult(): Extract<
  StartRunExecutionCapacityResult,
  { readonly kind: typeof START_RUN_EXECUTION_CAPACITY_RESULT_KIND.saturated }
> {
  return {
    kind: START_RUN_EXECUTION_CAPACITY_RESULT_KIND.saturated,
    reason: START_RUN_EXECUTION_CAPACITY_REASON.capacitySignalUnavailable,
  };
}

function resolveTimeoutSignal(timeoutMs: number | undefined): AbortSignal | undefined {
  const timeout = timeoutMs ?? DEFAULT_READYZ_TIMEOUT_MS;
  return typeof AbortSignal.timeout === 'function' ? AbortSignal.timeout(timeout) : undefined;
}
