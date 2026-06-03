/**
 * Owned concern: bind provider-specific execution-capacity probes for the
 * protected runtime root behind the abstract start-run admission seam.
 */
import type { IStartRunExecutionCapacityPort } from '../../application/ports/IStartRunExecutionCapacityPort.js';
import { DEFAULT_START_RUN_EXECUTION_CAPACITY_PORT } from '../../application/services/defaultStartRunExecutionCapacityPort.js';
import { TemporalWorkerReadyzExecutionCapacityPort } from '../../infrastructure/executionCapacity/TemporalWorkerReadyzExecutionCapacityPort.js';
import type { Env } from '../../plugins/env.js';

type FetchLike = ConstructorParameters<typeof TemporalWorkerReadyzExecutionCapacityPort>[0]['fetch'];

export interface BuildProtectedExecutionCapacityPortDeps {
  readonly fetch?: FetchLike;
}

export function buildProtectedExecutionCapacityPort(
  env: Env,
  deps: BuildProtectedExecutionCapacityPortDeps = {}
): IStartRunExecutionCapacityPort {
  const temporalBinding = buildTemporalBinding(env, deps);
  if (temporalBinding === null) {
    return DEFAULT_START_RUN_EXECUTION_CAPACITY_PORT;
  }

  return {
    async evaluate(request) {
      if (request.targetAdapter === 'temporal') {
        return temporalBinding.evaluate(request);
      }
      return DEFAULT_START_RUN_EXECUTION_CAPACITY_PORT.evaluate(request);
    },
  };
}

function buildTemporalBinding(
  env: Env,
  deps: BuildProtectedExecutionCapacityPortDeps
): IStartRunExecutionCapacityPort | null {
  if (!env.TEMPORAL_ADDRESS || !env.DVT_TEMPORAL_WORKER_READYZ_URL) {
    return null;
  }

  return new TemporalWorkerReadyzExecutionCapacityPort({
    readyzUrl: env.DVT_TEMPORAL_WORKER_READYZ_URL,
    ...(deps.fetch === undefined ? {} : { fetch: deps.fetch }),
  });
}
