/**
 * Owned concern: provide the fail-closed default binding for the start-run
 * execution-capacity admission seam.
 *
 * The real adapter-backed signal is composed later. Until then, this default
 * binding makes the seam explicit and prevents silent permissive behavior when
 * execution-capacity data is unavailable.
 */
import {
  START_RUN_EXECUTION_CAPACITY_REASON,
  START_RUN_EXECUTION_CAPACITY_RESULT_KIND,
  type IStartRunExecutionCapacityPort,
} from '../ports/IStartRunExecutionCapacityPort.js';

export const DEFAULT_START_RUN_EXECUTION_CAPACITY_PORT: IStartRunExecutionCapacityPort = {
  async evaluate() {
    return {
      kind: START_RUN_EXECUTION_CAPACITY_RESULT_KIND.saturated,
      reason: START_RUN_EXECUTION_CAPACITY_REASON.capacitySignalUnavailable,
    };
  },
};
