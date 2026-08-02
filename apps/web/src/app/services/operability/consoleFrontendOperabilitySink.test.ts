import { describe, expect, it, vi } from 'vitest';

import { createBootstrapFailureEvent } from './frontendOperabilityRecorder';
import { createConsoleFrontendOperabilitySink } from './consoleFrontendOperabilitySink';

describe('createConsoleFrontendOperabilitySink', () => {
  it('writes a structured allowlisted event without enrichment', () => {
    const warn = vi.fn();
    const sink = createConsoleFrontendOperabilitySink({ warn });
    const event = createBootstrapFailureEvent('health', 'health-probe-unavailable');

    sink.record(event);

    expect(warn).toHaveBeenCalledWith('[frontend-operability]', event);
  });
});
