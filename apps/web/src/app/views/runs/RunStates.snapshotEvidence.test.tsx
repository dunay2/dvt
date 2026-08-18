// @vitest-environment jsdom

import React, { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { RunWorkspaceViewModel } from '../../services/runs/runWorkspaceModel';
import { RunWorkspaceState } from './RunStates';
import {
  buildWorkspace,
  createRunStatesHarness,
  selectRunDetailTab,
  setRunStatesLanguage,
} from './test/RunStatesHarness';

describe('RunStates snapshot evidence', () => {
  let harness: ReturnType<typeof createRunStatesHarness>;

  beforeEach(() => {
    setRunStatesLanguage('en');
    harness = createRunStatesHarness();
  });

  afterEach(() => {
    harness.cleanup();
  });

  it('renders persisted execution preview and authoring provenance from snapshot fields', async () => {
    await harness.render(
      <RunWorkspaceState
        workspace={buildWorkspace({
          snapshot: {
            runId: 'run_123',
            status: 'completed',
            startedAt: '2026-03-28T10:00:00.000Z',
            completedAt: '2026-03-28T10:00:30.000Z',
            environment: 'dev',
            gitSha: 'abc123def',
            provenance: {
              persistedPlan: {
                planRecordId: 'plan-record-1',
                planVersion: '1.0',
                sourceRef: 'plan://persisted/plan-record-1',
                canonicalPlanSha256: 'a'.repeat(64),
              },
              authoring: {
                graphArtifact: {
                  repo: 'acme/warehouse',
                  path: 'graphs/orders.flow.yaml',
                  ref: 'refs/heads/main',
                  commitSha: '1'.repeat(40),
                  contentSha256: '2'.repeat(64),
                },
                sqlArtifact: {
                  repo: 'acme/warehouse',
                  path: 'models/orders_daily.sql',
                  commitSha: '3'.repeat(40),
                },
              },
            },
          },
        })}
      />
    );

    await selectRunDetailTab(harness.container, 'Provenance');

    expect(harness.container.textContent).toContain('Execution Preview and authoring provenance');
    expect(harness.container.textContent).not.toContain('Plan and authoring provenance');
    expect(
      harness.container.querySelector('[data-slot="run-plan-provenance-card"]')
    ).not.toBeNull();
    expect(harness.container.textContent).toContain('plan-record-1');
    expect(
      harness.container.querySelector('[data-slot="run-plan-record-value"]')?.className
    ).toContain('break-all');
    expect(harness.container.textContent).toContain('plan://persisted/plan-record-1');
    expect(harness.container.textContent).toContain('a'.repeat(64));
    expect(harness.container.textContent).toContain('Graph artifact');
    expect(harness.container.textContent).toContain('acme/warehouse:graphs/orders.flow.yaml');
    expect(harness.container.textContent).toContain('SQL artifact');
    expect(harness.container.textContent).toContain('acme/warehouse:models/orders_daily.sql');
  });

  it('renders materialization evidence for completed snapshots', async () => {
    await harness.render(
      <RunWorkspaceState
        workspace={buildWorkspace({
          snapshot: {
            runId: 'run_123',
            status: 'completed',
            executor: 'postgres',
            startedAt: '2026-03-28T10:00:00.000Z',
            completedAt: '2026-03-28T10:00:30.000Z',
            environment: 'dev',
            gitSha: 'abc123def',
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
          },
        })}
      />
    );

    await selectRunDetailTab(harness.container, 'Result');

    expect(harness.container.textContent).toContain('Materialization evidence');
    expect(
      harness.container.querySelector('[data-slot="run-materialization-card"]')
    ).not.toBeNull();
    expect(harness.container.textContent).toContain('Executor');
    expect(harness.container.textContent).toContain('postgres');
    expect(harness.container.textContent).toContain('analytics.orders_daily');
    expect(harness.container.textContent).toContain('42');
  });

  it('loads a bounded current destination sample from persisted materialization evidence', async () => {
    const loadMaterializationSample = vi.fn().mockResolvedValue({
      contractVersion: 1,
      connectionId: 'postgresql-local',
      objectId: 'relation/dvt/public/sink_1',
      columns: [
        { name: 'order_id', type: 'integer', nullable: false },
        { name: 'customer', type: 'text', nullable: true },
      ],
      rows: [{ values: ['1', 'Ada'] }, { values: ['2', null] }],
      limit: 20,
      truncated: true,
      sampledAt: '2026-08-18T10:00:00.000Z',
    });

    await harness.render(
      <RunWorkspaceState
        workspace={buildWorkspace({
          snapshot: {
            runId: 'run_123',
            status: 'completed',
            executor: 'postgres',
            startedAt: '2026-08-18T09:59:00.000Z',
            completedAt: '2026-08-18T10:00:00.000Z',
            environment: 'dev',
            execution: {
              materialization: {
                executor: 'postgres',
                environmentId: 'env-1',
                sinkTable: 'public.sink_1',
                rowsWritten: 118,
                startedAt: '2026-08-18T09:59:30.000Z',
                completedAt: '2026-08-18T10:00:00.000Z',
                durationMs: 30000,
              },
            },
          },
        })}
        loadMaterializationSample={loadMaterializationSample}
      />
    );

    await selectRunDetailTab(harness.container, 'Result');
    expect(loadMaterializationSample).not.toHaveBeenCalled();

    const loadButton = Array.from(harness.container.querySelectorAll('button')).find(
      (button) => button.textContent === 'View result data'
    );
    expect(loadButton).toBeDefined();

    await act(async () => {
      loadButton?.click();
    });

    expect(loadMaterializationSample).toHaveBeenCalledWith('run_123', 20);
    expect(harness.container.textContent).toContain('Current destination sample');
    expect(harness.container.textContent).toContain('Showing 2 of 118 written rows.');
    expect(harness.container.textContent).toContain(
      'This is a current sample of the destination and may differ after later writes.'
    );
    expect(harness.container.textContent).toContain('Only the first 20 rows are shown.');
    expect(harness.container.querySelector('[data-slot="run-result-sample-table"]')).not.toBeNull();
    expect(harness.container.textContent).toContain('order_id');
    expect(harness.container.textContent).toContain('customer');
    expect(harness.container.textContent).toContain('Ada');
    expect(harness.container.textContent).toContain('NULL');
  });

  it('translates a result sample load failure without hiding persisted evidence', async () => {
    setRunStatesLanguage('es');
    const loadMaterializationSample = vi.fn().mockRejectedValue(new Error('transport detail'));

    await harness.render(
      <RunWorkspaceState
        workspace={buildWorkspace({
          snapshot: {
            runId: 'run_123',
            status: 'completed',
            startedAt: '2026-08-18T09:59:00.000Z',
            completedAt: '2026-08-18T10:00:00.000Z',
            execution: {
              materialization: {
                executor: 'postgres',
                environmentId: 'env-1',
                sinkTable: 'public.sink_1',
                rowsWritten: 118,
                startedAt: '2026-08-18T09:59:30.000Z',
                completedAt: '2026-08-18T10:00:00.000Z',
                durationMs: 30000,
              },
            },
          },
        })}
        loadMaterializationSample={loadMaterializationSample}
      />
    );

    await selectRunDetailTab(harness.container, 'Resultado');
    const loadButton = Array.from(harness.container.querySelectorAll('button')).find(
      (button) => button.textContent === 'Ver datos resultantes'
    );

    await act(async () => {
      loadButton?.click();
    });

    expect(harness.container.textContent).toContain('Filas escritas');
    expect(harness.container.textContent).toContain('118');
    expect(harness.container.textContent).toContain(
      'No se pudo cargar la muestra actual del destino.'
    );
    expect(harness.container.textContent).not.toContain('transport detail');
  });

  it('renders failure diagnostics without materialization evidence on failed snapshots', async () => {
    await harness.render(
      <RunWorkspaceState
        workspace={buildWorkspace({
          snapshot: {
            runId: 'run_123',
            status: 'failed',
            executor: 'postgres',
            startedAt: '2026-03-28T10:00:00.000Z',
            completedAt: '2026-03-28T10:00:30.000Z',
            environment: 'dev',
            gitSha: 'abc123def',
            execution: {
              failure: {
                stepId: 'step-transform',
                reason: 'STEP_FAILURE',
                message: 'duplicate key value violates unique constraint',
                failedAt: '2026-03-28T10:00:20.000Z',
              },
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
          },
        })}
      />
    );

    expect(harness.container.textContent).not.toContain('Materialization evidence');
    expect(harness.container.textContent).not.toContain(
      'Result evidence is not available yet for this run snapshot.'
    );
    expect(harness.container.textContent).not.toContain('analytics.orders_daily');
    expect(harness.container.textContent).toContain('Executor');
    expect(harness.container.textContent).toContain('postgres');

    await selectRunDetailTab(harness.container, 'Diagnostics and events');

    expect(harness.container.textContent).toContain('Failure diagnostics');
    expect(harness.container.textContent).toContain('step-transform');
    expect(harness.container.textContent).toContain('STEP_FAILURE');
  });

  it('renders run diagnostics and trace pointers from snapshot fields', async () => {
    await harness.render(
      <RunWorkspaceState
        workspace={buildWorkspace({
          snapshot: {
            runId: 'run_123',
            planId: 'plan_123',
            status: 'failed',
            executor: 'postgres',
            startedAt: '2026-03-28T10:00:00.000Z',
            completedAt: '2026-03-28T10:00:10.000Z',
            environment: 'dev',
            gitSha: 'abc123def',
            diagnostics: {
              runId: 'run_123',
              planId: 'plan_123',
              planSha: 'a'.repeat(64),
              stepId: 'step-load',
              attemptId: '2',
              adapter: 'temporal',
              durationMs: 10000,
              status: 'failed',
              errorCode: 'SINK_WRITE_FAILED',
              pointers: [
                {
                  kind: 'trace',
                  label: 'Trace query',
                  value: 'runId=run_123 planId=plan_123 stepId=step-load attemptId=2',
                },
                {
                  kind: 'log',
                  label: 'Log query',
                  value: 'runId=run_123 planSha=aaaaaaaa',
                },
              ],
            },
          } as RunWorkspaceViewModel['snapshot'],
        })}
      />
    );

    await selectRunDetailTab(harness.container, 'Diagnostics and events');

    expect(harness.container.textContent).toContain('Diagnostics');
    expect(harness.container.querySelector('[data-slot="run-diagnostics-card"]')).not.toBeNull();
    expect(harness.container.textContent).toContain('Trace query');
    expect(harness.container.textContent).toContain('Log query');
    expect(harness.container.textContent).toContain('runId=run_123');
    expect(harness.container.textContent).toContain('step-load');
    expect(harness.container.textContent).toContain('attemptId=2');
    expect(harness.container.textContent).toContain('SINK_WRITE_FAILED');
  });
});
