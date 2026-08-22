import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import { asSha256HexString, GraphDbtModelCompilationResultSchema } from '@dvt/contracts';
import { sha256HexUtf8 } from '@dvt/crypto';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { vi } from 'vitest';

import { mockExecutionPlan } from '../../../testing/fixtures/mockDbtData';
import { createTestQueryClient } from '../../../testing/reactQueryHarness';
import { createMockRunsService } from '../../../testing/runsPortDoubles';
import type { IPlansPort } from '../../ports/plans';
import type { IGraphDbtWorkspaceArtifactPublicationCommandPort } from '../../ports/graphDbtWorkspaceArtifactPublication';
import type { IGraphDbtModelCompilationQueryPort } from '../../ports/graphDbtModelCompilation';
import type { IRunsPort } from '../../ports/runs';
import type { SessionContextPort } from '../../ports/sessionContext';
import type { ShellFeedbackPort } from '../../ports/shellFeedback';
import type {
  IWorkspaceFileContentCommandPort,
  IWorkspaceFilesQueryPort,
} from '../../ports/workspace';
import type { WorkspaceBootstrapConfig } from '../../services/config/workspaceConfig';
import {
  WorkspaceFileLoadError,
  WorkspaceFileRevisionConflictError,
} from '../../services/workspace/workspaceErrors';
import { makeRunContext, nb } from '../../testing/contractTestUtils';
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import {
  createCanvasExecutionSelectionIntent,
  type CanvasExecutionSelectionIntent,
} from '../../types/canvasExecutionSelection';
import type { PlanViewModel } from '../../types/plans';
import type { CanvasExecutionStrategy } from '../../plugins/canvasExecutionStrategyContracts';
import type { CanvasExecutionDraftGraph } from './canvasExecutionActions.types';
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
  graphDraftCanvasId: string | null;
  plansService: IPlansPort;
  runsService: IRunsPort;
  onRunStarted: (runId: string) => void;
  sessionContext: SessionContextPort;
  shellFeedback: ShellFeedbackPort;
  workspaceFilesQuery: IWorkspaceFilesQueryPort;
  workspaceFileContentCommand: IWorkspaceFileContentCommandPort;
  graphDbtWorkspaceArtifactPublicationCommand: IGraphDbtWorkspaceArtifactPublicationCommandPort;
  graphDbtModelCompilationQuery: IGraphDbtModelCompilationQueryPort;
  previewProvenanceConfig: PreviewProvenanceConfig;
  canonicalNodes: CanonicalNode[];
  canonicalEdges: CanonicalEdge[];
  executionStrategy: CanvasExecutionStrategy;
  selectionIntent: CanvasExecutionSelectionIntent;
  workspaceNodeIds: string[];
  flushDraftForExecution?: () => Promise<CanvasExecutionDraftGraph>;
  canPlan: boolean;
  canRun: boolean;
  bottomDrawerVisible: boolean;
  setBottomDrawerHeight: (height: number) => void;
  toggleBottomDrawer: () => void;
}>;

type ControlledExecutionActionsHookHostProps = Readonly<
  ExecutionActionsHookCommonProps & {
    currentPlan: PlanViewModel | null;
  }
>;

type StatefulExecutionActionsHookHostProps = Readonly<
  ExecutionActionsHookCommonProps & {
    initialPlan: PlanViewModel | null;
  }
>;

