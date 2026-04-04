// @vitest-environment jsdom

import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router';

import type { RunWorkspaceViewModel } from '../../services/runs/runWorkspaceFacade';
import type { RunSummaryItem } from '../../services/runs/runsService';
import {
  RunDetailErrorState,
  RunListState,
  RunNotFoundState,
  RunWorkspaceState,
} from './RunStates';

function buildSummary(overrides?: Partial<RunSummaryItem>): RunSummaryItem {
  return {
    runId: 'run_123',
    planId: 'plan_123',
    status: 'running',
    environment: 'dev',
    gitSha: 'abc123def',
    startedAt: '2026-03-28T10:00:00Z',
    ...overrides,
  };
}

function buildWorkspace(
  overrides?: Partial<RunWorkspaceViewModel>,
  timelineOverrides?: Partial<RunWorkspaceViewModel['timeline']>
): RunWorkspaceViewModel {
  const timeline = {
    state: 'available',
    events: [
      {
        eventId: 'evt-1',
        eventType: 'StepStarted',
        runId: 'run_123',
        emittedAt: '2026-03-28T10:01:00Z',
        tenantId: 'tenant-1',
        projectId: 'project-1',
        environmentId: 'env-1',
        planId: 'plan_123',
        planVersion: '1.0.0',
        engineAttemptId: 1,
        logicalAttemptId: 1,
        idempotencyKey: 'id-1',
        payloadVersion: 1,
        stepId: 'step-1',
        runSeq: 1,
        persistedAt: '2026-03-28T10:01:00Z',
      },
    ],
    ...timelineOverrides,
  } as RunWorkspaceViewModel['timeline'];

  return {
    runId: 'run_123',
    snapshot: {
      runId: 'run_123',
      status: 'running',
      startedAt: '2026-03-28T10:00:00Z',
      environment: 'dev',
      gitSha: 'abc123def',
      substatus: 'WAITING_APPROVAL',
    },
    timeline,
    detailState: 'snapshot-plus-events',
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
      buildSummary(),
      buildSummary({
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

  it('renders snapshot-only run detail state', async () => {
    const workspace = buildWorkspace(
      {
        detailState: 'snapshot-only',
      },
      {
        state: 'empty',
        events: [],
      }
    );

    await act(async () => {
      root.render(
        <MemoryRouter>
          <RunWorkspaceState workspace={workspace} />
        </MemoryRouter>
      );
    });

    expect(container.textContent).toContain('snapshot-only');
    expect(container.textContent).toContain('No runtime events are available yet for this run.');
    expect(container.textContent).toContain('Runtime snapshot');
  });

  it('renders snapshot-plus-events run detail state', async () => {
    const workspace = buildWorkspace();

    await act(async () => {
      root.render(
        <MemoryRouter>
          <RunWorkspaceState workspace={workspace} />
        </MemoryRouter>
      );
    });

    expect(container.textContent).toContain('snapshot+timeline');
    expect(container.textContent).toContain('StepStarted');
    expect(container.textContent).toContain('Step: step-1');
  });

  it('renders error and not-found states', async () => {
    await act(async () => {
      root.render(
        <MemoryRouter>
          <>
            <RunDetailErrorState runId="run_500" message="Runtime service is unavailable" />
            <RunNotFoundState runId="run_missing" />
          </>
        </MemoryRouter>
      );
    });

    expect(container.textContent).toContain('Run workspace unavailable');
    expect(container.textContent).toContain('Runtime service is unavailable');
    expect(container.textContent).toContain('Run not found');
    expect(container.textContent).toContain('run_missing');
  });
});
