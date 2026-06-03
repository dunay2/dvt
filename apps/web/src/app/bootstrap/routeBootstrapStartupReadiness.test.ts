import { describe, expect, it } from 'vitest';

import {
  createBlockedRouteBootstrapPresentation,
  createCompleteRouteBootstrapPresentation,
  createFailedRouteBootstrapPresentation,
  createPendingRouteBootstrapPresentation,
} from './routeBootstrapContract';
import {
  createInitialRouteBootstrapStartupReadinessState,
  resolveRouteBootstrapStartupReadiness,
} from './routeBootstrapStartupReadiness';

describe('route bootstrap startup readiness', () => {
  it('keeps route readiness pending when the route completes before capabilities settle', () => {
    const result = resolveRouteBootstrapStartupReadiness({
      activeRouteId: 'dbt.canvas',
      capabilitiesColdStartPending: true,
      capabilitiesPendingDetail: 'Waiting for runtime capabilities before route readiness.',
      presentation: createCompleteRouteBootstrapPresentation('Canvas route is ready'),
      previousState: createInitialRouteBootstrapStartupReadinessState(),
    });

    expect(result.command).toEqual({
      step: 'route',
      status: 'pending',
      detail: 'Waiting for runtime capabilities before route readiness.',
    });
    expect(result.canComplete).toBe(false);
    expect(result.nextState.stablePresentation).toBeNull();
  });

  it('keeps capability-waiting route copy after a same-route pending republication', () => {
    const suppressed = resolveRouteBootstrapStartupReadiness({
      activeRouteId: 'dbt.canvas',
      capabilitiesColdStartPending: true,
      capabilitiesPendingDetail: 'Waiting for runtime capabilities before route readiness.',
      presentation: createCompleteRouteBootstrapPresentation('Canvas route is ready'),
      previousState: createInitialRouteBootstrapStartupReadinessState(),
    });

    const pending = resolveRouteBootstrapStartupReadiness({
      activeRouteId: 'dbt.canvas',
      capabilitiesColdStartPending: true,
      capabilitiesPendingDetail: 'Waiting for runtime capabilities before route readiness.',
      presentation: createPendingRouteBootstrapPresentation('Preparing canvas route'),
      previousState: suppressed.nextState,
    });

    expect(pending.command).toEqual({
      step: 'route',
      status: 'pending',
      detail: 'Waiting for runtime capabilities before route readiness.',
    });
    expect(pending.canComplete).toBe(false);
  });

  it('does not demote a same-route failed posture back to pending', () => {
    const failed = resolveRouteBootstrapStartupReadiness({
      activeRouteId: 'dbt.canvas',
      capabilitiesColdStartPending: false,
      capabilitiesPendingDetail: 'Waiting for runtime capabilities before route readiness.',
      presentation: createFailedRouteBootstrapPresentation('Canvas rendered governed recovery'),
      previousState: createInitialRouteBootstrapStartupReadinessState(),
    });

    const pending = resolveRouteBootstrapStartupReadiness({
      activeRouteId: 'dbt.canvas',
      capabilitiesColdStartPending: false,
      capabilitiesPendingDetail: 'Waiting for runtime capabilities before route readiness.',
      presentation: createPendingRouteBootstrapPresentation('Preparing canvas route'),
      previousState: failed.nextState,
    });

    expect(pending.command).toEqual({
      step: 'route',
      status: 'failed',
      detail: 'Canvas rendered governed recovery',
    });
    expect(pending.canComplete).toBe(true);
  });

  it('allows a same-route failed posture to recover to complete', () => {
    const failed = resolveRouteBootstrapStartupReadiness({
      activeRouteId: 'dbt.canvas',
      capabilitiesColdStartPending: false,
      capabilitiesPendingDetail: 'Waiting for runtime capabilities before route readiness.',
      presentation: createFailedRouteBootstrapPresentation('Canvas rendered governed recovery'),
      previousState: createInitialRouteBootstrapStartupReadinessState(),
    });

    const recovered = resolveRouteBootstrapStartupReadiness({
      activeRouteId: 'dbt.canvas',
      capabilitiesColdStartPending: false,
      capabilitiesPendingDetail: 'Waiting for runtime capabilities before route readiness.',
      presentation: createCompleteRouteBootstrapPresentation('Canvas route is ready'),
      previousState: failed.nextState,
    });

    expect(recovered.command).toEqual({
      step: 'route',
      status: 'complete',
      detail: 'Canvas route is ready',
    });
    expect(recovered.canComplete).toBe(true);
    expect(recovered.nextState.stablePresentation?.status).toBe('complete');
  });

  it('keeps blockers visible even when capabilities are still pending', () => {
    const result = resolveRouteBootstrapStartupReadiness({
      activeRouteId: 'dbt.canvas',
      capabilitiesColdStartPending: true,
      capabilitiesPendingDetail: 'Waiting for runtime capabilities before route readiness.',
      presentation: createBlockedRouteBootstrapPresentation('Canvas requires draft recovery'),
      previousState: createInitialRouteBootstrapStartupReadinessState(),
    });

    expect(result.command).toEqual({
      step: 'route',
      status: 'blocked',
      detail: 'Canvas requires draft recovery',
    });
    expect(result.canComplete).toBe(false);
    expect(result.nextState.stablePresentation?.status).toBe('blocked');
  });

  it('resets stable route posture when the active route changes', () => {
    const failed = resolveRouteBootstrapStartupReadiness({
      activeRouteId: 'dbt.canvas',
      capabilitiesColdStartPending: false,
      capabilitiesPendingDetail: 'Waiting for runtime capabilities before route readiness.',
      presentation: createFailedRouteBootstrapPresentation('Canvas rendered governed recovery'),
      previousState: createInitialRouteBootstrapStartupReadinessState(),
    });

    const nextRoute = resolveRouteBootstrapStartupReadiness({
      activeRouteId: 'test.plugins',
      capabilitiesColdStartPending: false,
      capabilitiesPendingDetail: 'Waiting for runtime capabilities before route readiness.',
      presentation: createPendingRouteBootstrapPresentation('Preparing Plugins route'),
      previousState: failed.nextState,
    });

    expect(nextRoute.command).toEqual({
      step: 'route',
      status: 'pending',
      detail: 'Preparing Plugins route',
    });
    expect(nextRoute.canComplete).toBe(false);
    expect(nextRoute.nextState.stablePresentation).toBeNull();
  });
});
