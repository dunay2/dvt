// @vitest-environment jsdom

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
    });

    expect(
      deriveRunsRouteBootstrapPresentation({
        kind: 'run-loading',
        runId: 'run_123',
      })
    ).toMatchObject({
      status: 'pending',
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
    });

    expect(
      deriveRunsRouteBootstrapPresentation({
        kind: 'run-missing',
        runId: 'run_404',
      })
    ).toEqual({
      status: 'complete',
      detail: 'Run run_404 was not found',
    });

    expect(
      deriveRunsRouteBootstrapPresentation({
        kind: 'runs-error',
        message: 'Runs unavailable',
      })
    ).toEqual({
      status: 'failed',
      detail: 'Runs unavailable',
    });
  });

  it('publishes route bootstrap posture in Spanish when the application language is Spanish', () => {
    expect(
      deriveRunsRouteBootstrapPresentation(
        {
          kind: 'run-missing',
          runId: 'run_404',
        },
        'es'
      )
    ).toEqual({
      status: 'complete',
      detail: 'No se encontró la ejecución run_404',
    });
  });
});
