import { describe, expect, it, vi } from 'vitest';

import type { FrontendOperabilitySink } from '../../ports/frontendOperability';
import {
  createBootstrapFailureEvent,
  createContractFailureEvent,
  createFrontendOperabilityTransitionRecorder,
  createRouteFailureEvent,
  createSurfaceDegradedEvent,
  normalizeFrontendOperabilityRouteId,
  recordFrontendOperabilityEvent,
} from './frontendOperabilityRecorder';

describe('frontendOperabilityRecorder', () => {
  it('records only closed privacy-safe event shapes', () => {
    const record = vi.fn<FrontendOperabilitySink['record']>();
    const sink: FrontendOperabilitySink = { record };

    recordFrontendOperabilityEvent(
      sink,
      createBootstrapFailureEvent('capabilities', 'capabilities-query-failed')
    );
    recordFrontendOperabilityEvent(
      sink,
      createRouteFailureEvent(
        normalizeFrontendOperabilityRouteId('dbt.canvas'),
        'route-boundary-activated'
      )
    );
    recordFrontendOperabilityEvent(
      sink,
      createContractFailureEvent(
        'ListWarehouseConnectionSourceObjects',
        'response-contract-rejected'
      )
    );
    recordFrontendOperabilityEvent(
      sink,
      createSurfaceDegradedEvent(
        'shell.platform-health',
        'partial',
        'platform-health-state-transition'
      )
    );

    expect(record.mock.calls.map(([event]) => event)).toEqual([
      {
        type: 'frontend.bootstrap.failed',
        phase: 'capabilities',
        reasonCode: 'capabilities-query-failed',
      },
      {
        type: 'frontend.route.failed',
        routeId: 'dbt.canvas',
        reasonCode: 'route-boundary-activated',
      },
      {
        type: 'frontend.contract.failed',
        operation: 'ListWarehouseConnectionSourceObjects',
        reasonCode: 'response-contract-rejected',
      },
      {
        type: 'frontend.surface.degraded',
        surface: 'shell.platform-health',
        state: 'partial',
        reasonCode: 'platform-health-state-transition',
      },
    ]);
  });

  it('contains sink failures', () => {
    const sink: FrontendOperabilitySink = {
      record: () => {
        throw new Error('sink unavailable');
      },
    };

    expect(() =>
      recordFrontendOperabilityEvent(
        sink,
        createBootstrapFailureEvent('health', 'health-probe-unavailable')
      )
    ).not.toThrow();
  });

  it('records each transition once across presenter remounts and resets explicitly', () => {
    const record = vi.fn<FrontendOperabilitySink['record']>();
    const recorder = createFrontendOperabilityTransitionRecorder({ record });
    const event = createBootstrapFailureEvent('capabilities', 'capabilities-query-failed');

    recorder.recordTransition('root.bootstrap', event);
    recorder.recordTransition('root.bootstrap', { ...event });
    expect(record).toHaveBeenCalledTimes(1);

    recorder.recordTransition('root.bootstrap', null);
    recorder.recordTransition('root.bootstrap', event);
    expect(record).toHaveBeenCalledTimes(2);
  });

  it('rejects route parameters and raw paths from the stable route code', () => {
    expect(normalizeFrontendOperabilityRouteId('shell.admin')).toBe('shell.admin');
    expect(normalizeFrontendOperabilityRouteId('/runs/run-123')).toBe('unknown');
    expect(normalizeFrontendOperabilityRouteId('runs:run-123')).toBe('unknown');
    expect(normalizeFrontendOperabilityRouteId(undefined)).toBe('unknown');
  });
});
