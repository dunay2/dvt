import { describe, expect, it, vi } from 'vitest';

import { createAppServicesTestOverrides } from '../../../testing/appServicesTestDoubles';
import type { FrontendOperabilitySink } from '../../ports/frontendOperability';
import { buildAppServices } from './appServices';

describe('buildAppServices frontend operability composition', () => {
  it('publishes one sink and one transition policy around the injected outbound port', () => {
    const sink: FrontendOperabilitySink = { record: vi.fn() };

    const services = buildAppServices({
      ...createAppServicesTestOverrides(),
      frontendOperabilitySink: sink,
    });

    expect(services.frontendOperabilitySink).toBe(sink);

    const event = {
      type: 'frontend.bootstrap.failed',
      phase: 'capabilities',
      reasonCode: 'capabilities-query-failed',
    } as const;
    services.frontendOperabilityTransitionRecorder.recordTransition('root.bootstrap', event);
    services.frontendOperabilityTransitionRecorder.recordTransition('root.bootstrap', event);

    expect(sink.record).toHaveBeenCalledTimes(1);
  });
});
