// @vitest-environment jsdom

import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import { mockExecutionPlan } from '../../data/mockDbtData';
import type { IPlansPort } from '../../ports/plans';
import type { IRunsPort } from '../../ports/runs';
import { resolvePlanRefForStartRun, useCanvasExecutionActions } from './useCanvasExecutionActions';

const mockBuildSessionRunContext = vi.fn(() => ({
  runId: 'run_ui_test',
  tenantId: 'tenant',
  projectId: 'project',
  environmentId: 'env',
  targetAdapter: 'mock' as const,
}));

vi.mock('../../services/plans/plansService', () => ({
  buildSessionRunContext: () => mockBuildSessionRunContext(),
}));

const toastErrorMock = vi.fn();
const toastSuccessMock = vi.fn();

vi.mock('sonner', () => ({
  toast: {
    error: (...args: unknown[]) => toastErrorMock(...args),
    success: (...args: unknown[]) => toastSuccessMock(...args),
  },
}));

function HookHost({
  plansService,
  runsService,
  currentPlan,
  onRunStarted,
}: Readonly<{
  plansService: IPlansPort;
  runsService: IRunsPort;
  currentPlan: typeof mockExecutionPlan | null;
  onRunStarted: (runId: string) => void;
}>): React.JSX.Element {
  const hook = useCanvasExecutionActions({
    plansService,
    runsService,
    selectedNodeIds: [],
    workspaceNodeIds: [],
    canPlan: true,
    canRun: true,
    consolePanelVisible: false,
    currentPlan,
    setCurrentPlan: () => undefined,
    setConsolePanelHeight: () => undefined,
    toggleConsolePanel: () => undefined,
    onRunStarted,
  });

  return (
    <div>
      <div data-testid="plan-modal-state">{String(hook.planModalOpen)}</div>
      <button
        type="button"
        onClick={() => {
          void hook.handleStartRun();
        }}
      >
        start-run
      </button>
    </div>
  );
}

describe('resolvePlanRefForStartRun', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    toastErrorMock.mockReset();
    toastSuccessMock.mockReset();
    mockBuildSessionRunContext.mockClear();
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it('returns planRef from the execution plan when available', () => {
    const planRef = resolvePlanRefForStartRun(mockExecutionPlan);

    expect(planRef).toEqual(mockExecutionPlan.planRef);
  });

  it('returns null when planRef is missing', () => {
    const planRef = resolvePlanRefForStartRun({
      ...mockExecutionPlan,
      planRef: undefined,
    });

    expect(planRef).toBeNull();
  });

  it('does not call startRun and reopens the modal when planRef is missing', async () => {
    const runsService: IRunsPort = {
      listRunSummaries: vi.fn(async () => []),
      getRunSnapshot: vi.fn(async () => null),
      startRun: vi.fn(async () => ({
        provider: 'mock' as const,
        runId: 'run',
        tenantId: 't',
        workflowId: 'w',
      })),
      listRunEvents: vi.fn(async () => ({ events: [] })),
    };
    const plansService: IPlansPort = {
      previewPlan: vi.fn(async () => mockExecutionPlan),
      importPlan: vi.fn(async () => mockExecutionPlan),
    };
    const onRunStarted = vi.fn();

    await act(async () => {
      root.render(
        <HookHost
          plansService={plansService}
          runsService={runsService}
          currentPlan={{ ...mockExecutionPlan, planRef: undefined }}
          onRunStarted={onRunStarted}
        />
      );
    });

    const startButton = container.querySelector('button');
    expect(startButton).not.toBeNull();

    await act(async () => {
      startButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(runsService.startRun).not.toHaveBeenCalled();
    expect(onRunStarted).not.toHaveBeenCalled();
    expect(toastErrorMock).toHaveBeenCalledWith('Plan reference is unavailable for this mode');
    expect(container.querySelector('[data-testid="plan-modal-state"]')?.textContent).toBe('true');
  });
});
