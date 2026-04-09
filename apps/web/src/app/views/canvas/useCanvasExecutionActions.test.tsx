// @vitest-environment jsdom

import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import { mockExecutionPlan } from '../../data/mockDbtData';
import type { IPlansPort } from '../../ports/plans';
import type { IRunsPort } from '../../ports/runs';
import type { SessionContextPort } from '../../ports/sessionContext';
import type { ShellFeedbackPort } from '../../ports/shellFeedback';
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import { resolvePlanRefForStartRun, useCanvasExecutionActions } from './useCanvasExecutionActions';

function HookHost({
  plansService,
  runsService,
  currentPlan,
  onRunStarted,
  sessionContext,
  shellFeedback,
  canonicalNodes,
  canonicalEdges,
  selectedNodeIds = [],
  workspaceNodeIds = canonicalNodes.map((node) => node.id),
}: Readonly<{
  plansService: IPlansPort;
  runsService: IRunsPort;
  currentPlan: typeof mockExecutionPlan | null;
  onRunStarted: (runId: string) => void;
  sessionContext: SessionContextPort;
  shellFeedback: ShellFeedbackPort;
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
    sessionContext,
    shellFeedback,
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

function buildPersistedPreviewPlan(): typeof mockExecutionPlan {
  const persistedSha = 'c'.repeat(64);

  return {
    ...mockExecutionPlan,
    planRef: {
      ...mockExecutionPlan.planRef!,
      sha256: persistedSha,
    },
    preview: {
      ...mockExecutionPlan.preview,
      persisted: {
        ...mockExecutionPlan.preview?.persisted,
        planRecordId: 'plan-record-abc123',
        canonicalPlanSha256: persistedSha,
      },
    },
  };
}

function StatefulHookHost({
  plansService,
  runsService,
  initialPlan,
  onRunStarted,
  sessionContext,
  shellFeedback,
  canonicalNodes,
  canonicalEdges,
  selectedNodeIds = [],
  workspaceNodeIds = canonicalNodes.map((node) => node.id),
}: Readonly<{
  plansService: IPlansPort;
  runsService: IRunsPort;
  initialPlan: typeof mockExecutionPlan | null;
  onRunStarted: (runId: string) => void;
  sessionContext: SessionContextPort;
  shellFeedback: ShellFeedbackPort;
  canonicalNodes: CanonicalNode[];
  canonicalEdges: CanonicalEdge[];
  selectedNodeIds?: string[];
  workspaceNodeIds?: string[];
}>): React.JSX.Element {
  const [currentPlan, setCurrentPlan] = React.useState<typeof mockExecutionPlan | null>(
    initialPlan
  );
  const hook = useCanvasExecutionActions({
    plansService,
    runsService,
    canonicalNodes,
    canonicalEdges,
    selectedNodeIds,
    workspaceNodeIds,
    canPlan: true,
    canRun: true,
    sessionContext,
    shellFeedback,
    consolePanelVisible: false,
    currentPlan,
    setCurrentPlan,
    setConsolePanelHeight: () => undefined,
    toggleConsolePanel: () => undefined,
    onRunStarted,
  });

  return (
    <div>
      <div data-testid="plan-modal-state">{String(hook.planModalOpen)}</div>
      <div data-testid="can-start-run">{String(hook.canStartRun)}</div>
      <div data-testid="plan-status-summary">{hook.planStatusSummary}</div>
      <div data-testid="current-plan-sha">{currentPlan?.planRef?.sha256 ?? 'none'}</div>
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
  const shellFeedback: ShellFeedbackPort = {
    error: vi.fn(),
    success: vi.fn(),
  };
  const sessionContext: SessionContextPort = {
    getWorkspaceScope: () => ({
      tenantId: 'tenant',
      projectId: 'project',
      environmentId: 'env',
      targetAdapter: 'mock',
    }),
    getWorkspaceScopeSnapshot: () => ({
      tenantId: 'tenant',
      projectId: 'project',
      environmentId: 'env',
      targetAdapter: 'mock',
    }),
    subscribeWorkspaceScope: () => () => undefined,
    buildRunContext: (runId) => ({
      runId,
      tenantId: 'tenant',
      projectId: 'project',
      environmentId: 'env',
      targetAdapter: 'mock',
    }),
  };
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
    vi.mocked(shellFeedback.error).mockReset();
    vi.mocked(shellFeedback.success).mockReset();
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
          sessionContext={sessionContext}
          shellFeedback={shellFeedback}
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
    expect(shellFeedback.error).toHaveBeenCalledWith('Plan reference is unavailable for this mode');
    expect(container.querySelector('[data-testid="plan-modal-state"]')?.textContent).toBe('true');
  });

  it('blocks startRun when preview has no persisted proof', async () => {
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
          currentPlan={{
            ...mockExecutionPlan,
            preview: {
              ...mockExecutionPlan.preview,
              persisted: undefined,
            },
          }}
          onRunStarted={onRunStarted}
          sessionContext={sessionContext}
          shellFeedback={shellFeedback}
          canonicalNodes={canonicalNodes}
          canonicalEdges={canonicalEdges}
        />
      );
    });

    expect(container.querySelector('[data-testid="can-start-run"]')?.textContent).toBe('false');
    expect(container.querySelector('[data-testid="plan-status-summary"]')?.textContent).toBe(
      'Preview is not persisted. Re-run Plan to create a persisted plan.'
    );

    await act(async () => {
      container
        .querySelectorAll('button')[1]
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(runsService.startRun).not.toHaveBeenCalled();
    expect(onRunStarted).not.toHaveBeenCalled();
    expect(shellFeedback.error).toHaveBeenCalledWith(
      'Run start requires a persisted preview plan bound to the current plan reference. Re-run Plan first.'
    );
  });

  it('blocks startRun when persisted proof hash does not match planRef hash', async () => {
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
          currentPlan={{
            ...mockExecutionPlan,
            preview: {
              ...mockExecutionPlan.preview,
              persisted: {
                planRecordId: 'plan-record-mismatch',
                canonicalPlanSha256: 'f'.repeat(64),
              },
            },
          }}
          onRunStarted={onRunStarted}
          sessionContext={sessionContext}
          shellFeedback={shellFeedback}
          canonicalNodes={canonicalNodes}
          canonicalEdges={canonicalEdges}
        />
      );
    });

    expect(container.querySelector('[data-testid="can-start-run"]')?.textContent).toBe('false');
    expect(container.querySelector('[data-testid="plan-status-summary"]')?.textContent).toBe(
      'Preview is not aligned with the active plan reference. Re-run Plan before starting.'
    );

    await act(async () => {
      container
        .querySelectorAll('button')[1]
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(runsService.startRun).not.toHaveBeenCalled();
    expect(onRunStarted).not.toHaveBeenCalled();
    expect(shellFeedback.error).toHaveBeenCalledWith(
      'Run start requires a persisted preview plan bound to the current plan reference. Re-run Plan first.'
    );
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
          sessionContext={sessionContext}
          shellFeedback={shellFeedback}
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
    expect(shellFeedback.error).toHaveBeenCalledWith(
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
          sessionContext={sessionContext}
          shellFeedback={shellFeedback}
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
        previewProfile: 'planner-generic-v1',
        graphSource: expect.objectContaining({
          kind: 'generic-graph-v1',
          sourceFamily: 'canvas-canonical-graph',
          sourceVersion: 'planner-generic-v1',
          nodes: expect.arrayContaining([
            expect.objectContaining({
              nodeId: 'source-node',
              stepKind: 'CANVAS_SOURCE',
              dependsOn: [],
              metadata: expect.objectContaining({
                displayName: 'Source',
                tags: {
                  pluginId: 'dvt',
                  role: 'input',
                  kind: 'dvt:source',
                },
              }),
            }),
            expect.objectContaining({
              nodeId: 'transform-node',
              stepKind: 'CANVAS_TRANSFORM',
              dependsOn: ['source-node'],
              metadata: expect.objectContaining({
                displayName: 'Transform',
                tags: {
                  pluginId: 'dvt',
                  role: 'transform',
                  kind: 'dvt:sql_transform',
                },
              }),
            }),
            expect.objectContaining({
              nodeId: 'sink-node',
              stepKind: 'CANVAS_SINK',
              dependsOn: ['transform-node'],
              metadata: expect.objectContaining({
                displayName: 'Sink',
                tags: {
                  pluginId: 'dvt',
                  role: 'output',
                  kind: 'dvt:sink',
                },
              }),
            }),
          ]),
        }),
        selectedNodeIds: ['source-node', 'transform-node', 'sink-node'],
        context: expect.objectContaining({
          tenantId: 'tenant',
          projectId: 'project',
          environmentId: 'env',
        }),
        persist: true,
      })
    );
    expect(shellFeedback.success).toHaveBeenCalledWith('Execution plan created');
    expect(container.querySelector('[data-testid="can-start-run"]')?.textContent).toBe('false');
    expect(container.querySelector('[data-testid="plan-status-summary"]')?.textContent).toBe(
      'Preview required before running.'
    );
  });

  it('stores a persisted preview result and enables Start Run after a valid plan', async () => {
    const persistedPlan = buildPersistedPreviewPlan();
    const plansService: IPlansPort = {
      previewPlan: vi.fn(async () => persistedPlan),
      importPlan: vi.fn(async () => persistedPlan),
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
        <StatefulHookHost
          plansService={plansService}
          runsService={runsService}
          initialPlan={null}
          onRunStarted={vi.fn()}
          sessionContext={sessionContext}
          shellFeedback={shellFeedback}
          canonicalNodes={canonicalNodes}
          canonicalEdges={canonicalEdges}
        />
      );
    });

    await act(async () => {
      container
        .querySelectorAll('button')[0]
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(plansService.previewPlan).toHaveBeenCalledTimes(1);
    expect(container.querySelector('[data-testid="plan-modal-state"]')?.textContent).toBe('true');
    expect(container.querySelector('[data-testid="current-plan-sha"]')?.textContent).toBe(
      persistedPlan.planRef?.sha256
    );
    expect(container.querySelector('[data-testid="can-start-run"]')?.textContent).toBe('true');
    expect(container.querySelector('[data-testid="plan-status-summary"]')?.textContent).toBe(
      'Preview is current and ready to run.'
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
          sessionContext={sessionContext}
          shellFeedback={shellFeedback}
          canonicalNodes={canonicalNodes}
          canonicalEdges={canonicalEdges}
        />
      );
    });

    await act(async () => {
      container
        .querySelectorAll('button')[0]
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    await act(async () => {
      root.render(
        <HookHost
          plansService={plansService}
          runsService={runsService}
          currentPlan={mockExecutionPlan}
          onRunStarted={onRunStarted}
          sessionContext={sessionContext}
          shellFeedback={shellFeedback}
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
      container
        .querySelectorAll('button')[1]
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(runsService.startRun).not.toHaveBeenCalled();
    expect(shellFeedback.error).toHaveBeenCalledWith(
      'Preview is stale. Re-run Plan before starting.'
    );
    expect(onRunStarted).not.toHaveBeenCalled();
  });

  it('keeps preview current when only raw metadata changes without changing the projected graph source', async () => {
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
          sessionContext={sessionContext}
          shellFeedback={shellFeedback}
          canonicalNodes={canonicalNodes}
          canonicalEdges={canonicalEdges}
        />
      );
    });

    await act(async () => {
      container
        .querySelectorAll('button')[0]
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    const updatedNodes = canonicalNodes.map((node) =>
      node.id === 'transform-node'
        ? {
            ...node,
            metadata: { uiHint: 'changed' },
          }
        : node
    );

    await act(async () => {
      root.render(
        <HookHost
          plansService={plansService}
          runsService={runsService}
          currentPlan={{
            ...mockExecutionPlan,
            planRef: {
              ...mockExecutionPlan.planRef!,
              sha256: 'c'.repeat(64),
            },
          }}
          onRunStarted={onRunStarted}
          sessionContext={sessionContext}
          shellFeedback={shellFeedback}
          canonicalNodes={updatedNodes}
          canonicalEdges={canonicalEdges}
        />
      );
    });

    expect(container.querySelector('[data-testid="can-start-run"]')?.textContent).toBe('true');
    expect(container.querySelector('[data-testid="plan-status-summary"]')?.textContent).toBe(
      'Preview is current and ready to run.'
    );

    await act(async () => {
      container
        .querySelectorAll('button')[0]
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(plansService.previewPlan).toHaveBeenCalledTimes(2);
    expect(vi.mocked(plansService.previewPlan).mock.calls[1]?.[0]).toEqual(
      expect.objectContaining({
        graphSource: {
          kind: 'generic-graph-v1',
          sourceFamily: 'canvas-canonical-graph',
          sourceVersion: 'planner-generic-v1',
          nodes: expect.arrayContaining([
            expect.objectContaining({
              nodeId: 'transform-node',
              stepKind: 'CANVAS_TRANSFORM',
            }),
          ]),
        },
      })
    );
  });

  it('marks preview stale and rebuilds payload when node kind changes without id changes', async () => {
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
          sessionContext={sessionContext}
          shellFeedback={shellFeedback}
          canonicalNodes={canonicalNodes}
          canonicalEdges={canonicalEdges}
        />
      );
    });

    await act(async () => {
      container
        .querySelectorAll('button')[0]
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    const updatedNodes = canonicalNodes.map((node) =>
      node.id === 'transform-node'
        ? {
            ...node,
            pluginId: 'dbt',
            kind: 'dbt:model' as const,
            name: 'Transform renamed',
            path: 'models/transform.sql',
          }
        : node
    );

    await act(async () => {
      root.render(
        <HookHost
          plansService={plansService}
          runsService={runsService}
          currentPlan={mockExecutionPlan}
          onRunStarted={onRunStarted}
          sessionContext={sessionContext}
          shellFeedback={shellFeedback}
          canonicalNodes={updatedNodes}
          canonicalEdges={canonicalEdges}
        />
      );
    });

    expect(container.querySelector('[data-testid="can-start-run"]')?.textContent).toBe('false');
    expect(container.querySelector('[data-testid="plan-status-summary"]')?.textContent).toBe(
      'Preview is stale. Re-run Plan before starting.'
    );

    await act(async () => {
      container
        .querySelectorAll('button')[0]
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(plansService.previewPlan).toHaveBeenCalledTimes(2);
    expect(vi.mocked(plansService.previewPlan).mock.calls[1]?.[0]).toEqual(
      expect.objectContaining({
        graphSource: {
          kind: 'generic-graph-v1',
          sourceFamily: 'canvas-canonical-graph',
          sourceVersion: 'planner-generic-v1',
          nodes: expect.arrayContaining([
            expect.objectContaining({
              nodeId: 'transform-node',
              stepKind: 'DBT_MODEL',
              metadata: expect.objectContaining({
                displayName: 'Transform renamed',
                sourceRef: 'models/transform.sql',
              }),
            }),
          ]),
        },
      })
    );
  });

  it('starts run with persisted plan and forwards run id to navigation', async () => {
    const plansService: IPlansPort = {
      previewPlan: vi.fn(async () => mockExecutionPlan),
      importPlan: vi.fn(async () => mockExecutionPlan),
    };
    const runsService: IRunsPort = {
      listRunSummaries: vi.fn(async () => []),
      getRunSnapshot: vi.fn(async () => null),
      startRun: vi.fn(async () => ({
        provider: 'mock' as const,
        runId: 'run-success',
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
          currentPlan={{
            ...mockExecutionPlan,
            planRef: {
              ...mockExecutionPlan.planRef!,
              sha256: 'c'.repeat(64),
            },
          }}
          onRunStarted={onRunStarted}
          sessionContext={sessionContext}
          shellFeedback={shellFeedback}
          canonicalNodes={canonicalNodes}
          canonicalEdges={canonicalEdges}
        />
      );
    });

    expect(container.querySelector('[data-testid="can-start-run"]')?.textContent).toBe('true');
    expect(container.querySelector('[data-testid="plan-status-summary"]')?.textContent).toBe(
      'Preview is current and ready to run.'
    );

    await act(async () => {
      container
        .querySelectorAll('button')[1]
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(runsService.startRun).toHaveBeenCalledTimes(1);
    expect(runsService.startRun).toHaveBeenCalledWith(
      expect.objectContaining({
        planRef: {
          ...mockExecutionPlan.planRef,
          sha256: 'c'.repeat(64),
        },
      })
    );
    expect(shellFeedback.success).toHaveBeenCalledWith('Run started');
    expect(onRunStarted).toHaveBeenCalledWith('run-success');
  });
});
