import { vi } from 'vitest';

import type { IPlansPort } from '../../ports/plans';
import type { IRunsPort } from '../../ports/runs';
import type { SessionContextPort } from '../../ports/sessionContext';
import type { ShellFeedbackPort } from '../../ports/shellFeedback';
import type {
  IWorkspaceGraphDraftAuthoringPort,
  WorkspaceGraphDraftAuthoringSaveResult,
} from '../../ports/workspaceGraphDraftAuthoring';
import type { IWorkspacePort } from '../../ports/workspace';
import { makeMockRunRef, makeRunContext } from '../../testing/contractTestUtils';
import type { CanvasHarnessState } from './useCanvasController.test.types';
import type { PlanViewModel } from '../../types/plans';

function buildDefaultCanvasHarnessSaveResult(): WorkspaceGraphDraftAuthoringSaveResult {
  return {
    kind: 'saved',
    capability: {
      scope: {
        tenantId: 'tenant-a',
        projectId: 'project-a',
        environmentId: 'dev',
      },
      mode: 'writable',
      canRead: true,
      canWrite: true,
      reason: 'authorized',
    },
    auditRef: {
      correlationId: 'corr-1',
      decisionId: 'dec-1',
      action: 'draft_write',
      outcome: 'allowed',
      recordedAt: '2026-04-08T00:00:00Z',
    },
    formatMeta: {
      schemaVersion: 'workspace-graph-draft.v1',
      storedSchemaVersion: 'workspace-graph-draft.v1',
      migrationState: 'native',
    },
    revision: 'rev-1',
  };
}

export function buildDefaultCanvasHarnessServices(
  currentPlan: PlanViewModel
): CanvasHarnessState['services'] {
  const sessionContext: SessionContextPort = {
    getWorkspaceScope: () => ({
      tenantId: 'tenant-a',
      projectId: 'project-a',
      environmentId: 'dev',
      targetAdapter: 'mock',
    }),
    getWorkspaceScopeSnapshot: () => ({
      tenantId: 'tenant-a',
      projectId: 'project-a',
      environmentId: 'dev',
      targetAdapter: 'mock',
    }),
    subscribeWorkspaceScope: () => () => undefined,
    buildRunContext: (runId: string) =>
      makeRunContext(runId, {
        tenantId: 'tenant-a',
        projectId: 'project-a',
        environmentId: 'dev',
        targetAdapter: 'mock',
      }),
  };

  const workspaceService: IWorkspacePort = {
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
    getFileContent: vi.fn(async (path: string) => ({
      path,
      name: path.split('/').at(-1) ?? path,
      language: 'sql',
      content: '',
      lastModified: '2026-04-08T00:00:00Z',
    })),
    saveFileContent: vi.fn(async (path: string, content: string) => ({
      path,
      name: path.split('/').at(-1) ?? path,
      language: 'sql',
      content,
      lastModified: '2026-04-08T00:00:00Z',
    })),
  };

  const workspaceGraphDraftAuthoringPort: IWorkspaceGraphDraftAuthoringPort = {
    readGraphDraft: vi.fn(async () => ({ kind: 'not_found' as const })),
    saveGraphDraft: vi.fn(async () => buildDefaultCanvasHarnessSaveResult()),
  };

  const shellFeedback: ShellFeedbackPort = {
    success: vi.fn(),
    error: vi.fn(),
  };

  const plansService: IPlansPort = {
    previewPlan: vi.fn(async () => currentPlan),
    importPlan: vi.fn(async () => currentPlan),
  };

  const runsService: IRunsPort = {
    listRunSummaries: vi.fn(async () => []),
    getRunSnapshot: vi.fn(async () => null),
    startRun: vi.fn(async () =>
      makeMockRunRef({
        tenantId: 'tenant-a',
        workflowId: 'workflow_ui_1',
        runId: 'run_ui_1',
      })
    ),
    listRunEvents: vi.fn(async () => ({ events: [] })),
  };

  return {
    workspaceService,
    workspaceGraphDraftAuthoringPort,
    plansService,
    runsService,
    sessionContext,
    shellFeedback,
  };
}
