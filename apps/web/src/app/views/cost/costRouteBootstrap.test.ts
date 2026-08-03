import { describe, expect, it } from 'vitest';

import { deriveCostRouteBootstrapPresentation } from './costRouteBootstrap';

describe('costRouteBootstrap', () => {
  it('maps loading, controlled failure, and ready posture for the cost route', () => {
    expect(
      deriveCostRouteBootstrapPresentation({
        isLoading: true,
        errorMessage: null,
      })
    ).toMatchObject({
      status: 'pending',
    });

    expect(
      deriveCostRouteBootstrapPresentation({
        isLoading: false,
        errorMessage: 'Cost unavailable',
      })
    ).toEqual({
      status: 'failed',
      detail: 'Cost unavailable',
    });

    expect(
      deriveCostRouteBootstrapPresentation({
        isLoading: false,
        errorMessage: null,
      })
    ).toEqual({
      status: 'complete',
      detail: 'Cost route is ready',
    });
  });
});
