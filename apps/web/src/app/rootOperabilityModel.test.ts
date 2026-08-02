import { describe, expect, it } from 'vitest';

import {
  buildRootBootstrapOperabilityTransition,
  buildRootPlatformHealthDegradedEvent,
} from './rootOperabilityModel';

describe('rootOperabilityModel', () => {
  it('prioritizes capabilities failure as the bootstrap failure cause', () => {
    expect(
      buildRootBootstrapOperabilityTransition({
        bootstrapActive: true,
        capabilitiesFailed: true,
        capabilitiesReady: false,
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
      bootstrapActive: true,
      capabilitiesFailed: false,
      capabilitiesReady: true,
      platformHealthFailed: true,
      platformRestState: 'offline' as const,
    };

    expect(buildRootBootstrapOperabilityTransition(input)).toEqual({
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

  it('holds the current occurrence while an automatic retry is unresolved', () => {
    expect(
      buildRootBootstrapOperabilityTransition({
        bootstrapActive: true,
        capabilitiesFailed: false,
        capabilitiesReady: false,
        platformHealthFailed: false,
        platformRestState: 'ok',
      })
    ).toBeUndefined();

    expect(
      buildRootBootstrapOperabilityTransition({
        bootstrapActive: true,
        capabilitiesFailed: false,
        capabilitiesReady: true,
        platformHealthFailed: false,
        platformRestState: 'ok',
      })
    ).toBeNull();
  });

  it('does not classify a runtime health outage as a bootstrap failure', () => {
    expect(
      buildRootBootstrapOperabilityTransition({
        bootstrapActive: false,
        capabilitiesFailed: false,
        capabilitiesReady: true,
        platformHealthFailed: true,
        platformRestState: 'offline',
      })
    ).toBeNull();
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
