import { describe, expect, it, vi } from 'vitest';

import { createAppServicesTestOverrides } from '../../../testing/appServicesTestDoubles';
import type { FrontendOperabilitySink } from '../../ports/frontendOperability';
import { buildAppServices } from './appServices';

describe('buildAppServices frontend operability composition', () => {
  it('publishes the injected sink as one application-wide outbound port', () => {
    const sink: FrontendOperabilitySink = { record: vi.fn() };

    const services = buildAppServices({
      ...createAppServicesTestOverrides(),
      frontendOperabilitySink: sink,
    });

    expect(services.frontendOperabilitySink).toBe(sink);
  });
});
