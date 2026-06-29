// @vitest-environment jsdom

import { createAppServicesTestOverrides } from '../../../testing/appServicesTestDoubles';
import { asIsoUtcString, asNonBlankString, asStepId, type EventEnvelope } from '@dvt/contracts';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { IRunsPort, RunSnapshot, RunSummaryItem } from '../../ports/runs';
import { AppServicesProvider } from '../../services/AppServicesContext';
import type { CanonicalNode } from '../../types/canonical';
import { dbtGraphNodeCardStrategy } from './dbtGraphNodeCardStrategy';
import { DbtNodeRenderer, dbtInspectorPanels } from './DbtNodeRenderer';

describe('DbtNodeRenderer history panel', () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;

  const buildNode = (overrides: Partial<CanonicalNode> = {}): CanonicalNode => ({
    id: 'model_orders',
    name: 'Orders model',
    pluginId: 'dbt',
    kind: 'dbt:model',
    role: 'transform',
    status: 'success',
    tags: [],
    metadata: {},
    ...overrides,
  });

  const buildSnapshot = (runId: string): RunSnapshot => ({
    runId,
    status: 'completed',
    startedAt: '2026-06-01T10:00:00Z',
    completedAt: '2026-06-01T10:01:00Z',
  });

  const buildRunSummary = (runId: string): RunSummaryItem => ({
    runId,
    status: 'completed',
    startedAt: '2026-06-01T10:00:00Z',
    completedAt: '2026-06-01T10:01:00Z',
  });

  const buildRunEvent = (
    overrides: Partial<EventEnvelope> & {
      eventId: string;
      eventType: EventEnvelope['eventType'];
      runSeq: number;
    }
  ): EventEnvelope => ({
    eventId: overrides.eventId,
    eventType: overrides.eventType,
    runId: overrides.runId ?? 'run-live',
    emittedAt: overrides.emittedAt ?? asIsoUtcString('2026-06-01T10:00:30.000Z'),
    tenantId: overrides.tenantId ?? asNonBlankString('tenant-1'),
    projectId: overrides.projectId ?? asNonBlankString('project-1'),
    environmentId: overrides.environmentId ?? asNonBlankString('env-1'),
    planId: overrides.planId ?? 'plan-1',
    planVersion: overrides.planVersion ?? '1.0',
    engineAttemptId: overrides.engineAttemptId ?? 1,
    logicalAttemptId: overrides.logicalAttemptId ?? 1,
    idempotencyKey: overrides.idempotencyKey ?? overrides.eventId,
    payloadVersion: 1,
    stepId: overrides.stepId ?? asStepId('step_model_orders'),
    payload: overrides.payload,
    runSeq: overrides.runSeq,
    persistedAt: overrides.persistedAt ?? asIsoUtcString('2026-06-01T10:00:31.000Z'),
  });

  const buildRunsService = (overrides: Partial<IRunsPort> = {}): IRunsPort => ({
    listRunSummaries: vi.fn(async () => []),
    getRunSnapshot: vi.fn(async (runId) => buildSnapshot(runId)),
    startRun: vi.fn(async () => ({
      runId: 'run-created',
      accepted: true,
    })),
    listRunEvents: vi.fn(async () => ({ events: [] })),
    ...overrides,
  });

  const waitForText = async (text: string): Promise<void> => {
    for (let attempt = 0; attempt < 30; attempt += 1) {
      if (document.body.textContent?.includes(text)) {
        return;
      }

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });
    }

    throw new Error(`Timed out waiting for text: ${text}\nDOM: ${document.body.textContent ?? ''}`);
  };

  afterEach(() => {
    const mountedRoot = root;
    if (mountedRoot) {
      act(() => {
        mountedRoot.unmount();
      });
    }
    container?.remove();
    container = null;
    root = null;
  });

  async function renderHistoryPanel(args: {
    runsService: IRunsPort;
    activeRunId: string | null;
    node?: CanonicalNode;
  }): Promise<void> {
    const historyPanel = dbtInspectorPanels.find((panel) => panel.id === 'dbt.history');
    expect(historyPanel).toBeDefined();
    if (!historyPanel) {
      throw new Error('EXPECTED_DBT_HISTORY_PANEL');
    }
    const HistoryPanel = historyPanel.component;

    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    (
      globalThis as typeof globalThis & {
        IS_REACT_ACT_ENVIRONMENT?: boolean;
      }
    ).IS_REACT_ACT_ENVIRONMENT = true;

    await act(async () => {
      root?.render(
        <QueryClientProvider
          client={
            new QueryClient({
              defaultOptions: {
                queries: {
                  retry: false,
                },
              },
            })
          }
        >
          <AppServicesProvider
            overrides={{ ...createAppServicesTestOverrides(), runsService: args.runsService }}
          >
            <HistoryPanel
              node={args.node ?? buildNode()}
              activeRunId={args.activeRunId}
              onClose={vi.fn()}
            />
          </AppServicesProvider>
        </QueryClientProvider>
      );
    });
  }

  it('renders dbt card metrics through the shared graph node card read model', async () => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    (
      globalThis as typeof globalThis & {
        IS_REACT_ACT_ENVIRONMENT?: boolean;
      }
    ).IS_REACT_ACT_ENVIRONMENT = true;

    await act(async () => {
      root?.render(
        <DbtNodeRenderer
          node={buildNode({
            name: 'fct_orders',
            metadata: {
              package: 'analytics',
              dependencies: ['source.raw.orders', 'ref.stg_customers'],
              config: {
                materialized: 'incremental',
              },
              columns: [{ name: 'order_id', type: 'integer' }],
            },
          })}
          selected={false}
          hovered={false}
          overlayDecoration={null}
          badges={[]}
          graphNodeCardStrategies={[dbtGraphNodeCardStrategy]}
          data={{}}
        />
      );
    });

    expect(document.body.textContent).toContain('fct_orders');
    expect(document.body.textContent).toContain('analytics');
    expect(document.body.textContent).toContain('Mat.');
    expect(document.body.textContent).toContain('Deps');
    expect(document.body.textContent).toContain('Columns');
    expect(document.querySelector('[title="Mat."]')?.textContent).toBe('incremental');
    expect(document.querySelector('[title="Deps"]')?.textContent).toBe('2');
    expect(document.querySelector('[title="Columns"]')?.textContent).toBe('1');
  });

  it('routes the card play affordance through execution selection', async () => {
    const toggleNodeSelection = vi.fn();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    (
      globalThis as typeof globalThis & {
        IS_REACT_ACT_ENVIRONMENT?: boolean;
      }
    ).IS_REACT_ACT_ENVIRONMENT = true;

    await act(async () => {
      root?.render(
        <DbtNodeRenderer
          node={buildNode({ id: 'model_orders', name: 'fct_orders' })}
          selected={false}
          hovered={false}
          overlayDecoration={null}
          badges={[]}
          graphNodeCardStrategies={[dbtGraphNodeCardStrategy]}
          data={{
            selectedForExecution: false,
            onToggleNodeSelection: toggleNodeSelection,
          }}
        />
      );
    });

    const playButton = container.querySelector('button[aria-label="Select for execution"]');
    expect(playButton).not.toBeNull();

    await act(async () => {
      playButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(toggleNodeSelection).toHaveBeenCalledWith('model_orders', true);
  });

  it('renders node-scoped runtime events for the active run', async () => {
    const runsService = buildRunsService({
      listRunEvents: vi.fn(async () => ({
        events: [
          buildRunEvent({
            eventId: 'event-step-started',
            eventType: 'StepStarted',
            stepId: asStepId('model_orders'),
            runSeq: 1,
            payload: {
              message: 'Started model_orders',
            },
          }),
          buildRunEvent({
            eventId: 'event-other-node',
            eventType: 'StepCompleted',
            stepId: asStepId('model_payments'),
            runSeq: 2,
            payload: {
              message: 'Other node finished',
            },
          }),
        ],
      })),
    });

    await renderHistoryPanel({ runsService, activeRunId: 'run-live' });

    await waitForText('Started model_orders');
    expect(document.body.textContent).toContain('Step started');
    expect(document.body.textContent).not.toContain('Other node finished');
    expect(document.body.textContent).not.toContain(
      'Detailed node history is unavailable from the current runtime contract baseline.'
    );
    expect(runsService.listRunEvents).toHaveBeenCalledWith('run-live');
  });

  it('matches runtime history events by canonical step id when payload node id is absent', async () => {
    const runsService = buildRunsService({
      listRunEvents: vi.fn(async () => ({
        events: [
          buildRunEvent({
            eventId: 'event-contract-step-started',
            eventType: 'StepStarted',
            runSeq: 1,
            stepId: asStepId('model_orders'),
            payload: {
              message: 'Contract step started model_orders',
            },
          }),
          buildRunEvent({
            eventId: 'event-contract-other-step',
            eventType: 'StepCompleted',
            runSeq: 2,
            stepId: asStepId('model_payments'),
            payload: {
              message: 'Other contract step finished',
            },
          }),
        ],
      })),
    });

    await renderHistoryPanel({ runsService, activeRunId: 'run-live' });

    await waitForText('Contract step started model_orders');
    expect(document.body.textContent).toContain('Step started');
    expect(document.body.textContent).not.toContain('Other contract step finished');
  });

  it('uses the latest scoped run when no active run is selected', async () => {
    const runsService = buildRunsService({
      listRunSummaries: vi.fn(async () => [buildRunSummary('run-latest')]),
      listRunEvents: vi.fn(async (runId) => ({
        events: [
          buildRunEvent({
            eventId: 'event-latest-node',
            eventType: 'StepCompleted',
            runId,
            stepId: asStepId('model_orders'),
            runSeq: 1,
            payload: {
              message: 'Latest run completed model_orders',
            },
          }),
        ],
      })),
    });

    await renderHistoryPanel({ runsService, activeRunId: null });

    await waitForText('Latest run completed model_orders');
    expect(runsService.listRunEvents).toHaveBeenCalledWith('run-latest');
  });

  it('shows an actionable degraded state when runtime events cannot be loaded', async () => {
    const runsService = buildRunsService({
      listRunEvents: vi.fn(async () => {
        throw new Error('events unavailable');
      }),
    });

    await renderHistoryPanel({ runsService, activeRunId: 'run-live' });

    await waitForText('Runtime event detail could not be loaded for this node.');
  });
});
