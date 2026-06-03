import { createAppServicesTestOverrides } from '../../../testing/appServicesTestDoubles';
import { describe, expect, it, vi } from 'vitest';
import type { WorkspaceGraphAuthoringDraft } from '@dvt/contracts';

import type { IPlansPort } from '../../ports/plans';
import type { CapabilitiesPort } from '../../ports/capabilities';
import type { IRunsPort } from '../../ports/runs';
import type { SessionContextPort } from '../../ports/sessionContext';
import type { ShellFeedbackPort } from '../../ports/shellFeedback';
import type {
  IWarehouseSourceImportPort,
  IWorkspaceAdminReadPort,
  IWorkspaceDiffQueryPort,
  IWorkspaceFileContentCommandPort,
  IWorkspaceFilesQueryPort,
  IWorkspaceGraphSnapshotQueryPort,
  IWorkspacePluginCatalogQueryPort,
} from '../../ports/workspace';
import { makeRunContext } from '../../testing/contractTestUtils';
import { ApiError, type ApiClient } from '../api/createApiClient';
import { getRuntimeDataSourceMode } from '../config/runtimeDataSourceMode';
import { buildAppServices } from './appServices';

const AUTHORING_DRAFT = {
  canvas: {
    kind: 'transformation',
    title: 'Main canvas',
  },
  nodeIds: ['source-node', 'transform-node'],
  nodePositions: {
    'source-node': { x: 0, y: 0 },
    'transform-node': { x: 220, y: 0 },
  },
  nodes: [
    {
      id: 'source-node',
      name: 'orders',
      pluginId: 'dvt',
      kind: 'source',
      role: 'input',
      status: 'idle',
      tags: [],
    },
    {
      id: 'transform-node',
      name: 'transform',
      pluginId: 'dvt',
      kind: 'sql_transform',
      role: 'transform',
      status: 'idle',
      tags: [],
      path: 'models/transform.sql',
    },
  ],
  edges: [
    {
      id: 'draft_edge_source-node_transform-node',
      sourceId: 'source-node',
      targetId: 'transform-node',
      relation: 'lineage',
    },
  ],
} satisfies WorkspaceGraphAuthoringDraft;

const SINGLE_NODE_AUTHORING_DRAFT = {
  canvas: {
    kind: 'transformation',
    title: 'Main canvas',
  },
  nodeIds: ['source-node'],
  nodePositions: {
    'source-node': { x: 0, y: 0 },
  },
  nodes: [AUTHORING_DRAFT.nodes[0]!],
  edges: [],
} satisfies WorkspaceGraphAuthoringDraft;

type ApiClientStub = ApiClient & {
  requestRaw: ReturnType<typeof vi.fn>;
  getJson: ReturnType<typeof vi.fn>;
  postJson: ReturnType<typeof vi.fn>;
};

function buildApiClientStub(): ApiClientStub {
  return {
    baseUrl: 'http://localhost:3000',
    requestRaw: vi.fn(),
    getJson: vi.fn(),
    postJson: vi.fn(),
  };
}

function buildWorkspacePortStubs(): {
  workspaceGraphSnapshotQuery: IWorkspaceGraphSnapshotQueryPort;
  workspaceFilesQuery: IWorkspaceFilesQueryPort;
  workspaceDiffQuery: IWorkspaceDiffQueryPort;
  workspacePluginCatalogQuery: IWorkspacePluginCatalogQueryPort;
  workspaceAdminRead: IWorkspaceAdminReadPort;
  warehouseSourceImport: IWarehouseSourceImportPort;
  workspaceFileContentCommand: IWorkspaceFileContentCommandPort;
} {
  return {
    workspaceGraphSnapshotQuery: {
      getGraphSnapshot: vi.fn(async () => ({ nodes: [], edges: [] })),
    },
    workspaceFilesQuery: {
      listFiles: vi.fn(async () => []),
      getFileContent: vi.fn(async (path: string) => ({
        path,
        name: path,
        language: 'sql',
        content: '',
        lastModified: '2026-04-23T00:00:00Z',
      })),
    },
    workspaceDiffQuery: {
      getDiffChanges: vi.fn(async () => []),
    },
    workspacePluginCatalogQuery: {
      getPlugins: vi.fn(async () => []),
    },
    workspaceAdminRead: {
      getRoles: vi.fn(async () => []),
      getAuditLog: vi.fn(async () => []),
    },
    warehouseSourceImport: {
      listWarehouseConnections: vi.fn(async () => []),
      listWarehouseTables: vi.fn(async () => []),
      importSources: vi.fn(async () => ({
        success: true as const,
        sourcesCreated: 0,
        tablesImported: 0,
        yamlFiles: [],
        grouping: 'schema' as const,
        options: { includeColumns: false, addTests: false, addFreshness: false },
      })),
    },
    workspaceFileContentCommand: {
      saveFileContent: vi.fn(async (path: string, content: string) => ({
        path,
        name: path,
        language: 'sql',
        content,
        lastModified: '2026-04-23T00:00:00Z',
      })),
    },
  };
}

