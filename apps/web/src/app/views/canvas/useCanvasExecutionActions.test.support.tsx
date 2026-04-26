import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { vi } from 'vitest';

import { mockExecutionPlan } from '../../data/mockDbtData';
import type { IPlansPort } from '../../ports/plans';
import type { IRunsPort } from '../../ports/runs';
import type { SessionContextPort } from '../../ports/sessionContext';
import type { ShellFeedbackPort } from '../../ports/shellFeedback';
import type { IWorkspacePort } from '../../ports/workspace';
import type { WorkspaceBootstrapConfig } from '../../services/config/workspaceConfig';
import { makeRunContext, nb } from '../../testing/contractTestUtils';
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import type { PlanViewModel } from '../../types/plans';
import type { CanvasExecutionStrategy } from '../../plugins/canvasExecutionStrategyContracts';
import { useCanvasExecutionActions } from './useCanvasExecutionActions';

export type PreviewProvenanceConfig = Pick<
  WorkspaceBootstrapConfig,
  'gitBranch' | 'gitSha' | 'gitRepo' | 'graphArtifactPath'
>;

type ExecutionActionsHookViewProps = Readonly<{
  currentPlan: PlanViewModel | null;
  hook: ReturnType<typeof useCanvasExecutionActions>;
}>;

type ExecutionActionsHookCommonProps = Readonly<{
  plansService: IPlansPort;
  runsService: IRunsPort;
  onRunStarted: (runId: string) => void;
  sessionContext: SessionContextPort;
  shellFeedback: ShellFeedbackPort;
  workspaceService: IWorkspacePort;
  previewProvenanceConfig: PreviewProvenanceConfig;
  canonicalNodes: CanonicalNode[];
  canonicalEdges: CanonicalEdge[];
  executionStrategy: CanvasExecutionStrategy;
  selectedNodeIds: string[];
  workspaceNodeIds: string[];
  canPlan: boolean;
  canRun: boolean;
  consolePanelVisible: boolean;
  setConsolePanelHeight: (height: number) => void;
  toggleConsolePanel: () => void;
}>;

type ControlledExecutionActionsHookHostProps = Readonly<ExecutionActionsHookCommonProps & {
  currentPlan: PlanViewModel | null;
}>;

type StatefulExecutionActionsHookHostProps = Readonly<ExecutionActionsHookCommonProps & {
  initialPlan: PlanViewModel | null;
}>;

export type RenderExecutionActionsHarnessArgs = {
  plansService: IPlansPort;
  runsService: IRunsPort;
  currentPlan?: PlanViewModel | null;
  initialPlan?: PlanViewModel | null;
  stateful?: boolean;
  onRunStarted?: (runId: string) => void;
  sessionContext?: SessionContextPort;
  shellFeedback?: ShellFeedbackPort;
  workspaceService?: IWorkspacePort;
  previewProvenanceConfig?: Partial<PreviewProvenanceConfig>;
  canonicalNodes?: CanonicalNode[];
  canonicalEdges?: CanonicalEdge[];
  executionStrategy?: CanvasExecutionStrategy;
  selectedNodeIds?: string[];
  workspaceNodeIds?: string[];
  canPlan?: boolean;
  canRun?: boolean;
  consolePanelVisible?: boolean;
  setConsolePanelHeight?: (height: number) => void;
  toggleConsolePanel?: () => void;
};

type ResolvedExecutionActionsHarnessArgs = Omit<
  RenderExecutionActionsHarnessArgs,
  | 'currentPlan'
  | 'initialPlan'
  | 'stateful'
  | 'workspaceNodeIds'
  | 'selectedNodeIds'
  | 'canonicalNodes'
  | 'canonicalEdges'
  | 'onRunStarted'
  | 'sessionContext'
  | 'shellFeedback'
  | 'workspaceService'
  | 'previewProvenanceConfig'
  | 'canPlan'
  | 'canRun'
  | 'consolePanelVisible'
  | 'setConsolePanelHeight'
  | 'toggleConsolePanel'
> & {
  currentPlan: PlanViewModel | null;
  initialPlan: PlanViewModel | null;
  stateful: boolean;
  onRunStarted: (runId: string) => void;
  sessionContext: SessionContextPort;
  shellFeedback: ShellFeedbackPort;
  workspaceService: IWorkspacePort;
  previewProvenanceConfig: Partial<PreviewProvenanceConfig>;
  canonicalNodes: CanonicalNode[];
  canonicalEdges: CanonicalEdge[];
  executionStrategy: CanvasExecutionStrategy;
  selectedNodeIds: string[];
  workspaceNodeIds?: string[];
  canPlan: boolean;
  canRun: boolean;
  consolePanelVisible: boolean;
  setConsolePanelHeight: (height: number) => void;
  toggleConsolePanel: () => void;
};

export const DEFAULT_PREVIEW_PROVENANCE_CONFIG: PreviewProvenanceConfig = {
  gitBranch: 'main',
  gitSha: 'local',
  gitRepo: 'dunay2/dvt',
  graphArtifactPath: 'pipelines/sales_pipeline.yaml',
} as const;

