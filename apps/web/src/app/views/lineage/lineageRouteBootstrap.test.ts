import { describe, expect, it } from 'vitest';

import { deriveLineageRouteBootstrapPresentation } from './lineageRouteBootstrap';

describe('lineageRouteBootstrap', () => {
  it('maps loading, controlled failure, and ready states to published route posture', () => {
    expect(deriveLineageRouteBootstrapPresentation({ kind: 'loading' })).toMatchObject({
      status: 'pending',
      canComplete: false,
    });
    expect(
      deriveLineageRouteBootstrapPresentation({
        kind: 'error',
        message: 'Snapshot unavailable',
      })
    ).toEqual({
      status: 'failed',
      detail: 'Snapshot unavailable',
      canComplete: true,
    });
    expect(deriveLineageRouteBootstrapPresentation({ kind: 'ready' })).toEqual({
      status: 'complete',
      detail: 'Lineage route is ready',
      canComplete: true,
    });
  });
});