function buildRunsPortStub(): IRunsPort {
  return {
    listRunSummaries: vi.fn(async () => []),
    getRunSnapshot: vi.fn(async () => null),
    startRun: vi.fn(async () => ({ runId: 'run-override', accepted: true })),
    listRunEvents: vi.fn(async () => ({ events: [] })),
  };
}

function buildPlansPortStub(): IPlansPort {
  const planViewModel = {
    planId: 'plan-1',
    planVersion: '1.0.0',
    generatedAt: '2026-04-23T00:00:00Z',
    adapter: 'temporal',
    target: 'warehouse',
    steps: [],
    capabilities: [],
  };

  return {
    previewPlan: vi.fn(async () => planViewModel),
    importPlan: vi.fn(async () => planViewModel),
  };
}

describe('buildAppServices', () => {
  it('owns API-only boot-time service composition', () => {
    const appServices = buildAppServices(createAppServicesTestOverrides());

    expect(appServices.dataSourceMode).toBe('api');
    expect(getRuntimeDataSourceMode()).toBe('api');
    expect(appServices.workspaceGraphSnapshotQuery).toBeDefined();
    expect(appServices.workspaceFilesQuery).toBeDefined();
    expect(appServices.workspaceDiffQuery).toBeDefined();
    expect(appServices.workspacePluginCatalogQuery).toBeDefined();
    expect(appServices.workspaceAdminRead).toBeDefined();
    expect(appServices.warehouseSourceImport).toBeDefined();
    expect(appServices.workspaceFileContentCommand).toBeDefined();
    expect(appServices.runsService).toBeDefined();
    expect(appServices.plansService).toBeDefined();
    expect(typeof appServices.capabilitiesPort.loadCapabilities).toBe('function');
    expect(appServices.sessionContext.buildRunContext('run-1')).toMatchObject({ runId: 'run-1' });
    expect(typeof appServices.shellFeedback.error).toBe('function');
    expect(typeof appServices.shellFeedback.success).toBe('function');
  });

  it('builds isolated test-double workspace services for independent composition roots', async () => {
    const firstServices = buildAppServices(createAppServicesTestOverrides());
    const secondServices = buildAppServices(createAppServicesTestOverrides());
    const secondBefore = await secondServices.workspaceGraphSnapshotQuery.getGraphSnapshot();

    await firstServices.warehouseSourceImport.importSources({
      connectionId: 'conn-1',
      tables: [
        {
          database: 'RAW',
          schema: 'FINANCE',
          table: 'LEDGER_ENTRIES',
          rowCount: 42,
          columns: [{ name: 'entry_id', type: 'INTEGER', nullable: false }],
        },
      ],
      groupingStrategy: 'schema',
      includeColumns: true,
      addTests: false,
      addFreshness: false,
    });

    const secondAfter = await secondServices.workspaceGraphSnapshotQuery.getGraphSnapshot();

    expect(secondAfter.nodes.some((node) => node.id === 'src_finance_ledger_entries')).toBe(false);
    expect(secondAfter.nodes).toHaveLength(secondBefore.nodes.length);
  });

  it('lets the mock authoring port read a draft saved through the same composition root', async () => {
    const firstServices = buildAppServices(createAppServicesTestOverrides());

    await firstServices.workspaceGraphDraftAuthoringPort.saveGraphDraft({
      expectedRevision: null,
      idempotencyKey: 'idem-1',
      draft: AUTHORING_DRAFT,
    });

    const recreatedAuthoringPort = firstServices.workspaceGraphDraftAuthoringPort;

    await expect(recreatedAuthoringPort.readGraphDraft()).resolves.toMatchObject({
      kind: 'ok',
      record: {
        revision: expect.any(String),
        draft: {
          nodes: [
            expect.objectContaining({ id: 'source-node', kind: 'source' }),
            expect.objectContaining({ id: 'transform-node', kind: 'sql_transform' }),
          ],
          edges: [
            {
              id: 'draft_edge_source-node_transform-node',
              sourceId: 'source-node',
              targetId: 'transform-node',
              relation: 'lineage',
            },
          ],
        },
      },
    });
  });

  it('hard-cuts graph-draft persistence out of workspace ports while keeping mock authoring operational', async () => {
    const services = buildAppServices(createAppServicesTestOverrides());

    expect('workspaceService' in services).toBe(false);
    expect(services.workspaceGraphSnapshotQuery).not.toHaveProperty('getGraphDraft');
    expect(services.workspaceFilesQuery).not.toHaveProperty('saveGraphDraft');

    const saveResult = await services.workspaceGraphDraftAuthoringPort.saveGraphDraft({
      expectedRevision: null,
      idempotencyKey: 'idem-hard-cut-1',
      draft: SINGLE_NODE_AUTHORING_DRAFT,
    });

    expect(saveResult.kind).toBe('saved');
    if (saveResult.kind !== 'saved') {
      throw new Error('expected mock authoring save to succeed');
    }

    await expect(services.workspaceGraphDraftAuthoringPort.readGraphDraft()).resolves.toMatchObject(
      {
        kind: 'ok',
        record: {
          revision: saveResult.revision,
          draft: {
            nodes: [expect.objectContaining({ id: 'source-node', kind: 'source' })],
            edges: [],
          },
        },
      }
    );
  });

  it('uses explicit overrides instead of rebuilding runtime seams', () => {
    const apiClient = buildApiClientStub();
    const workspacePorts = buildWorkspacePortStubs();
    const runsService = buildRunsPortStub();
    const plansService = buildPlansPortStub();
    const capabilitiesPort: CapabilitiesPort = {
      loadCapabilities: vi.fn(),
    };
    const sessionContext: SessionContextPort = {
      getWorkspaceScope: () => ({
        tenantId: 'tenant-1',
        projectId: 'project-1',
        environmentId: 'env-1',
        targetAdapter: 'temporal',
      }),
      getWorkspaceScopeSnapshot: () => ({
        tenantId: 'tenant-1',
        projectId: 'project-1',
        environmentId: 'env-1',
        targetAdapter: 'temporal',
      }),
      subscribeWorkspaceScope: () => () => undefined,
      buildRunContext: (runId) =>
        makeRunContext(runId, {
          tenantId: 'tenant-1',
          projectId: 'project-1',
          environmentId: 'env-1',
          targetAdapter: 'temporal',
        }),
    };
    const shellFeedback: ShellFeedbackPort = {
      success: vi.fn(),
      error: vi.fn(),
    };

    const appServices = buildAppServices({
      apiClient,
      ...workspacePorts,
      runsService,
      plansService,
      capabilitiesPort,
      sessionContext,
      shellFeedback,
    });

    expect(appServices.dataSourceMode).toBe('api');
    expect(appServices.apiClient).toBe(apiClient);
    expect(appServices.workspaceGraphSnapshotQuery).toBe(
      workspacePorts.workspaceGraphSnapshotQuery
    );
    expect(appServices.workspaceFilesQuery).toBe(workspacePorts.workspaceFilesQuery);
    expect(appServices.workspaceDiffQuery).toBe(workspacePorts.workspaceDiffQuery);
    expect(appServices.workspacePluginCatalogQuery).toBe(
      workspacePorts.workspacePluginCatalogQuery
    );
    expect(appServices.workspaceAdminRead).toBe(workspacePorts.workspaceAdminRead);
    expect(appServices.warehouseSourceImport).toBe(workspacePorts.warehouseSourceImport);
    expect(appServices.workspaceFileContentCommand).toBe(
      workspacePorts.workspaceFileContentCommand
    );
    expect(appServices.runsService).toBe(runsService);
    expect(appServices.plansService).toBe(plansService);
    expect(appServices.capabilitiesPort).toBe(capabilitiesPort);
    expect(appServices.sessionContext).toBe(sessionContext);
    expect(appServices.shellFeedback).toBe(shellFeedback);
  });

  it('builds the default capabilities port from the composition-owned api client', async () => {
    const apiClient = buildApiClientStub();
    const payload = {
      apiVersion: '1.0.0',
      minFrontendVersion: '1.0.0',
      plugins: {},
    };
    apiClient.getJson.mockResolvedValue(payload);

    const appServices = buildAppServices({
      apiClient,
    });

    await expect(appServices.capabilitiesPort.loadCapabilities()).resolves.toEqual(payload);
    expect(apiClient.getJson).toHaveBeenCalledWith('/capabilities', {
      includeSessionHeaders: false,
    });
  });

  it('fails closed when the backend capabilities request cannot reach the API', async () => {
    const apiClient = buildApiClientStub();
    const failure = new ApiError({
      message: 'Request to /capabilities failed (NETWORK)',
      endpoint: '/capabilities',
      statusCode: null,
      category: 'network',
    });
    apiClient.getJson.mockRejectedValue(failure);

    const appServices = buildAppServices({
      apiClient,
    });

    await expect(appServices.capabilitiesPort.loadCapabilities()).rejects.toBe(failure);
    expect(apiClient.getJson).toHaveBeenCalledWith('/capabilities', {
      includeSessionHeaders: false,
    });
  });

  it('does not hide a backend capabilities response failure behind local shell capabilities', async () => {
    const apiClient = buildApiClientStub();
    const failure = new ApiError({
      message: 'Request to /capabilities failed (500)',
      endpoint: '/capabilities',
      statusCode: 500,
      category: 'server',
    });
    apiClient.getJson.mockRejectedValue(failure);

    const appServices = buildAppServices({
      apiClient,
    });

    await expect(appServices.capabilitiesPort.loadCapabilities()).rejects.toBe(failure);
  });
});
