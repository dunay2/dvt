import { describe, expect, it } from 'vitest';

import {
  buildRootBootstrapFailureEvent,
  buildRootPlatformHealthDegradedEvent,
} from './rootOperabilityModel';

describe('rootOperabilityModel', () => {
  it('prioritizes capabilities failure as the bootstrap failure cause', () => {
    expect(
      buildRootBootstrapFailureEvent({
        capabilitiesFailed: true,
        platformHealthFailed: true,
        platformRestState: 'offline',
      })
    ).toEqual({
      type: 'frontend.bootstrap.failed',
      phase: 'capabilities',
      reasonCode: 'capabilities-query-failed',
    });
  });

  it('maps an unavailable health probe to bootstrap and surface evidence', () => {
    const input = {
      capabilitiesFailed: false,
      platformHealthFailed: true,
      platformRestState: 'offline' as const,
    };

    expect(buildRootBootstrapFailureEvent(input)).toEqual({
      type: 'frontend.bootstrap.failed',
      phase: 'health',
      reasonCode: 'health-probe-unavailable',
    });
    expect(buildRootPlatformHealthDegradedEvent(input.platformRestState)).toEqual({
      type: 'frontend.surface.degraded',
      surface: 'shell.platform-health',
      state: 'probe-unavailable',
      reasonCode: 'platform-health-state-transition',
    });
  });

  it('emits partial only for an existing degraded health projection', () => {
    expect(buildRootPlatformHealthDegradedEvent('degraded')).toEqual({
      type: 'frontend.surface.degraded',
      surface: 'shell.platform-health',
      state: 'partial',
      reasonCode: 'platform-health-state-transition',
    });
    expect(buildRootPlatformHealthDegradedEvent('ok')).toBeNull();
    expect(buildRootPlatformHealthDegradedEvent(undefined)).toBeNull();
  });
});
