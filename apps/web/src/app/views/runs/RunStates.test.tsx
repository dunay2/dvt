// @vitest-environment jsdom

import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router';

import type { Run } from '../../types/dbt';
import { RunListState, RunNotFoundState } from './RunStates';

function buildRun(overrides?: Partial<Run>): Run {
  return {
    runId: 'run_123',
    planId: 'plan_123',
    status: 'running',
    environment: 'dev',
    gitSha: 'abc123def',
    startTime: '2026-03-28T10:00:00Z',
    events: [],
    steps: [],
    ...overrides,
  };
}

describe('RunStates', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it('renders the run list with status, git sha and environment metadata', async () => {
    const runs = [
      buildRun(),
      buildRun({
        runId: 'run_456',
        status: 'failed',
        gitSha: 'zzz999yyy',
        environment: 'prod',
      }),
    ];

    await act(async () => {
      root.render(
        <MemoryRouter>
          <RunListState runs={runs} />
        </MemoryRouter>
      );
    });

    expect(container.textContent).toContain('Runs');
    expect(container.textContent).toContain('Run run_123');
    expect(container.textContent).toContain('Run run_456');
    expect(container.textContent).toContain('running');
    expect(container.textContent).toContain('failed');
    expect(container.textContent).toContain('abc123def');
    expect(container.textContent).toContain('zzz999yyy');
    expect(container.textContent).toContain('Environment: dev');
    expect(container.textContent).toContain('Environment: prod');
    expect(container.textContent).toContain('View Details');
  });

  it('renders the run-not-found state with the requested run id', async () => {
    await act(async () => {
      root.render(
        <MemoryRouter>
          <RunNotFoundState runId="run_missing" />
        </MemoryRouter>
      );
    });

    expect(container.textContent).toContain('Run not found');
    expect(container.textContent).toContain('run_missing');
    expect(container.textContent).toContain('No data is available for run');
  });
});