export type RenderExecutionActionsHarnessArgs = {
  graphDraftCanvasId?: string | null;
  plansService: IPlansPort;
  runsService: IRunsPort;
  currentPlan?: PlanViewModel | null;
  initialPlan?: PlanViewModel | null;
  stateful?: boolean;
  onRunStarted?: (runId: string) => void;
  sessionContext?: SessionContextPort;
  shellFeedback?: ShellFeedbackPort;
  workspaceFilesQuery?: IWorkspaceFilesQueryPort;
  workspaceFileContentCommand?: IWorkspaceFileContentCommandPort;
  graphDbtWorkspaceArtifactPublicationCommand?: IGraphDbtWorkspaceArtifactPublicationCommandPort;
  graphDbtModelCompilationQuery?: IGraphDbtModelCompilationQueryPort;
  previewProvenanceConfig?: Partial<PreviewProvenanceConfig>;
  canonicalNodes?: CanonicalNode[];
  canonicalEdges?: CanonicalEdge[];
  executionStrategy?: CanvasExecutionStrategy;
  executionEnvironmentId?: string;
  selectionIntent?: CanvasExecutionSelectionIntent;
  workspaceNodeIds?: string[];
  flushDraftForExecution?: () => Promise<CanvasExecutionDraftGraph>;
  canPlan?: boolean;
  canRun?: boolean;
  bottomDrawerVisible?: boolean;
  setBottomDrawerHeight?: (height: number) => void;
  toggleBottomDrawer?: () => void;
};

type ResolvedExecutionActionsHarnessArgs = Omit<
  RenderExecutionActionsHarnessArgs,
  | 'currentPlan'
  | 'initialPlan'
  | 'stateful'
  | 'graphDraftCanvasId'
  | 'workspaceNodeIds'
  | 'selectionIntent'
  | 'canonicalNodes'
  | 'canonicalEdges'
  | 'onRunStarted'
  | 'sessionContext'
  | 'shellFeedback'
  | 'workspaceFilesQuery'
  | 'workspaceFileContentCommand'
  | 'graphDbtWorkspaceArtifactPublicationCommand'
  | 'graphDbtModelCompilationQuery'
  | 'previewProvenanceConfig'
  | 'flushDraftForExecution'
  | 'canPlan'
  | 'canRun'
  | 'bottomDrawerVisible'
  | 'setBottomDrawerHeight'
  | 'toggleBottomDrawer'
