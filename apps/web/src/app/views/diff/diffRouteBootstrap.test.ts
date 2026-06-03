import { describe, expect, it } from 'vitest';

import { deriveDiffRouteBootstrapPresentation } from './diffRouteBootstrap';

describe('diffRouteBootstrap', () => {
  it('keeps loading pending, reveals controlled route failures, and completes settled states', () => {
    expect(
      deriveDiffRouteBootstrapPresentation({
        workbenchState: { kind: 'loading' },
        compareContextState: { kind: 'ready' },
        sqlContextState: { kind: 'ready' },
      })
    ).toMatchObject({
      status: 'pending',
      canComplete: false,
    });

    expect(
      deriveDiffRouteBootstrapPresentation({
        workbenchState: { kind: 'error', message: 'Diff changes unavailable' },
        compareContextState: { kind: 'ready' },
        sqlContextState: { kind: 'ready' },
      })
    ).toEqual({
      status: 'failed',
      detail: 'Diff changes unavailable',
      canComplete: true,
    });

    expect(
      deriveDiffRouteBootstrapPresentation({
        workbenchState: { kind: 'ready' },
        compareContextState: { kind: 'ready' },
        sqlContextState: { kind: 'error', message: 'SQL unavailable' },
      })
    ).toEqual({
      status: 'failed',
      detail: 'SQL unavailable',
      canComplete: true,
    });

    expect(
      deriveDiffRouteBootstrapPresentation({
        workbenchState: { kind: 'empty' },
        compareContextState: { kind: 'unavailable' },
        sqlContextState: { kind: 'unavailable' },
      })
    ).toEqual({
      status: 'complete',
      detail: 'Diff route is ready with no changes',
      canComplete: true,
    });
  });
});
