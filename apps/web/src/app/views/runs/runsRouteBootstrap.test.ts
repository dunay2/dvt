import { describe, expect, it } from 'vitest';

import { deriveRunsRouteBootstrapPresentation } from './runsRouteBootstrap';

describe('runsRouteBootstrap', () => {
  it('keeps startup pending for an empty loading list and for run detail loading', () => {
    expect(
      deriveRunsRouteBootstrapPresentation({
        kind: 'runs-list',
        runs: [],
        isLoading: true,
      })
    ).toMatchObject({
      status: 'pending',
      canComplete: false,
    });

    expect(
      deriveRunsRouteBootstrapPresentation({
        kind: 'run-loading',
        runId: 'run_123',
      })
    ).toMatchObject({
      status: 'pending',
      canComplete: false,
    });
  });

  it('maps settled list, missing, and error states correctly', () => {
    expect(
      deriveRunsRouteBootstrapPresentation({
        kind: 'runs-list',
        runs: [],
        isLoading: false,
      })
    ).toEqual({
      status: 'complete',
      detail: 'Runs route is ready',
      canComplete: true,
    });

    expect(
      deriveRunsRouteBootstrapPresentation({
        kind: 'run-missing',
        runId: 'run_404',
      })
    ).toEqual({
      status: 'complete',
      detail: 'Run run_404 was not found',
      canComplete: true,
    });

    expect(
      deriveRunsRouteBootstrapPresentation({
        kind: 'runs-error',
        message: 'Runs unavailable',
      })
    ).toEqual({
      status: 'failed',
      detail: 'Runs unavailable',
      canComplete: true,
    });
  });
});
