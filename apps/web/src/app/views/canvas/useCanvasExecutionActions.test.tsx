// @vitest-environment jsdom

import { sha256HexUtf8 } from '@dvt/contracts';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import { mockExecutionPlan } from '../../data/mockDbtData';
import type { IPlansPort } from '../../ports/plans';
import type { IRunsPort } from '../../ports/runs';
import type { SessionContextPort } from '../../ports/sessionContext';
import type { ShellFeedbackPort } from '../../ports/shellFeedback';
import type { IWorkspacePort } from '../../ports/workspace';
import type { WorkspaceBootstrapConfig } from '../../services/config/workspaceConfig';
import { makeMockRunRef, makeRunContext, nb } from '../../testing/contractTestUtils';
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import type { PlanViewModel } from '../../types/plans';
import { buildPreviewDesignGraphArtifactContent } from './previewGraphSource';
import { resolvePlanRefForStartRun, useCanvasExecutionActions } from './useCanvasExecutionActions';

type PreviewProvenanceConfig = Pick<
  WorkspaceBootstrapConfig,
  'gitBranch' | 'gitSha' | 'gitRepo' | 'graphArtifactPath'
>;

const DEFAULT_PREVIEW_PROVENANCE_CONFIG: PreviewProvenanceConfig = {
  gitBranch: 'main',
  gitSha: 'local',
  gitRepo: 'dunay2/dvt',
  graphArtifactPath: 'pipelines/sales_pipeline.yaml',
} as const;

function createWorkspaceServiceMock(
  fileContents: Readonly<Record<string, string>> = {
    'pipelines/sales_pipeline.yaml': 'name: sales_pipeline\nsteps: []',
    'models/transform.sql': 'select * from analytics.orders',
  }
): IWorkspacePort {
  return {
    getGraphSnapshot: vi.fn(async () => ({ nodes: [], edges: [] })),
    getGraphDraft: vi.fn(async () => null),
    saveGraphDraft: vi.fn(async () => ({
      outcome: 'saved' as const,
      record: {
        revision: 'rev-1',
        savedAt: '2026-04-08T00:00:00Z',
        draft: {
          nodeIds: [],
          nodePositions: {},
          edges: [],
        },
      },
    })),
    getDiffChanges: vi.fn(async () => []),
    getPlugins: vi.fn(async () => []),
    getRoles: vi.fn(async () => []),
    getAuditLog: vi.fn(async () => []),
    listWarehouseConnections: vi.fn(async () => []),
    listWarehouseTables: vi.fn(async () => []),
    importSources: vi.fn(async () => ({
      success: true as const,
      sourcesCreated: 0,
      tablesImported: 0,
      yamlFiles: [],
      grouping: 'schema' as const,
      options: {
        includeColumns: false,
        addTests: false,
        addFreshness: false,
      },
    })),
    listFiles: vi.fn(async () => []),
    getFileContent: vi.fn(async (path: string) => {
      const content = fileContents[path];
      if (content === undefined) {
        throw new Error(`Workspace file not found: ${path}`);
      }
      return {
        path,
        name: path.split('/').at(-1) ?? path,
        language: path.endsWith('.sql') ? 'sql' : 'yaml',
        content,
        lastModified: '2026-04-08T00:00:00Z',
      };
    }),
    saveFileContent: vi.fn(async (path: string, content: string) => ({
      path,
      name: path.split('/').at(-1) ?? path,
      language: path.endsWith('.sql') ? 'sql' : 'yaml',
      content,
      lastModified: '2026-04-08T00:00:00Z',
    })),
  };
}

