import { describe, expect, it } from 'vitest';

import { deriveArtifactsRouteBootstrapPresentation } from './artifactsRouteBootstrap';

describe('artifactsRouteBootstrap', () => {
  it('maps loading, invalid-import, and ready states to route posture', () => {
    expect(deriveArtifactsRouteBootstrapPresentation({ kind: 'loading' })).toMatchObject({
      status: 'pending',
      canComplete: false,
    });

    expect(
      deriveArtifactsRouteBootstrapPresentation({
        kind: 'invalid-import',
        message: 'Manifest invalid',
      })
    ).toEqual({
      status: 'failed',
      detail: 'Manifest invalid',
      canComplete: true,
    });

    expect(deriveArtifactsRouteBootstrapPresentation({ kind: 'ready' })).toEqual({
      status: 'complete',
      detail: 'Artifacts route is ready',
      canComplete: true,
    });
  });
});
