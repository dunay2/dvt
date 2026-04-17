import { describe, expect, it } from 'vitest';

import { deriveDiffRouteBootstrapPresentation } from './diffRouteBootstrap';

describe('diffRouteBootstrap', () => {
  it('blocks startup on loading or SQL error and completes for settled route states', () => {
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
        workbenchState: { kind: 'ready' },
        compareContextState: { kind: 'ready' },
        sqlContextState: { kind: 'error', message: 'SQL unavailable' },
      })
    ).toEqual({
      status: 'error',
      detail: 'SQL unavailable',
      canComplete: false,
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
