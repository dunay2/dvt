// @vitest-environment jsdom

import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import { mockExecutionPlan } from '../../data/mockDbtData';
import type { IPlansPort } from '../../ports/plans';
import type { IRunsPort } from '../../ports/runs';
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
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
  canonicalNodes,
  canonicalEdges,
  selectedNodeIds = [],
  workspaceNodeIds = canonicalNodes.map((node) => node.id),
}: Readonly<{
  plansService: IPlansPort;
  runsService: IRunsPort;
  currentPlan: typeof mockExecutionPlan | null;
  onRunStarted: (runId: string) => void;
  canonicalNodes: CanonicalNode[];
  canonicalEdges: CanonicalEdge[];
  selectedNodeIds?: string[];
  workspaceNodeIds?: string[];
}>): React.JSX.Element {
  const hook = useCanvasExecutionActions({
    plansService,
    runsService,
    canonicalNodes,
    canonicalEdges,
    selectedNodeIds,
    workspaceNodeIds,
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
      <div data-testid="can-start-run">{String(hook.canStartRun)}</div>
      <div data-testid="plan-status-summary">{hook.planStatusSummary}</div>
      <button
        type="button"
        onClick={() => {
          void hook.handlePlan();
        }}
      >
        plan
      </button>
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
  const canonicalNodes: CanonicalNode[] = [
    {
      id: 'source-node',
      name: 'Source',
      pluginId: 'dvt',
      kind: 'dvt:source',
      role: 'input',
      status: 'idle',
      tags: [],
    },
    {
      id: 'transform-node',
      name: 'Transform',
      pluginId: 'dvt',
      kind: 'dvt:sql_transform',
      role: 'transform',
      status: 'idle',
      tags: [],
    },
    {
      id: 'sink-node',
      name: 'Sink',
      pluginId: 'dvt',
      kind: 'dvt:sink',
      role: 'output',
      status: 'idle',
      tags: [],
    },
  ];
  const canonicalEdges: CanonicalEdge[] = [
    { id: 'edge-1', sourceId: 'source-node', targetId: 'transform-node', relation: 'lineage' },
    { id: 'edge-2', sourceId: 'transform-node', targetId: 'sink-node', relation: 'lineage' },
  ];

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
          canonicalNodes={canonicalNodes}
          canonicalEdges={canonicalEdges}
        />
      );
    });

    const startButton = container.querySelectorAll('button')[1];
    expect(startButton).not.toBeNull();

    await act(async () => {
      startButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(runsService.startRun).not.toHaveBeenCalled();
    expect(onRunStarted).not.toHaveBeenCalled();
    expect(toastErrorMock).toHaveBeenCalledWith('Plan reference is unavailable for this mode');
    expect(container.querySelector('[data-testid="plan-modal-state"]')?.textContent).toBe('true');
  });

  it('does not call previewPlan when the transformation graph is invalid', async () => {
    const plansService: IPlansPort = {
      previewPlan: vi.fn(async () => mockExecutionPlan),
      importPlan: vi.fn(async () => mockExecutionPlan),
    };
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

    await act(async () => {
      root.render(
        <HookHost
          plansService={plansService}
          runsService={runsService}
          currentPlan={null}
          onRunStarted={vi.fn()}
          canonicalNodes={canonicalNodes.slice(0, 2)}
          canonicalEdges={canonicalEdges.slice(0, 1)}
        />
      );
    });

    const planButton = container.querySelectorAll('button')[0];
    expect(planButton).not.toBeNull();

    await act(async () => {
      planButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(plansService.previewPlan).not.toHaveBeenCalled();
    expect(toastErrorMock).toHaveBeenCalledWith(
      'Plan requires exactly 3 nodes: source, sql_transform, and sink.'
    );
  });

  it('calls previewPlan when the transformation graph is valid', async () => {
    const plansService: IPlansPort = {
      previewPlan: vi.fn(async () => mockExecutionPlan),
      importPlan: vi.fn(async () => mockExecutionPlan),
    };
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

    await act(async () => {
      root.render(
        <HookHost
          plansService={plansService}
          runsService={runsService}
          currentPlan={null}
          onRunStarted={vi.fn()}
          canonicalNodes={canonicalNodes}
          canonicalEdges={canonicalEdges}
        />
      );
    });

    const planButton = container.querySelectorAll('button')[0];
    expect(planButton).not.toBeNull();

    await act(async () => {
      planButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(plansService.previewPlan).toHaveBeenCalledTimes(1);
    expect(plansService.previewPlan).toHaveBeenCalledWith(
      expect.objectContaining({
        persist: true,
      })
    );
    expect(toastSuccessMock).toHaveBeenCalledWith('Execution plan created');
    expect(container.querySelector('[data-testid="can-start-run"]')?.textContent).toBe('false');
    expect(container.querySelector('[data-testid="plan-status-summary"]')?.textContent).toBe(
      'Preview required before running.'
    );
  });

  it('blocks startRun when the graph has changed since preview', async () => {
    const plansService: IPlansPort = {
      previewPlan: vi.fn(async () => mockExecutionPlan),
      importPlan: vi.fn(async () => mockExecutionPlan),
    };
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
    const onRunStarted = vi.fn();

    await act(async () => {
      root.render(
        <HookHost
          plansService={plansService}
          runsService={runsService}
          currentPlan={null}
          onRunStarted={onRunStarted}
          canonicalNodes={canonicalNodes}
          canonicalEdges={canonicalEdges}
        />
      );
    });

    await act(async () => {
      container.querySelectorAll('button')[0]?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    await act(async () => {
      root.render(
        <HookHost
          plansService={plansService}
          runsService={runsService}
          currentPlan={mockExecutionPlan}
          onRunStarted={onRunStarted}
          canonicalNodes={canonicalNodes}
          canonicalEdges={canonicalEdges.slice(0, 1)}
        />
      );
    });

    expect(container.querySelector('[data-testid="can-start-run"]')?.textContent).toBe('false');
    expect(container.querySelector('[data-testid="plan-status-summary"]')?.textContent).toBe(
      'Preview is stale. Re-run Plan before starting.'
    );

    await act(async () => {
      container.querySelectorAll('button')[1]?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(runsService.startRun).not.toHaveBeenCalled();
    expect(toastErrorMock).toHaveBeenCalledWith('Preview is stale. Re-run Plan before starting.');
    expect(onRunStarted).not.toHaveBeenCalled();
  });
});
