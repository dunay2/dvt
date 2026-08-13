import { vi } from 'vitest';

import { createMockRunsService } from '../../../testing/runsPortDoubles';

import type { IPlansPort } from '../../ports/plans';
import type { IRunsPort } from '../../ports/runs';
import type { SessionContextPort } from '../../ports/sessionContext';
import type { ShellFeedbackPort } from '../../ports/shellFeedback';
import type {
  IWorkspaceGraphDraftAuthoringPort,
  WorkspaceGraphDraftAuthoringSaveResult,
} from '../../ports/workspaceGraphDraftAuthoring';
import type {
  IWorkspaceFileContentCommandPort,
  IWorkspaceFilesQueryPort,
} from '../../ports/workspace';
import { makeRunContext } from '../../testing/contractTestUtils';
import type { CanvasHarnessState } from './useCanvasController.test.types';
import type { PlanViewModel } from '../../types/plans';
import { buildDraftReadNotFoundResponse } from '../../services/workspace/workspaceGraphDraftProtocol.test.fixtures';

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
      targetAdapter: 'temporal',
    }),
    getWorkspaceScopeSnapshot: () => ({
      tenantId: 'tenant-a',
      projectId: 'project-a',
      environmentId: 'dev',
      targetAdapter: 'temporal',
    }),
    subscribeWorkspaceScope: () => () => undefined,
    buildRunContext: (runId: string) =>
      makeRunContext(runId, {
        tenantId: 'tenant-a',
        projectId: 'project-a',
        environmentId: 'dev',
        targetAdapter: 'temporal',
      }),
  };

  const workspaceFilesQuery: IWorkspaceFilesQueryPort = {
    listFiles: vi.fn(async () => []),
    getFileContent: vi.fn(async (path: string) => ({
      path,
      name: path.split('/').at(-1) ?? path,
      language: 'sql',
      content: '',
      contentSha256: 'a'.repeat(64),
      lastModified: '2026-04-08T00:00:00Z',
    })),
  };
  const workspaceFileContentCommand: IWorkspaceFileContentCommandPort = {
    saveFileContent: vi.fn(async (input) => ({
      kind: 'saved' as const,
      disposition: 'updated' as const,
      path: input.path,
      contentSha256: 'b'.repeat(64),
      lastModified: '2026-04-08T00:00:00Z',
    })),
  };

  const workspaceGraphDraftAuthoringPort: IWorkspaceGraphDraftAuthoringPort = {
    readGraphDraft: vi.fn(async () =>
      buildDraftReadNotFoundResponse({
        tenantId: 'tenant-a',
        projectId: 'project-a',
        environmentId: 'dev',
      })
    ),
    saveGraphDraft: vi.fn(async () => buildDefaultCanvasHarnessSaveResult()),
  };

  const shellFeedback: ShellFeedbackPort = {
    success: vi.fn(),
    error: vi.fn(),
  };

  const plansService: IPlansPort = {
    previewPlan: vi.fn(async () => ({
      kind: 'accepted' as const,
      plan: { ...currentPlan, planRef: currentPlan.planRef! },
    })),
    importPlan: vi.fn(async () => currentPlan),
  };

  const runsService: IRunsPort = {
    ...createMockRunsService(),
    listRunSummaries: vi.fn(async () => []),
    getRunSnapshot: vi.fn(async () => null),
    startRun: vi.fn(async () => ({
      runId: 'run_platform_1',
      accepted: true,
    })),
    listRunEvents: vi.fn(async () => ({ events: [] })),
  };

  return {
    workspaceFilesQuery,
    workspaceFileContentCommand,
    workspaceGraphDraftAuthoringPort,
    plansService,
    runsService,
    sessionContext,
    shellFeedback,
  };
}
