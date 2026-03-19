import { describe, expect, it } from 'vitest';

import { NoopAdmissionTelemetry } from '../../../src/application/services/NoopAdmissionTelemetry.js';

describe('NoopAdmissionTelemetry', () => {
  it('records without failing', async () => {
    const telemetry = new NoopAdmissionTelemetry();
    await expect(
      telemetry.recordDecision({
        requestId: 'req-1',
        tenantId: 'tenant-1',
        runId: 'run-1',
        mode: 'observe',
        decision: 'would_reject_tenant',
      })
    ).resolves.toBeUndefined();
  });
});
