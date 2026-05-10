// @vitest-environment jsdom

import { createAppServicesTestOverrides } from '../../testing/appServicesTestDoubles';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { IRunsPort } from '../ports/runs';
import type { CapabilitiesPort } from '../ports/capabilities';
import type { IPlansPort } from '../ports/plans';
import type {
  IWarehouseSourceImportPort,
  IWorkspaceAdminReadPort,
  IWorkspaceDiffQueryPort,
  IWorkspaceFileContentCommandPort,
  IWorkspaceFilesQueryPort,
  IWorkspaceGraphSnapshotQueryPort,
  IWorkspacePluginCatalogQueryPort,
} from '../ports/workspace';
import type { IWorkspaceGraphDraftAuthoringPort } from '../ports/workspaceGraphDraftAuthoring';
import { makeRunContext } from '../testing/contractTestUtils';
import {
  AppServicesProvider,
  useAppDataSourceMode,
  useCapabilitiesPort,
  usePlansService,
  useRunsService,
  useSessionContext,
  useShellFeedback,
  useWarehouseSourceImportPort,
  useWorkspaceAdminReadPort,
  useWorkspaceDiffQueryPort,
  useWorkspaceFileContentCommandPort,
  useWorkspaceFilesQueryPort,
  useWorkspaceGraphDraftAuthoringPort,
  useWorkspaceGraphSnapshotQueryPort,
  useWorkspacePluginCatalogQueryPort,
} from './AppServicesContext';

function clearStableContextKey(): void {
  Reflect.deleteProperty(
    globalThis as typeof globalThis & { __dvtAppServicesContext?: unknown },
    '__dvtAppServicesContext'
  );
  Reflect.deleteProperty(
    globalThis as typeof globalThis & { __dvtAppServicesContext__?: unknown },
    '__dvtAppServicesContext__'
  );
}

