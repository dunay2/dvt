// @vitest-environment jsdom

import React from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { RunWorkspaceViewModel } from '../../services/runs/runWorkspaceFacade';
import { RunWorkspaceState } from './RunStates';
import { buildWorkspace, createRunStatesHarness } from './test/RunStatesHarness';

describe('RunStates workspace basics', () => {
  let harness: ReturnType<typeof createRunStatesHarness>;

  beforeEach(() => {
    harness = createRunStatesHarness();
  });

  afterEach(() => {
    harness.cleanup();
  });

  it('renders snapshot-only run detail state', async () => {
    await harness.render(
      <RunWorkspaceState
        workspace={buildWorkspace(
          {
            detailState: 'snapshot-only',
          },
          {
            state: 'empty',
            events: [],
          }
        )}
      />
    );

    expect(harness.container.textContent).toContain('snapshot-only');
    expect(harness.container.textContent).toContain(
      'No runtime events are available yet for this run.'
    );
    expect(harness.container.textContent).toContain('Runtime snapshot');
    expect(harness.container.textContent).toContain('Current step');
    expect(harness.container.textContent).toContain('step-transform');
  });

  it('renders snapshot-plus-events run detail state', async () => {
    await harness.render(<RunWorkspaceState workspace={buildWorkspace()} />);

    expect(harness.container.textContent).toContain('snapshot+timeline');
    expect(harness.container.textContent).toContain('Runtime snapshot');
    expect(harness.container.textContent).toContain('Event timeline');
    expect(harness.container.textContent).toContain('StepStarted');
    expect(harness.container.textContent).toContain('INFO');
    expect(harness.container.textContent).toContain('Step started');
    expect(harness.container.textContent).toContain('step-1');
    expect(harness.container.textContent).not.toContain('Console');
    expect(harness.container.textContent).not.toContain('Materialization evidence');
    expect(harness.container.textContent).not.toContain(
      'Result evidence is not available yet for this run snapshot.'
    );
  });

  it('renders return navigation and persisted execution preview scope for completed runs', async () => {
    await harness.render(
      <RunWorkspaceState
        workspace={buildWorkspace({
          snapshot: {
            runId: 'run_123',
            planId: 'plan_123',
            status: 'completed',
            executor: 'postgres',
            startedAt: '2026-03-28T10:00:00.000Z',
            completedAt: '2026-03-28T10:00:30.000Z',
            environment: 'dev',
            gitSha: 'abc123def',
            planSummary: {
              executor: 'postgres',
              nodeCount: 3,
              stepCount: 3,
              sourceTables: ['raw.orders'],
              sinkTables: ['analytics.orders_daily'],
            },
            execution: {
              materialization: {
                executor: 'postgres',
                environmentId: 'env-1',
                sinkTable: 'analytics.orders_daily',
                rowsWritten: 42,
                startedAt: '2026-03-28T10:00:05.000Z',
                completedAt: '2026-03-28T10:00:25.000Z',
                durationMs: 20000,
              },
            },
          } as RunWorkspaceViewModel['snapshot'],
        })}
      />
    );

    expect(harness.container.textContent).toContain('Run itinerary');
    expect(harness.container.textContent).toContain('Back to Canvas');
    expect(harness.container.textContent).toContain('All runs');
    expect(harness.container.textContent).toContain('Execution Preview');
    expect(harness.container.textContent).not.toContain('Plan');
    expect(harness.container.textContent).toContain('plan_123');
    expect(harness.container.textContent).toContain('Source tables');
    expect(harness.container.textContent).toContain('raw.orders');
    expect(harness.container.textContent).toContain('Sink tables');
    expect(harness.container.textContent).toContain('analytics.orders_daily');
    expect(harness.container.querySelector('a[href="/canvas"]')).toBeTruthy();
    expect(harness.container.querySelector('a[href="/runs"]')).toBeTruthy();
  });
});