> & {
  currentPlan: PlanViewModel | null;
  initialPlan: PlanViewModel | null;
  stateful: boolean;
  graphDraftCanvasId: string | null;
  onRunStarted: (runId: string) => void;
  sessionContext: SessionContextPort;
  shellFeedback: ShellFeedbackPort;
  workspaceFilesQuery: IWorkspaceFilesQueryPort;
  workspaceFileContentCommand: IWorkspaceFileContentCommandPort;
  graphDbtWorkspaceArtifactPublicationCommand: IGraphDbtWorkspaceArtifactPublicationCommandPort;
  graphDbtModelCompilationQuery: IGraphDbtModelCompilationQueryPort;
  previewProvenanceConfig: Partial<PreviewProvenanceConfig>;
  canonicalNodes: CanonicalNode[];
  canonicalEdges: CanonicalEdge[];
  executionStrategy: CanvasExecutionStrategy;
  executionEnvironmentId?: string;
  selectionIntent: CanvasExecutionSelectionIntent;
  workspaceNodeIds?: string[];
  flushDraftForExecution?: () => Promise<CanvasExecutionDraftGraph>;
  canPlan: boolean;
  canRun: boolean;
  bottomDrawerVisible: boolean;
  setBottomDrawerHeight: (height: number) => void;
  toggleBottomDrawer: () => void;
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
      <div data-testid="can-plan-graph">{String(hook.canPlanGraph)}</div>
      <div data-testid="can-start-run">{String(hook.canStartRun)}</div>
      <div data-testid="plan-run-readiness-status">{hook.planRunReadiness.status}</div>
      <div data-testid="plan-run-readiness-blockers">
        {hook.planRunReadiness.blockers.join(',') || 'none'}
      </div>
      <div data-testid="plan-status-summary">{hook.planStatusSummary}</div>
      <div data-testid="latest-preview-outcome">{hook.latestPreviewOutcome?.kind ?? 'none'}</div>
      <div data-testid="current-plan-sha">{currentPlan?.planRef?.sha256 ?? 'none'}</div>
      <button
        type="button"
        onClick={() => {
          void hook.handlePreviewExecutionPlan();
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
    graphDraftCanvasId: args.graphDraftCanvasId,
    plansService: args.plansService,
    runsService: args.runsService,
    onRunStarted: args.onRunStarted,
    sessionContext: args.sessionContext,
    shellFeedback: args.shellFeedback,
    workspaceFilesQuery: args.workspaceFilesQuery,
    workspaceFileContentCommand: args.workspaceFileContentCommand,
    graphDbtWorkspaceArtifactPublicationCommand: args.graphDbtWorkspaceArtifactPublicationCommand,
    graphDbtModelCompilationQuery: args.graphDbtModelCompilationQuery,
    previewProvenanceConfig: args.previewProvenanceConfig as PreviewProvenanceConfig,
    canonicalNodes: args.canonicalNodes,
    canonicalEdges: args.canonicalEdges,
    executionStrategy: args.executionStrategy,
    ...(args.executionEnvironmentId == null
      ? {}
      : { executionEnvironmentId: args.executionEnvironmentId }),
    selectionIntent: args.selectionIntent,
    workspaceNodeIds: args.workspaceNodeIds ?? args.canonicalNodes.map((node) => node.id),
    ...(args.flushDraftForExecution == null
      ? {}
      : { flushDraftForExecution: args.flushDraftForExecution }),
    canPlan: args.canPlan,
    canRun: args.canRun,
    bottomDrawerVisible: args.bottomDrawerVisible,
    setBottomDrawerHeight: args.setBottomDrawerHeight,
    toggleBottomDrawer: args.toggleBottomDrawer,
  };
}

function resolveWorkspaceFilePortMocks(args: RenderExecutionActionsHarnessArgs): {
  workspaceFilesQuery: IWorkspaceFilesQueryPort;
  workspaceFileContentCommand: IWorkspaceFileContentCommandPort;
} {
  const defaults = createWorkspaceFilePortMocks();

  return {
    workspaceFilesQuery: args.workspaceFilesQuery ?? defaults.workspaceFilesQuery,
    workspaceFileContentCommand:
      args.workspaceFileContentCommand ?? defaults.workspaceFileContentCommand,
  };
}

function resolveHarnessArgs(
  args: RenderExecutionActionsHarnessArgs
): ResolvedExecutionActionsHarnessArgs {
  return {
    ...args,
    graphDraftCanvasId:
      args.graphDraftCanvasId === undefined ? 'test-canvas' : args.graphDraftCanvasId,
    currentPlan: args.currentPlan ?? null,
    initialPlan: args.initialPlan ?? null,
    stateful: args.stateful ?? false,
    onRunStarted: args.onRunStarted ?? vi.fn<(runId: string) => void>(),
    sessionContext: args.sessionContext ?? createSessionContext(),
    shellFeedback: args.shellFeedback ?? createShellFeedbackMock(),
    ...resolveWorkspaceFilePortMocks(args),
    graphDbtWorkspaceArtifactPublicationCommand:
      args.graphDbtWorkspaceArtifactPublicationCommand ??
      createGraphDbtWorkspaceArtifactPublicationCommandMock(),
    graphDbtModelCompilationQuery:
      args.graphDbtModelCompilationQuery ?? createGraphDbtModelCompilationQueryMock(),
    previewProvenanceConfig: args.previewProvenanceConfig ?? DEFAULT_PREVIEW_PROVENANCE_CONFIG,
    canonicalNodes: args.canonicalNodes ?? buildCanonicalNodes(),
    canonicalEdges: args.canonicalEdges ?? buildCanonicalEdges(),
    executionStrategy: args.executionStrategy ?? {
      kind: 'transformation_preview',
      previewProfile: 'transformation-sql-first-v2',
    },
    ...(args.executionEnvironmentId == null
      ? {}
      : { executionEnvironmentId: args.executionEnvironmentId }),
    selectionIntent: args.selectionIntent ?? createCanvasExecutionSelectionIntent([]),
    canPlan: args.canPlan ?? true,
    canRun: args.canRun ?? true,
    bottomDrawerVisible: args.bottomDrawerVisible ?? false,
    setBottomDrawerHeight: args.setBottomDrawerHeight ?? vi.fn<(height: number) => void>(),
    toggleBottomDrawer: args.toggleBottomDrawer ?? vi.fn<() => void>(),
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
        connectionRef: buildTestPostgresConnectionRef(),
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

export function buildTestPostgresConnectionRef(connectionId = 'warehouse-a') {
  return {
    schemaVersion: 'connection-ref.v1' as const,
    connectionId,
    provider: 'postgres' as const,
  };
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

export function createWorkspaceFilePortMocks(
  fileContents: Readonly<Record<string, string>> = DEFAULT_WORKSPACE_FILE_CONTENTS
): {
  workspaceFilesQuery: IWorkspaceFilesQueryPort;
  workspaceFileContentCommand: IWorkspaceFileContentCommandPort;
} {
  const files = new Map(Object.entries(fileContents));
  return {
    workspaceFilesQuery: {
      listFiles: vi.fn(async () => []),
      getFileContent: vi.fn(async (path: string) => {
        const content = files.get(path);
        if (content === undefined) {
          throw new WorkspaceFileLoadError('not_found', path);
        }

        return {
          path,
          name: path.split('/').at(-1) ?? path,
          language: path.endsWith('.sql') ? 'sql' : 'yaml',
          content,
          contentSha256: sha256HexUtf8(content),
          lastModified: '2026-04-08T00:00:00Z',
        };
      }),
    },
    workspaceFileContentCommand: {
      saveFileContent: vi.fn(async (input) => {
        const currentContent = files.get(input.path);
        const contentSha256 = sha256HexUtf8(input.content);
        const file = {
          path: input.path,
          name: input.path.split('/').at(-1) ?? input.path,
          language: input.path.endsWith('.sql') ? 'sql' : 'yaml',
          content: input.content,
          contentSha256,
          lastModified: '2026-04-08T00:00:00Z',
        };
        if (currentContent !== undefined && sha256HexUtf8(currentContent) === contentSha256) {
          return {
            kind: 'unchanged' as const,
            disposition: null,
            path: file.path,
            contentSha256: file.contentSha256,
            lastModified: file.lastModified,
          };
        }
        const revisionMatches =
          input.expectedRevision.kind === 'absent'
            ? currentContent === undefined
            : currentContent !== undefined &&
              sha256HexUtf8(currentContent) === input.expectedRevision.value;
        if (!revisionMatches) {
          throw new WorkspaceFileRevisionConflictError(input.path);
        }

        files.set(input.path, input.content);
        return {
          kind: 'saved' as const,
          disposition: currentContent === undefined ? ('created' as const) : ('updated' as const),
          path: file.path,
          contentSha256: file.contentSha256,
          lastModified: file.lastModified,
        };
      }),
    },
  };
}

export function createGraphDbtWorkspaceArtifactPublicationCommandMock(): IGraphDbtWorkspaceArtifactPublicationCommandPort {
  return {
    publish: vi.fn<IGraphDbtWorkspaceArtifactPublicationCommandPort['publish']>(
      async (request) => ({
        schemaVersion: 'graph-dbt-workspace-artifact-publication.v1' as const,
        kind: 'applied' as const,
        idempotencyKey: request.idempotencyKey,
        requestHash: sha256HexUtf8(JSON.stringify(request)),
        deduplicated: false,
        writes: request.artifacts
          .filter((artifact) => artifact.writeRequired)
          .map((artifact) => ({
            path: artifact.path,
            contentSha256: sha256HexUtf8(artifact.content),
          })),
      })
    ),
  };
}

export function createGraphDbtModelCompilationQueryMock(): IGraphDbtModelCompilationQueryPort {
  return {
    compile: vi.fn<IGraphDbtModelCompilationQueryPort['compile']>(async (request) =>
      GraphDbtModelCompilationResultSchema.parse({
        schemaVersion: 'graph-dbt-model-compilation.v1',
        kind: 'compiled',
        canvasId: request.canvasId,
        authorityBinding: {
          schemaVersion: 'canvas-authoring-authority-binding.v1',
          canvasId: request.canvasId,
          authority: { kind: 'graph-draft' },
        },
        projectRevision: {
          projectRoot: '.',
          projectName: 'analytics',
          contentSetSha256: 'a'.repeat(64),
          analyzedAt: '2026-08-19T22:00:00.000Z',
          analyzerVersion: 'dvt-dbt-analyzer.v1',
          dbtVersion: '1.10.0',
        },
        analysisSha256: 'b'.repeat(64),
        models: request.selectors
          .slice()
          .sort((left, right) => left.localeCompare(right))
          .map((selector) => ({
            selector,
            uniqueId: `model.analytics.${selector}`,
            compiledSql: `select * from ${selector}`,
          })),
      })
    ),
  };
}

export function createPlansServiceMock(plan: PlanViewModel = mockExecutionPlan): IPlansPort {
  return {
    previewPlan: vi.fn(async () => ({
      kind: 'accepted' as const,
      plan: { ...plan, planRef: plan.planRef! },
    })),
    importPlan: vi.fn(async () => plan),
  };
}

export function createRunsServiceMock(overrides: Partial<IRunsPort> = {}): IRunsPort {
  return {
    ...createMockRunsService(),
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
      sha256: asSha256HexString(sha),
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
  workspaceFilesQuery: IWorkspaceFilesQueryPort;
  workspaceFileContentCommand: IWorkspaceFileContentCommandPort;
  graphDbtWorkspaceArtifactPublicationCommand: IGraphDbtWorkspaceArtifactPublicationCommandPort;
  graphDbtModelCompilationQuery: IGraphDbtModelCompilationQueryPort;
  setBottomDrawerHeight: ResolvedExecutionActionsHarnessArgs['setBottomDrawerHeight'];
  toggleBottomDrawer: ResolvedExecutionActionsHarnessArgs['toggleBottomDrawer'];
  queryClient: QueryClient;
} {
  let currentArgs = resolveHarnessArgs(initialArgs);
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root: Root = createRoot(container);
  const queryClient = createTestQueryClient();

  function buildElement(): React.JSX.Element {
    const commonProps = resolveCommonHookProps(currentArgs);

    const host = currentArgs.stateful ? (
      <StatefulExecutionActionsHookHost {...commonProps} initialPlan={currentArgs.initialPlan} />
    ) : (
      <ControlledExecutionActionsHookHost {...commonProps} currentPlan={currentArgs.currentPlan} />
    );

    return <QueryClientProvider client={queryClient}>{host}</QueryClientProvider>;
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
    workspaceFilesQuery: currentArgs.workspaceFilesQuery,
    workspaceFileContentCommand: currentArgs.workspaceFileContentCommand,
    graphDbtWorkspaceArtifactPublicationCommand:
      currentArgs.graphDbtWorkspaceArtifactPublicationCommand,
    graphDbtModelCompilationQuery: currentArgs.graphDbtModelCompilationQuery,
    setBottomDrawerHeight: currentArgs.setBottomDrawerHeight,
    toggleBottomDrawer: currentArgs.toggleBottomDrawer,
    queryClient,
  };
}

export function resetExecutionActionsTestDoubles() {
  (
    globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
}

export function restoreExecutionActionsTestDoubles() {
  vi.clearAllMocks();
  vi.useRealTimers();
}