function HookHost({
  plansService,
  runsService,
  currentPlan,
  onRunStarted,
  sessionContext,
  shellFeedback,
  workspaceService = createWorkspaceServiceMock(),
  previewProvenanceConfig = DEFAULT_PREVIEW_PROVENANCE_CONFIG,
  canonicalNodes,
  canonicalEdges,
  selectedNodeIds = [],
  workspaceNodeIds = canonicalNodes.map((node) => node.id),
  canPlan = true,
  canRun = true,
}: Readonly<{
  plansService: IPlansPort;
  runsService: IRunsPort;
  currentPlan: PlanViewModel | null;
  onRunStarted: (runId: string) => void;
  sessionContext: SessionContextPort;
  shellFeedback: ShellFeedbackPort;
  workspaceService?: IWorkspacePort;
  previewProvenanceConfig?: PreviewProvenanceConfig;
  canonicalNodes: CanonicalNode[];
  canonicalEdges: CanonicalEdge[];
  selectedNodeIds?: string[];
  workspaceNodeIds?: string[];
  canPlan?: boolean;
  canRun?: boolean;
}>): React.JSX.Element {
  const hook = useCanvasExecutionActions({
    plansService,
    runsService,
    workspaceService,
    canonicalNodes,
    canonicalEdges,
    selectedNodeIds,
    workspaceNodeIds,
    canPlan,
    canRun,
    sessionContext,
    shellFeedback,
    previewProvenanceConfig,
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

function buildPersistedPreviewPlan(): PlanViewModel {
  const persistedSha = 'c'.repeat(64);

  return {
    ...mockExecutionPlan,
    planRef: {
      ...mockExecutionPlan.planRef!,
      sha256: nb(persistedSha),
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

function createPlansServiceMock(plan: PlanViewModel = mockExecutionPlan): IPlansPort {
  return {
    previewPlan: vi.fn(async () => plan),
    importPlan: vi.fn(async () => plan),
  };
}

function createRunsServiceMock(overrides: Partial<IRunsPort> = {}): IRunsPort {
  return {
    listRunSummaries: vi.fn(async () => []),
    getRunSnapshot: vi.fn(async () => null),
    startRun: vi.fn(async () =>
      makeMockRunRef({
        tenantId: 't',
        workflowId: 'w',
        runId: 'run',
      })
    ),
    listRunEvents: vi.fn(async () => ({ events: [] })),
    ...overrides,
  };
}

function StatefulHookHost({
  plansService,
  runsService,
  initialPlan,
  onRunStarted,
  sessionContext,
  shellFeedback,
  workspaceService = createWorkspaceServiceMock(),
  previewProvenanceConfig = DEFAULT_PREVIEW_PROVENANCE_CONFIG,
  canonicalNodes,
  canonicalEdges,
  selectedNodeIds = [],
  workspaceNodeIds = canonicalNodes.map((node) => node.id),
  canPlan = true,
  canRun = true,
}: Readonly<{
  plansService: IPlansPort;
  runsService: IRunsPort;
  initialPlan: PlanViewModel | null;
  onRunStarted: (runId: string) => void;
  sessionContext: SessionContextPort;
  shellFeedback: ShellFeedbackPort;
  workspaceService?: IWorkspacePort;
  previewProvenanceConfig?: PreviewProvenanceConfig;
  canonicalNodes: CanonicalNode[];
  canonicalEdges: CanonicalEdge[];
  selectedNodeIds?: string[];
  workspaceNodeIds?: string[];
  canPlan?: boolean;
  canRun?: boolean;
}>): React.JSX.Element {
  const [currentPlan, setCurrentPlan] = React.useState<PlanViewModel | null>(initialPlan);
  const hook = useCanvasExecutionActions({
    plansService,
    runsService,
    workspaceService,
    canonicalNodes,
    canonicalEdges,
    selectedNodeIds,
    workspaceNodeIds,
    canPlan,
    canRun,
    sessionContext,
    shellFeedback,
    previewProvenanceConfig,
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
    buildRunContext: (runId) =>
      makeRunContext(runId, {
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
      metadata: {
        config: {
          schema: 'raw',
          table: 'orders',
          alias: 'orders',
        },
      },
    },
    {
      id: 'transform-node',
      name: 'Transform',
      pluginId: 'dvt',
      kind: 'dvt:sql_transform',
      path: 'models/transform.sql',
      role: 'transform',
      status: 'idle',
      tags: [],
      metadata: {
        config: {
          dialect: 'postgres',
        },
      },
    },
    {
      id: 'sink-node',
      name: 'Sink',
      pluginId: 'dvt',
      kind: 'dvt:sink',
      role: 'output',
      status: 'idle',
      tags: [],
      metadata: {
        config: {
          schema: 'analytics',
          table: 'orders_dashboard',
          materialization: 'table',
          writeMode: 'replace',
        },
      },
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
    const runsService = createRunsServiceMock();
    const plansService = createPlansServiceMock();
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
    const runsService = createRunsServiceMock();
    const plansService = createPlansServiceMock();
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

  it('keeps startRun unavailable when route permissions block run execution', async () => {
    const runsService = createRunsServiceMock();
    const plansService = createPlansServiceMock();

    await act(async () => {
      root.render(
        <HookHost
          plansService={plansService}
          runsService={runsService}
          currentPlan={{
            ...mockExecutionPlan,
            planRef: {
              ...mockExecutionPlan.planRef!,
              sha256: nb('c'.repeat(64)),
            },
          }}
          canRun={false}
          onRunStarted={vi.fn()}
          sessionContext={sessionContext}
          shellFeedback={shellFeedback}
          canonicalNodes={canonicalNodes}
          canonicalEdges={canonicalEdges}
        />
      );
    });

    expect(container.querySelector('[data-testid="can-start-run"]')?.textContent).toBe('false');
    expect(container.querySelector('[data-testid="plan-status-summary"]')?.textContent).toBe(
      'Run start is unavailable in this context.'
    );

    await act(async () => {
      container
        .querySelectorAll('button')[1]
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(runsService.startRun).not.toHaveBeenCalled();
    expect(shellFeedback.error).toHaveBeenCalledWith('You do not have permission to start runs');
  });

  it('blocks startRun when persisted proof hash does not match planRef hash', async () => {
    const runsService = createRunsServiceMock();
    const plansService = createPlansServiceMock();
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
    const plansService = createPlansServiceMock();
    const runsService = createRunsServiceMock();

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
    const plansService = createPlansServiceMock();
    const runsService = createRunsServiceMock();

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
        previewProfile: 'transformation-sql-first-v1',
        graphSource: expect.objectContaining({
          kind: 'generic-graph-v1',
          sourceFamily: 'transformation-design-graph',
          sourceVersion: 'transformation-sql-first-v1',
          nodes: expect.arrayContaining([
            expect.objectContaining({
              nodeId: 'source-node',
              stepKind: 'PREPARE_POSTGRES_TRANSFORM',
              dependsOn: [],
              stepTypeConfig: expect.objectContaining({
                targetSchema: 'analytics',
                sourceSchema: 'raw',
                sourceTable: 'orders',
                sourceAlias: 'orders',
              }),
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
              stepKind: 'POSTGRES_SQL_TRANSFORM',
              dependsOn: ['source-node'],
              stepTypeConfig: expect.objectContaining({
                dialect: 'postgres',
                entrypoint: 'models/transform.sql',
                sinkSchema: 'analytics',
                sinkTable: 'orders_dashboard',
                sql: 'select * from analytics.orders',
                writeMode: 'replace',
              }),
              metadata: expect.objectContaining({
                displayName: 'Transform',
                sourceRef: 'models/transform.sql',
                tags: {
                  pluginId: 'dvt',
                  role: 'transform',
                  kind: 'dvt:sql_transform',
                },
              }),
            }),
            expect.objectContaining({
              nodeId: 'sink-node',
              stepKind: 'CAPTURE_MATERIALIZATION_EVIDENCE',
              dependsOn: ['transform-node'],
              stepTypeConfig: expect.objectContaining({
                sinkSchema: 'analytics',
                sinkTable: 'orders_dashboard',
                materialization: 'table',
                writeMode: 'replace',
              }),
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
        provenance: expect.objectContaining({
          graphArtifact: expect.objectContaining({
            path: 'pipelines/sales_pipeline.yaml',
          }),
          sqlArtifact: expect.objectContaining({
            path: 'models/transform.sql',
          }),
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

  it('plans against the selected transformation subgraph within a larger canvas', async () => {
    const plansService = createPlansServiceMock();
    const runsService = createRunsServiceMock();
    const qualityNode: CanonicalNode = {
      id: 'quality-node',
      name: 'Quality check',
      pluginId: 'dvt',
      kind: 'dvt:test',
      role: 'check',
      status: 'idle',
      tags: [],
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
          canonicalNodes={[...canonicalNodes, qualityNode]}
          canonicalEdges={[
            ...canonicalEdges,
            {
              id: 'edge-3',
              sourceId: 'sink-node',
              targetId: 'quality-node',
              relation: 'lineage',
            },
          ]}
          selectedNodeIds={['source-node', 'transform-node', 'sink-node']}
          workspaceNodeIds={['source-node', 'transform-node', 'sink-node', 'quality-node']}
        />
      );
    });

    await act(async () => {
      container
        .querySelectorAll('button')[0]
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(plansService.previewPlan).toHaveBeenCalledTimes(1);
    expect(plansService.previewPlan).toHaveBeenCalledWith(
      expect.objectContaining({
        selectedNodeIds: ['source-node', 'transform-node', 'sink-node'],
        graphSource: expect.objectContaining({
          nodes: expect.arrayContaining([
            expect.objectContaining({ nodeId: 'source-node' }),
            expect.objectContaining({ nodeId: 'transform-node' }),
            expect.objectContaining({ nodeId: 'sink-node' }),
          ]),
        }),
      })
    );
    expect(shellFeedback.success).toHaveBeenCalledWith('Execution plan created');
  });

  it('stores a persisted preview result and enables Start Run after a valid plan', async () => {
    const persistedPlan = buildPersistedPreviewPlan();
    const plansService = createPlansServiceMock(persistedPlan);
    const runsService = createRunsServiceMock();

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
    const plansService = createPlansServiceMock();
    const runsService = createRunsServiceMock();
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
    const plansService = createPlansServiceMock();
    const runsService = createRunsServiceMock();
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
              sha256: nb('c'.repeat(64)),
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
          sourceFamily: 'transformation-design-graph',
          sourceVersion: 'transformation-sql-first-v1',
          nodes: expect.arrayContaining([
            expect.objectContaining({
              nodeId: 'transform-node',
              stepKind: 'POSTGRES_SQL_TRANSFORM',
            }),
          ]),
        },
      })
    );
  });

  it('marks preview stale and rebuilds payload when node kind changes without id changes', async () => {
    const plansService = createPlansServiceMock();
    const runsService = createRunsServiceMock();
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
          sourceFamily: 'transformation-design-graph',
          sourceVersion: 'transformation-sql-first-v1',
          nodes: expect.arrayContaining([
            expect.objectContaining({
              nodeId: 'transform-node',
              stepKind: 'POSTGRES_SQL_TRANSFORM',
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

  it('adds preview provenance for temporal targets when workspace files resolve', async () => {
    const plansService = createPlansServiceMock();
    const runsService = createRunsServiceMock();
    const workspaceService = createWorkspaceServiceMock({
      'pipelines/sales_pipeline.yaml': 'name: sales_pipeline\nsteps: []',
      'models/transform.sql': 'select * from analytics.orders',
    });
    const temporalSessionContext: SessionContextPort = {
      ...sessionContext,
      getWorkspaceScope: () => ({
        tenantId: 'tenant',
        projectId: 'project',
        environmentId: 'env',
        targetAdapter: 'temporal',
      }),
      getWorkspaceScopeSnapshot: () => ({
        tenantId: 'tenant',
        projectId: 'project',
        environmentId: 'env',
        targetAdapter: 'temporal',
      }),
      buildRunContext: (runId) =>
        makeRunContext(runId, {
          tenantId: 'tenant',
          projectId: 'project',
          environmentId: 'env',
          targetAdapter: 'temporal',
        }),
    };
    const nodesWithTransformPath = canonicalNodes.map((node) =>
      node.id === 'transform-node' ? { ...node, path: 'models/transform.sql' } : node
    );

    await act(async () => {
      root.render(
        <HookHost
          plansService={plansService}
          runsService={runsService}
          workspaceService={workspaceService}
          currentPlan={null}
          onRunStarted={vi.fn()}
          sessionContext={temporalSessionContext}
          shellFeedback={shellFeedback}
          canonicalNodes={nodesWithTransformPath}
          canonicalEdges={canonicalEdges}
          previewProvenanceConfig={{
            gitBranch: 'main',
            gitSha: 'abc123',
            gitRepo: 'dunay2/dvt',
            graphArtifactPath: 'pipelines/sales_pipeline.yaml',
          }}
        />
      );
    });

    await act(async () => {
      container
        .querySelectorAll('button')[0]
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    const expectedGraphArtifactContent = buildPreviewDesignGraphArtifactContent({
      nodes: nodesWithTransformPath,
      edges: canonicalEdges,
      scopedNodeIds: ['source-node', 'transform-node', 'sink-node'],
      sqlArtifact: {
        repo: 'dunay2/dvt',
        path: 'models/transform.sql',
        ref: 'refs/heads/main',
        commitSha: 'abc123',
        contentSha256: sha256HexUtf8('select * from analytics.orders'),
      },
      context: {
        tenantId: 'tenant',
        projectId: 'project',
        environmentId: 'env',
      },
    });

    expect(plansService.previewPlan).toHaveBeenCalledWith(
      expect.objectContaining({
        previewProfile: 'transformation-sql-first-v1',
        provenance: {
          graphArtifact: {
            repo: 'dunay2/dvt',
            path: 'pipelines/sales_pipeline.yaml',
            ref: 'refs/heads/main',
            commitSha: 'abc123',
            contentSha256: sha256HexUtf8(expectedGraphArtifactContent),
          },
          sqlArtifact: {
            repo: 'dunay2/dvt',
            path: 'models/transform.sql',
            ref: 'refs/heads/main',
            commitSha: 'abc123',
            contentSha256: sha256HexUtf8('select * from analytics.orders'),
          },
        },
      })
    );
    expect(workspaceService.saveFileContent).toHaveBeenCalledWith(
      'pipelines/sales_pipeline.yaml',
      expectedGraphArtifactContent
    );
  });

  it('fails closed when the graph artifact cannot be persisted before preview', async () => {
    const plansService = createPlansServiceMock();
    const runsService = createRunsServiceMock();
    const workspaceService = {
      ...createWorkspaceServiceMock({
        'models/transform.sql': 'select * from analytics.orders',
      }),
      saveFileContent: vi.fn(async () => {
        throw new Error('Graph artifact could not be written to the workspace.');
      }),
    } satisfies IWorkspacePort;
    const nodesWithTransformPath = canonicalNodes.map((node) =>
      node.id === 'transform-node' ? { ...node, path: 'models/transform.sql' } : node
    );

    await act(async () => {
      root.render(
        <HookHost
          plansService={plansService}
          runsService={runsService}
          workspaceService={workspaceService}
          currentPlan={null}
          onRunStarted={vi.fn()}
          sessionContext={sessionContext}
          shellFeedback={shellFeedback}
          canonicalNodes={nodesWithTransformPath}
          canonicalEdges={canonicalEdges}
        />
      );
    });

    await act(async () => {
      container
        .querySelectorAll('button')[0]
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(plansService.previewPlan).not.toHaveBeenCalled();
    expect(shellFeedback.error).toHaveBeenCalledWith(
      'Graph artifact could not be written to the workspace.'
    );
  });

  it('fails closed when source or sink authoring payload is missing for the graph artifact', async () => {
    const plansService = createPlansServiceMock();
    const runsService = createRunsServiceMock();
    const invalidNodes = canonicalNodes.map((node) =>
      node.id === 'sink-node'
        ? {
            ...node,
            metadata: {
              config: {
                schema: 'analytics',
                materialization: 'table',
                writeMode: 'replace',
              },
            },
          }
        : node
    );

    await act(async () => {
      root.render(
        <HookHost
          plansService={plansService}
          runsService={runsService}
          currentPlan={null}
          onRunStarted={vi.fn()}
          sessionContext={sessionContext}
          shellFeedback={shellFeedback}
          canonicalNodes={invalidNodes}
          canonicalEdges={canonicalEdges}
        />
      );
    });

    await act(async () => {
      container
        .querySelectorAll('button')[0]
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(plansService.previewPlan).not.toHaveBeenCalled();
    expect(shellFeedback.error).toHaveBeenCalledWith(
      'Preview graph artifact requires sink node sink-node to define metadata.config.schema, table, materialization, and writeMode.'
    );
  });

  it('fails closed for temporal targets when preview provenance is not configured', async () => {
    const plansService = createPlansServiceMock();
    const runsService = createRunsServiceMock();
    const temporalSessionContext: SessionContextPort = {
      ...sessionContext,
      getWorkspaceScope: () => ({
        tenantId: 'tenant',
        projectId: 'project',
        environmentId: 'env',
        targetAdapter: 'temporal',
      }),
      getWorkspaceScopeSnapshot: () => ({
        tenantId: 'tenant',
        projectId: 'project',
        environmentId: 'env',
        targetAdapter: 'temporal',
      }),
      buildRunContext: (runId) =>
        makeRunContext(runId, {
          tenantId: 'tenant',
          projectId: 'project',
          environmentId: 'env',
          targetAdapter: 'temporal',
        }),
    };
    const nodesWithTransformPath = canonicalNodes.map((node) =>
      node.id === 'transform-node' ? { ...node, path: 'models/transform.sql' } : node
    );

    await act(async () => {
      root.render(
        <HookHost
          plansService={plansService}
          runsService={runsService}
          currentPlan={null}
          onRunStarted={vi.fn()}
          sessionContext={temporalSessionContext}
          shellFeedback={shellFeedback}
          canonicalNodes={nodesWithTransformPath}
          canonicalEdges={canonicalEdges}
          previewProvenanceConfig={{
            gitBranch: 'main',
            gitSha: 'abc123',
          }}
        />
      );
    });

    await act(async () => {
      container
        .querySelectorAll('button')[0]
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(plansService.previewPlan).not.toHaveBeenCalled();
    expect(shellFeedback.error).toHaveBeenCalledWith(
      'Preview provenance is not configured for this workspace. Set the Git repo and graph artifact path before planning.'
    );
  });

  it('fails closed when preview provenance still uses placeholder Git revision data', async () => {
    const plansService = createPlansServiceMock();
    const runsService = createRunsServiceMock();

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
          previewProvenanceConfig={{
            gitBranch: 'detached',
            gitSha: 'unknown',
            gitRepo: 'dunay2/dvt',
            graphArtifactPath: 'pipelines/sales_pipeline.yaml',
          }}
        />
      );
    });

    await act(async () => {
      container
        .querySelectorAll('button')[0]
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(plansService.previewPlan).not.toHaveBeenCalled();
    expect(shellFeedback.error).toHaveBeenCalledWith(
      'Preview provenance requires an explicit Git branch and commit before planning.'
    );
  });

  it('starts run with persisted plan and forwards run id to navigation', async () => {
    const plansService = createPlansServiceMock();
    const runsService = createRunsServiceMock({
      startRun: vi.fn(async () =>
        makeMockRunRef({
          runId: 'run-success',
          tenantId: 't',
          workflowId: 'w',
        })
      ),
    });
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
              sha256: nb('c'.repeat(64)),
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
