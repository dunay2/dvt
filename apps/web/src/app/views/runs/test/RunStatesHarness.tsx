// @vitest-environment jsdom

import React, { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router';

import type { RunSummaryItem } from '../../../ports/runs';
import type { RunWorkspaceViewModel } from '../../../services/runs/runWorkspaceModel';
import { iso, stepId } from '../../../testing/contractTestUtils';
import type { RunEvent } from '../../../types/engine';

export function buildSummary(overrides?: Partial<RunSummaryItem>): RunSummaryItem {
  return {
    runId: 'run_123',
    planId: 'plan_123',
    status: 'running',
    environment: 'dev',
    gitSha: 'abc123def',
    startedAt: '2026-03-28T10:00:00.000Z',
    ...overrides,
  };
}

export type RunEventFixture = Partial<{
  eventId: string;
  eventType: RunEvent['eventType'];
  runId: string;
  emittedAt: string;
  tenantId: string;
  projectId: string;
  environmentId: string;
  planId: string;
  planVersion: string;
  engineAttemptId: number;
  logicalAttemptId: number;
  idempotencyKey: string;
  payloadVersion: number;
  stepId: string;
  runSeq: number;
  persistedAt: string;
  payload: unknown;
}>;

function toRunEvent(event: Record<string, unknown>): RunEvent {
  return event as unknown as RunEvent;
}

export function buildRunEvent(overrides: RunEventFixture = {}): RunEvent {
  return toRunEvent({
    eventId: overrides.eventId ?? 'evt-step-started',
    eventType: overrides.eventType ?? 'StepStarted',
    runId: overrides.runId ?? 'run_123',
    emittedAt: iso(overrides.emittedAt ?? '2026-03-28T10:01:00.000Z'),
    tenantId: overrides.tenantId ?? 'tenant-1',
    projectId: overrides.projectId ?? 'project-1',
    environmentId: overrides.environmentId ?? 'env-1',
    planId: overrides.planId ?? 'plan_123',
    planVersion: overrides.planVersion ?? '1.0.0',
    engineAttemptId: overrides.engineAttemptId ?? 1,
    logicalAttemptId: overrides.logicalAttemptId ?? 1,
    idempotencyKey: overrides.idempotencyKey ?? 'id-1',
    payloadVersion: overrides.payloadVersion ?? 1,
    ...(overrides.stepId === undefined
      ? { stepId: stepId('step-1') }
      : { stepId: stepId(overrides.stepId) }),
    runSeq: overrides.runSeq ?? 1,
    persistedAt: iso(overrides.persistedAt ?? overrides.emittedAt ?? '2026-03-28T10:01:00.000Z'),
    ...(overrides.payload === undefined ? {} : { payload: overrides.payload }),
  });
}

export function buildStepStartedEvent(overrides?: RunEventFixture): RunEvent {
  return buildRunEvent(overrides);
}

export function buildWorkspace(
  overrides?: Partial<RunWorkspaceViewModel>,
  timelineOverrides?: Partial<RunWorkspaceViewModel['timeline']>
): RunWorkspaceViewModel {
  const timeline = {
    state: 'available',
    events: [buildStepStartedEvent()],
    ...timelineOverrides,
  } as RunWorkspaceViewModel['timeline'];

  return {
    runId: 'run_123',
    snapshot: {
      runId: 'run_123',
      status: 'running',
      startedAt: '2026-03-28T10:00:00.000Z',
      environment: 'dev',
      gitSha: 'abc123def',
      substatus: 'WAITING_APPROVAL',
      execution: {
        activeStepId: 'step-transform',
      },
    },
    timeline,
    detailState: 'snapshot-plus-events',
    ...overrides,
  };
}

export function createRunStatesHarness(): {
  container: HTMLDivElement;
  render: (ui: ReactNode) => Promise<void>;
  cleanup: () => void;
} {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root: Root = createRoot(container);

  (
    globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;

  return {
    container,
    render: async (ui: ReactNode) => {
      await act(async () => {
        root.render(<MemoryRouter>{ui}</MemoryRouter>);
      });
    },
    cleanup: () => {
      act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
}
