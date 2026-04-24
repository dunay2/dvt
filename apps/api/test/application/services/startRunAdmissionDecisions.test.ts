import {
  START_RUN_BACKPRESSURE_CODE,
  START_RUN_RESULT_KIND,
} from '@dvt/contracts';
import { describe, expect, it } from 'vitest';

import { ADMISSION_MODE } from '../../../src/application/ports/IAdmissionMode.js';
import {
  START_RUN_EXECUTION_CAPACITY_REASON,
  START_RUN_EXECUTION_CAPACITY_RESULT_KIND,
} from '../../../src/application/ports/IStartRunExecutionCapacityPort.js';
import {
  buildAdmissionRejectionRecord,
  toExecutionCapacityRejectResult,
} from '../../../src/application/services/startRunAdmissionDecisions.js';

const TELEMETRY_CONTEXT = {
  requestId: 'req-1',
  tenantId: 'tenant-1',
  runId: 'run-1',
} as const;

describe('startRunAdmissionDecisions', () => {
  it.each([
    [
      START_RUN_EXECUTION_CAPACITY_REASON.capacityExhausted,
      START_RUN_BACKPRESSURE_CODE.executionCapacityExhausted,
    ],
    [
      START_RUN_EXECUTION_CAPACITY_REASON.executorUnavailable,
      START_RUN_BACKPRESSURE_CODE.executorUnavailable,
    ],
    [
      START_RUN_EXECUTION_CAPACITY_REASON.capacitySignalUnavailable,
      START_RUN_BACKPRESSURE_CODE.capacitySignalUnavailable,
    ],
  ])('maps execution-capacity reason %s to canonical system_backpressure code', (reason, code) => {
    expect(
      toExecutionCapacityRejectResult(
        {
          kind: START_RUN_EXECUTION_CAPACITY_RESULT_KIND.saturated,
          reason,
        },
        30
      )
    ).toEqual({
      kind: START_RUN_RESULT_KIND.systemBackpressure,
      accepted: false,
      code,
      retryAfterSeconds: 30,
    });
  });

  it('records execution-capacity rejections as system decisions in observe mode', () => {
    const reject = toExecutionCapacityRejectResult(
      {
        kind: START_RUN_EXECUTION_CAPACITY_RESULT_KIND.saturated,
        reason: START_RUN_EXECUTION_CAPACITY_REASON.executorUnavailable,
        retryAfterSeconds: 45,
      },
      30
    );

    expect(reject).not.toBeNull();
    expect(
      buildAdmissionRejectionRecord(reject!, ADMISSION_MODE.observe, TELEMETRY_CONTEXT)
    ).toEqual({
      ...TELEMETRY_CONTEXT,
      mode: ADMISSION_MODE.observe,
      decision: 'would_reject_system',
      code: START_RUN_BACKPRESSURE_CODE.executorUnavailable,
      retryAfterSeconds: 45,
    });
  });
});
