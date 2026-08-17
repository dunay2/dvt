// @vitest-environment jsdom

import React from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { RunWorkspaceViewModel } from '../../services/runs/runWorkspaceModel';
import { RunWorkspaceState } from './RunStates';
import {
  buildWorkspace,
  createRunStatesHarness,
  setRunStatesLanguage,
} from './test/RunStatesHarness';

describe('RunStates workspace basics', () => {
  let harness: ReturnType<typeof createRunStatesHarness>;

  beforeEach(() => {
    setRunStatesLanguage('en');
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

  it.each([
    ['loading', 'Loading run events...'],
    ['failed', 'Run events could not be loaded.'],
  ] as const)(
    'does not render empty-timeline copy while the feed is %s',
    async (state, message) => {
      await harness.render(
        <RunWorkspaceState
          workspace={buildWorkspace(
            {
              eventFeedHealth: { state, events: [], canRetry: false },
              detailState: 'snapshot-only',
            },
            { state: 'unresolved', events: [] }
          )}
        />
      );

      expect(harness.container.textContent).toContain(message);
      expect(harness.container.textContent).not.toContain(
        'No runtime events are available yet for this run.'
      );
    }
  );

  it('renders missing lifecycle evidence as unavailable instead of inventing timestamps', async () => {
    await harness.render(
      <RunWorkspaceState
        workspace={buildWorkspace({
          snapshot: {
            runId: 'run_pending',
            planId: 'plan_pending',
            status: 'pending',
            environment: 'dev',
          },
        })}
      />
    );

    const snapshotFields = harness.container.textContent ?? '';
    expect(snapshotFields).toContain('StartedNot available in this run snapshot');
    expect(snapshotFields).toContain('DurationNot available in this run snapshot');
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

  it('renders the complete run workspace in Spanish from one copy authority', async () => {
    setRunStatesLanguage('es');

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
            planSummary: {
              executor: 'postgres',
              nodeCount: 3,
              stepCount: 3,
              sourceTables: ['raw.orders'],
              sinkTables: ['analytics.orders_daily'],
            },
          } as RunWorkspaceViewModel['snapshot'],
        })}
      />
    );

    const content = harness.container.textContent ?? '';
    expect(content).toContain('Ejecución run_123');
    expect(content).toContain('Itinerario de la ejecución');
    expect(content).toContain('Completada');
    expect(content).toContain('Vista previa de ejecución');
    expect(content).toContain('Instantánea de ejecución');
    expect(content).toContain('Campos de la instantánea');
    expect(content).toContain('Cronología de eventos');
    expect(content).toContain('Paso iniciado');
    expect(content).not.toContain('Run itinerary');
    expect(content).not.toContain('Runtime snapshot');
    expect(content).not.toContain('Event timeline');
  });
});
