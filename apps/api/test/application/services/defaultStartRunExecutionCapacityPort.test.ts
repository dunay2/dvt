/**
 * Owned concern: verify the fail-closed default execution-capacity binding.
 */
import { describe, expect, it } from 'vitest';

import { DEFAULT_START_RUN_EXECUTION_CAPACITY_PORT } from '../../../src/application/services/defaultStartRunExecutionCapacityPort.js';

describe('DEFAULT_START_RUN_EXECUTION_CAPACITY_PORT', () => {
  it('fails closed when no concrete adapter-backed capacity signal is bound', async () => {
    await expect(
      DEFAULT_START_RUN_EXECUTION_CAPACITY_PORT.evaluate({ targetAdapter: 'temporal' })
    ).resolves.toEqual({
      kind: 'saturated',
      reason: 'capacity_signal_unavailable',
    });
  });
});
