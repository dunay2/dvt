import { describe, expect, it } from 'vitest';

import { deriveCostRouteBootstrapPresentation } from './costRouteBootstrap';

describe('costRouteBootstrap', () => {
  it('maps loading, error, and ready posture for the cost route', () => {
    expect(
      deriveCostRouteBootstrapPresentation({
        isLoading: true,
        errorMessage: null,
      })
    ).toMatchObject({
      status: 'pending',
      canComplete: false,
    });

    expect(
      deriveCostRouteBootstrapPresentation({
        isLoading: false,
        errorMessage: 'Cost unavailable',
      })
    ).toEqual({
      status: 'error',
      detail: 'Cost unavailable',
      canComplete: false,
    });

    expect(
      deriveCostRouteBootstrapPresentation({
        isLoading: false,
        errorMessage: null,
      })
    ).toEqual({
      status: 'complete',
      detail: 'Cost route is ready',
      canComplete: true,
    });
  });
});