describe('AppServicesProvider', () => {
  let container: HTMLDivElement;
  let root: Root;
  let previousActEnvironment: boolean | undefined;

  const captured: {
    mode: ReturnType<typeof useAppDataSourceMode> | null;
    workspaceGraphSnapshotQuery: IWorkspaceGraphSnapshotQueryPort | null;
    workspaceFilesQuery: IWorkspaceFilesQueryPort | null;
    workspaceDiffQuery: IWorkspaceDiffQueryPort | null;
    workspacePluginCatalogQuery: IWorkspacePluginCatalogQueryPort | null;
    workspaceAdminRead: IWorkspaceAdminReadPort | null;
    warehouseSourceImport: IWarehouseSourceImportPort | null;
    workspaceFileContentCommand: IWorkspaceFileContentCommandPort | null;
    workspaceGraphDraftAuthoringPort: IWorkspaceGraphDraftAuthoringPort | null;
    runsService: IRunsPort | null;
    plansService: IPlansPort | null;
    capabilitiesPort: CapabilitiesPort | null;
    sessionContext: ReturnType<typeof useSessionContext> | null;
    shellFeedback: ReturnType<typeof useShellFeedback> | null;
  } = {
    mode: null,
    workspaceGraphSnapshotQuery: null,
    workspaceFilesQuery: null,
    workspaceDiffQuery: null,
    workspacePluginCatalogQuery: null,
    workspaceAdminRead: null,
    warehouseSourceImport: null,
    workspaceFileContentCommand: null,
    workspaceGraphDraftAuthoringPort: null,
    runsService: null,
    plansService: null,
    capabilitiesPort: null,
    sessionContext: null,
    shellFeedback: null,
  };

  function Probe(): null {
    captured.mode = useAppDataSourceMode();
    captured.workspaceGraphSnapshotQuery = useWorkspaceGraphSnapshotQueryPort();
    captured.workspaceFilesQuery = useWorkspaceFilesQueryPort();
    captured.workspaceDiffQuery = useWorkspaceDiffQueryPort();
    captured.workspacePluginCatalogQuery = useWorkspacePluginCatalogQueryPort();
    captured.workspaceAdminRead = useWorkspaceAdminReadPort();
    captured.warehouseSourceImport = useWarehouseSourceImportPort();
    captured.workspaceFileContentCommand = useWorkspaceFileContentCommandPort();
    captured.workspaceGraphDraftAuthoringPort = useWorkspaceGraphDraftAuthoringPort();
    captured.runsService = useRunsService();
    captured.plansService = usePlansService();
    captured.capabilitiesPort = useCapabilitiesPort();
    captured.sessionContext = useSessionContext();
    captured.shellFeedback = useShellFeedback();
    return null;
  }

  beforeEach(() => {
    const globalObject = globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean };
    previousActEnvironment = globalObject.IS_REACT_ACT_ENVIRONMENT;
    globalObject.IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    captured.mode = null;
    captured.workspaceGraphSnapshotQuery = null;
    captured.workspaceFilesQuery = null;
    captured.workspaceDiffQuery = null;
    captured.workspacePluginCatalogQuery = null;
    captured.workspaceAdminRead = null;
    captured.warehouseSourceImport = null;
    captured.workspaceFileContentCommand = null;
    captured.workspaceGraphDraftAuthoringPort = null;
    captured.runsService = null;
    captured.plansService = null;
    captured.capabilitiesPort = null;
    captured.sessionContext = null;
    captured.shellFeedback = null;

    const globalObject = globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean };
    if (previousActEnvironment === undefined) {
      Reflect.deleteProperty(globalObject, 'IS_REACT_ACT_ENVIRONMENT');
    } else {
      globalObject.IS_REACT_ACT_ENVIRONMENT = previousActEnvironment;
    }

    clearStableContextKey();
    vi.resetModules();
  });

  it('builds services from mode and exposes them through hooks', async () => {
    await act(async () => {
      root.render(
        <AppServicesProvider overrides={createAppServicesTestOverrides()}>
          <Probe />
        </AppServicesProvider>
      );
    });

    expect(captured.mode).toBe('api');
    expect(captured.workspaceGraphSnapshotQuery).not.toBeNull();
    expect(captured.workspaceFilesQuery).not.toBeNull();
    expect(captured.workspaceDiffQuery).not.toBeNull();
    expect(captured.workspacePluginCatalogQuery).not.toBeNull();
    expect(captured.workspaceAdminRead).not.toBeNull();
    expect(captured.warehouseSourceImport).not.toBeNull();
    expect(captured.workspaceFileContentCommand).not.toBeNull();
    expect(captured.workspaceGraphDraftAuthoringPort).not.toBeNull();
    expect(captured.runsService).not.toBeNull();
    expect(captured.plansService).not.toBeNull();
    expect(captured.capabilitiesPort).not.toBeNull();
  });

  it('uses explicit overrides when provided', async () => {
    const workspaceGraphSnapshotQuery: IWorkspaceGraphSnapshotQueryPort = {
      getGraphSnapshot: async () => ({ nodes: [], edges: [] }),
    };
    const workspaceDiffQuery: IWorkspaceDiffQueryPort = {
      getDiffChanges: async () => [],
    };
    const workspacePluginCatalogQuery: IWorkspacePluginCatalogQueryPort = {
      getPlugins: async () => [],
    };
    const workspaceAdminRead: IWorkspaceAdminReadPort = {
      getRoles: async () => [],
      getAuditLog: async () => [],
    };
    const warehouseSourceImport: IWarehouseSourceImportPort = {
      listWarehouseConnections: async () => [],
      listWarehouseTables: async () => [],
      importSources: async () => ({
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
      }),
    };
    const workspaceFilesQuery: IWorkspaceFilesQueryPort = {
      listFiles: async () => [],
      getFileContent: async (path: string) => ({
        path,
        name: path.split('/').at(-1) ?? path,
        language: 'plaintext',
        content: '',
        lastModified: '2026-04-06T00:00:00Z',
      }),
    };
    const workspaceFileContentCommand: IWorkspaceFileContentCommandPort = {
      saveFileContent: async (path: string, content: string) => ({
        path,
        name: path.split('/').at(-1) ?? path,
        language: 'plaintext',
        content,
        lastModified: '2026-04-06T00:00:00Z',
      }),
    };
    const workspaceGraphDraftAuthoringPort: IWorkspaceGraphDraftAuthoringPort = {
      readGraphDraft: async () => ({ kind: 'not_found' }),
      saveGraphDraft: async () => ({
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
          recordedAt: '2026-04-06T00:00:00Z',
        },
        formatMeta: {
          schemaVersion: 'workspace-graph-draft.v1',
          storedSchemaVersion: 'workspace-graph-draft.v1',
          migrationState: 'native',
        },
        revision: 'rev-1',
      }),
    };
    const plansService = {
      previewPlan: async () => ({
        planId: 'plan_1',
        planVersion: '1',
        generatedAt: '2026-04-06T00:00:00Z',
        adapter: 'dbt',
        target: 'dev',
        steps: [],
        capabilities: [],
      }),
      importPlan: async () => ({
        planId: 'plan_1',
        planVersion: '1',
        generatedAt: '2026-04-06T00:00:00Z',
        adapter: 'dbt',
        target: 'dev',
        steps: [],
        capabilities: [],
      }),
    };
    const runsService = {
      listRunSummaries: async () => [],
      getRunSnapshot: async () => null,
      startRun: async () => ({
        runId: 'run_1',
        accepted: true,
      }),
      listRunEvents: async () => ({ events: [] }),
    };
    const sessionContext = {
      getWorkspaceScope: () => ({
        tenantId: 'tenant-a',
        projectId: 'project-a',
        environmentId: 'dev',
        targetAdapter: 'temporal' as const,
      }),
      getWorkspaceScopeSnapshot: () => ({
        tenantId: 'tenant-a',
        projectId: 'project-a',
        environmentId: 'dev',
        targetAdapter: 'temporal' as const,
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
    const shellFeedback = {
      success: () => undefined,
      error: () => undefined,
    };
    const capabilitiesPort: CapabilitiesPort = {
      loadCapabilities: async () => ({
        apiVersion: '1.0.0',
        minFrontendVersion: '1.0.0',
        plugins: {},
      }),
    };

    await act(async () => {
      root.render(
        <AppServicesProvider
          overrides={{
            workspaceGraphSnapshotQuery,
            workspaceFilesQuery,
            workspaceDiffQuery,
            workspacePluginCatalogQuery,
            workspaceAdminRead,
            warehouseSourceImport,
            workspaceFileContentCommand,
            workspaceGraphDraftAuthoringPort,
            plansService,
            runsService,
            capabilitiesPort,
            sessionContext,
            shellFeedback,
          }}
        >
          <Probe />
        </AppServicesProvider>
      );
    });

    expect(captured.mode).toBe('api');
    expect(captured.workspaceGraphSnapshotQuery).toBe(workspaceGraphSnapshotQuery);
    expect(captured.workspaceFilesQuery).toBe(workspaceFilesQuery);
    expect(captured.workspaceDiffQuery).toBe(workspaceDiffQuery);
    expect(captured.workspacePluginCatalogQuery).toBe(workspacePluginCatalogQuery);
    expect(captured.workspaceAdminRead).toBe(workspaceAdminRead);
    expect(captured.warehouseSourceImport).toBe(warehouseSourceImport);
    expect(captured.workspaceFileContentCommand).toBe(workspaceFileContentCommand);
    expect(captured.workspaceGraphDraftAuthoringPort).toBe(workspaceGraphDraftAuthoringPort);
    expect(captured.plansService).toBe(plansService);
    expect(captured.runsService).toBe(runsService);
    expect(captured.capabilitiesPort).toBe(capabilitiesPort);
    expect(captured.sessionContext).toBe(sessionContext);
    expect(captured.shellFeedback).toBe(shellFeedback);
  });

  it('reuses the same context across module reevaluation in dev', async () => {
    clearStableContextKey();
    vi.resetModules();
    const firstLoad = await import('./AppServicesContext');
    vi.resetModules();
    const secondLoad = await import('./AppServicesContext');

    function CrossReloadProbe(): null {
      captured.mode = secondLoad.useAppDataSourceMode();
      return null;
    }

    await act(async () => {
      root.render(
        <firstLoad.AppServicesProvider overrides={createAppServicesTestOverrides()}>
          <CrossReloadProbe />
        </firstLoad.AppServicesProvider>
      );
    });

    expect(captured.mode).toBe('api');
  });
});
