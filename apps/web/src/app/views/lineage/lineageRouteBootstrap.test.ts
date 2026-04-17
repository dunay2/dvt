import { describe, expect, it } from 'vitest';

import { deriveLineageRouteBootstrapPresentation } from './lineageRouteBootstrap';

describe('lineageRouteBootstrap', () => {
  it('maps loading, error, and ready states to published route posture', () => {
    expect(
      deriveLineageRouteBootstrapPresentation({ kind: 'loading' })
    ).toMatchObject({
      status: 'pending',
      canComplete: false,
    });
    expect(
      deriveLineageRouteBootstrapPresentation({
        kind: 'error',
        message: 'Snapshot unavailable',
      })
    ).toEqual({
      status: 'error',
      detail: 'Snapshot unavailable',
      canComplete: false,
    });
    expect(
      deriveLineageRouteBootstrapPresentation({ kind: 'ready' })
    ).toEqual({
      status: 'complete',
      detail: 'Lineage route is ready',
      canComplete: true,
    });
  });
});