const DEFAULT_WORKSPACE_FILE_CONTENTS: Readonly<Record<string, string>> = {
  'pipelines/sales_pipeline.yaml': 'name: sales_pipeline\nsteps: []',
  'models/transform.sql': 'select * from analytics.orders',
};

function ExecutionActionsHookView({
  currentPlan,
  hook,
}: ExecutionActionsHookViewProps): React.JSX.Element {
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

function ControlledExecutionActionsHookHost({
  currentPlan,
  ...props
}: ControlledExecutionActionsHookHostProps): React.JSX.Element {
  const hook = useCanvasExecutionActions({
    ...props,
    currentPlan,
    setCurrentPlan: () => undefined,
  });

  return <ExecutionActionsHookView currentPlan={currentPlan} hook={hook} />;
}

function StatefulExecutionActionsHookHost({
  initialPlan,
  ...props
}: StatefulExecutionActionsHookHostProps): React.JSX.Element {
  const [currentPlan, setCurrentPlan] = React.useState<PlanViewModel | null>(initialPlan);
  const hook = useCanvasExecutionActions({
    ...props,
    currentPlan,
    setCurrentPlan,
  });

  return <ExecutionActionsHookView currentPlan={currentPlan} hook={hook} />;
}

function resolveCommonHookProps(
  args: ResolvedExecutionActionsHarnessArgs
): ExecutionActionsHookCommonProps {
  return {
    plansService: args.plansService,
    runsService: args.runsService,
    onRunStarted: args.onRunStarted,
    sessionContext: args.sessionContext,
    shellFeedback: args.shellFeedback,
    workspaceService: args.workspaceService,
    previewProvenanceConfig: args.previewProvenanceConfig as PreviewProvenanceConfig,
    canonicalNodes: args.canonicalNodes,
    canonicalEdges: args.canonicalEdges,
    executionStrategy: args.executionStrategy,
    selectedNodeIds: args.selectedNodeIds,
    workspaceNodeIds: args.workspaceNodeIds ?? args.canonicalNodes.map((node) => node.id),
    canPlan: args.canPlan,
    canRun: args.canRun,
    consolePanelVisible: args.consolePanelVisible,
    setConsolePanelHeight: args.setConsolePanelHeight,
    toggleConsolePanel: args.toggleConsolePanel,
  };
}

function resolveHarnessArgs(
  args: RenderExecutionActionsHarnessArgs
): ResolvedExecutionActionsHarnessArgs {
  return {
    ...args,
    currentPlan: args.currentPlan ?? null,
    initialPlan: args.initialPlan ?? null,
    stateful: args.stateful ?? false,
    onRunStarted: args.onRunStarted ?? vi.fn<(runId: string) => void>(),
    sessionContext: args.sessionContext ?? createSessionContext(),
    shellFeedback: args.shellFeedback ?? createShellFeedbackMock(),
    workspaceService: args.workspaceService ?? createWorkspaceServiceMock(),
    previewProvenanceConfig: args.previewProvenanceConfig ?? DEFAULT_PREVIEW_PROVENANCE_CONFIG,
    canonicalNodes: args.canonicalNodes ?? buildCanonicalNodes(),
    canonicalEdges: args.canonicalEdges ?? buildCanonicalEdges(),
    executionStrategy: args.executionStrategy ?? {
      kind: 'transformation_preview',
      previewProfile: 'transformation-sql-first-v1',
    },
    selectedNodeIds: args.selectedNodeIds ?? [],
    canPlan: args.canPlan ?? true,
    canRun: args.canRun ?? true,
    consolePanelVisible: args.consolePanelVisible ?? false,
    setConsolePanelHeight: args.setConsolePanelHeight ?? vi.fn<(height: number) => void>(),
    toggleConsolePanel: args.toggleConsolePanel ?? vi.fn<() => void>(),
  };
}

export function buildCanonicalNodes(): CanonicalNode[] {
  return [
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
}

export function buildCanonicalEdges(): CanonicalEdge[] {
  return [
    {
      id: 'edge-1',
      sourceId: 'source-node',
      targetId: 'transform-node',
      relation: 'lineage',
    },
    {
      id: 'edge-2',
      sourceId: 'transform-node',
      targetId: 'sink-node',
      relation: 'lineage',
    },
  ];
}

export function createWorkspaceServiceMock(
  fileContents: Readonly<Record<string, string>> = DEFAULT_WORKSPACE_FILE_CONTENTS
): IWorkspacePort {
  return {
    getGraphSnapshot: vi.fn(async () => ({ nodes: [], edges: [] })),
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

export function createPlansServiceMock(plan: PlanViewModel = mockExecutionPlan): IPlansPort {
  return {
    previewPlan: vi.fn(async () => plan),
    importPlan: vi.fn(async () => plan),
  };
}

export function createRunsServiceMock(overrides: Partial<IRunsPort> = {}): IRunsPort {
  return {
    listRunSummaries: vi.fn(async () => []),
    getRunSnapshot: vi.fn(async () => null),
    startRun: vi.fn(async () => ({ runId: 'run', accepted: true })),
    listRunEvents: vi.fn(async () => ({ events: [] })),
    ...overrides,
  };
}

export function createShellFeedbackMock(): ShellFeedbackPort {
  return {
    error: vi.fn<(message: string) => void>(),
    success: vi.fn<(message: string) => void>(),
  };
}

function requireMockExecutionPlanRef(): NonNullable<typeof mockExecutionPlan.planRef> {
  const { planRef } = mockExecutionPlan;

  if (planRef == null) {
    throw new TypeError('Mock execution plan must define a planRef for execution-action tests.');
  }

  return planRef;
}

export function createSessionContext(targetAdapter: 'temporal' = 'temporal'): SessionContextPort {
  return {
    getWorkspaceScope: () => ({
      tenantId: 'tenant',
      projectId: 'project',
      environmentId: 'env',
      targetAdapter,
    }),
    getWorkspaceScopeSnapshot: () => ({
      tenantId: 'tenant',
      projectId: 'project',
      environmentId: 'env',
      targetAdapter,
    }),
    subscribeWorkspaceScope: () => () => undefined,
    buildRunContext: (runId) =>
      makeRunContext(runId, {
        tenantId: 'tenant',
        projectId: 'project',
        environmentId: 'env',
        targetAdapter,
      }),
  };
}

export function buildRunnableExecutionPlan(sha: string = 'c'.repeat(64)): PlanViewModel {
  return {
    ...mockExecutionPlan,
    planRef: {
      ...requireMockExecutionPlanRef(),
      sha256: nb(sha),
    },
  };
}

export function buildPersistedPreviewPlan(): PlanViewModel {
  const persistedSha = 'c'.repeat(64);
  const runnablePlan = buildRunnableExecutionPlan(persistedSha);

  return {
    ...runnablePlan,
    preview: {
      ...mockExecutionPlan.preview,
      persisted: {
        ...mockExecutionPlan.preview?.persisted,
        planRecordId: runnablePlan.planId,
        canonicalPlanSha256: persistedSha,
      },
    },
  };
}

export function renderExecutionActionsHarness(initialArgs: RenderExecutionActionsHarnessArgs): {
  render: () => Promise<void>;
  rerender: (nextArgs: Partial<RenderExecutionActionsHarnessArgs>) => Promise<void>;
  clickPlan: () => Promise<void>;
  clickStartRun: () => Promise<void>;
  text: (testId: string) => string | null;
  cleanup: () => void;
  container: HTMLDivElement;
  onRunStarted: ResolvedExecutionActionsHarnessArgs['onRunStarted'];
  sessionContext: SessionContextPort;
  shellFeedback: ResolvedExecutionActionsHarnessArgs['shellFeedback'];
  workspaceService: IWorkspacePort;
  setConsolePanelHeight: ResolvedExecutionActionsHarnessArgs['setConsolePanelHeight'];
  toggleConsolePanel: ResolvedExecutionActionsHarnessArgs['toggleConsolePanel'];
} {
  let currentArgs = resolveHarnessArgs(initialArgs);
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root: Root = createRoot(container);

  function buildElement(): React.JSX.Element {
    const commonProps = resolveCommonHookProps(currentArgs);

    return currentArgs.stateful ? (
      <StatefulExecutionActionsHookHost {...commonProps} initialPlan={currentArgs.initialPlan} />
    ) : (
      <ControlledExecutionActionsHookHost {...commonProps} currentPlan={currentArgs.currentPlan} />
    );
  }

  function queryButton(index: number): Element | null {
    return container.querySelectorAll('button')[index] ?? null;
  }

  return {
    render: async () => {
      await act(async () => {
        root.render(buildElement());
      });
    },
    rerender: async (nextArgs) => {
      currentArgs = {
        ...currentArgs,
        ...nextArgs,
      };

      await act(async () => {
        root.render(buildElement());
      });
    },
    clickPlan: async () => {
      await act(async () => {
        queryButton(0)?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      });
    },
    clickStartRun: async () => {
      await act(async () => {
        queryButton(1)?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      });
    },
    text: (testId) => container.querySelector(`[data-testid="${testId}"]`)?.textContent ?? null,
    cleanup: () => {
      act(() => {
        root.unmount();
      });
      container.remove();
    },
    container,
    onRunStarted: currentArgs.onRunStarted,
    sessionContext: currentArgs.sessionContext,
    shellFeedback: currentArgs.shellFeedback,
    workspaceService: currentArgs.workspaceService,
    setConsolePanelHeight: currentArgs.setConsolePanelHeight,
    toggleConsolePanel: currentArgs.toggleConsolePanel,
  };
}

export function resetExecutionActionsTestDoubles() {
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
}

export function restoreExecutionActionsTestDoubles() {
  vi.clearAllMocks();
  vi.useRealTimers();
}








