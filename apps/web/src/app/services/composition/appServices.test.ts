import { describe, expect, it, vi } from 'vitest';
import type { WorkspaceGraphAuthoringDraft } from '@dvt/contracts';

import type { IPlansPort } from '../../ports/plans';
import type { CapabilitiesPort } from '../../ports/capabilities';
import type { IRunsPort } from '../../ports/runs';
import type { SessionContextPort } from '../../ports/sessionContext';
import type { ShellFeedbackPort } from '../../ports/shellFeedback';
import type { IWorkspacePort } from '../../ports/workspace';
import { makeMockRunRef, makeRunContext } from '../../testing/contractTestUtils';
import type { ApiClient } from '../api/createApiClient';
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

function buildWorkspacePortStub(): IWorkspacePort {
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
      options: { includeColumns: false, addTests: false, addFreshness: false },
    })),
    listFiles: vi.fn(async () => []),
    getFileContent: vi.fn(async (path) => ({
      path,
      name: path,
      language: 'sql',
      content: '',
      lastModified: '2026-04-23T00:00:00Z',
    })),
    saveFileContent: vi.fn(async (path, content) => ({
      path,
      name: path,
      language: 'sql',
      content,
      lastModified: '2026-04-23T00:00:00Z',
    })),
  };
}

function buildRunsPortStub(): IRunsPort {
  return {
    listRunSummaries: vi.fn(async () => []),
    getRunSnapshot: vi.fn(async () => null),
    startRun: vi.fn(async () =>
      makeMockRunRef({
        tenantId: 'tenant-1',
        workflowId: 'wf_run_override',
        runId: 'run-override',
      })
    ),
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
  it('owns boot-time mode resolution and publishes the runtime mode', () => {
    const appServices = buildAppServices({ mode: 'mock' });

    expect(appServices.dataSourceMode).toBe('mock');
    expect(getRuntimeDataSourceMode()).toBe('mock');
    expect(appServices.workspaceService).toBeDefined();
    expect(appServices.runsService).toBeDefined();
    expect(appServices.plansService).toBeDefined();
    expect(typeof appServices.capabilitiesPort.loadCapabilities).toBe('function');
    expect(appServices.sessionContext.buildRunContext('run-1')).toMatchObject({ runId: 'run-1' });
    expect(typeof appServices.shellFeedback.error).toBe('function');
    expect(typeof appServices.shellFeedback.success).toBe('function');
  });

  it('builds isolated mock workspace services for independent composition roots', async () => {
    const firstServices = buildAppServices({ mode: 'mock' });
    const secondServices = buildAppServices({ mode: 'mock' });
    const secondBefore = await secondServices.workspaceService.getGraphSnapshot();

    await firstServices.workspaceService.importSources({
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

    const secondAfter = await secondServices.workspaceService.getGraphSnapshot();

    expect(secondAfter.nodes.some((node) => node.id === 'src_finance_ledger_entries')).toBe(false);
    expect(secondAfter.nodes).toHaveLength(secondBefore.nodes.length);
  });

  it('lets a fresh mock authoring port read a draft that already exists in the shared mock workspace', async () => {
    const firstServices = buildAppServices({ mode: 'mock' });

    await firstServices.workspaceGraphDraftAuthoringPort.saveGraphDraft({
      expectedRevision: null,
      idempotencyKey: 'idem-1',
      draft: AUTHORING_DRAFT,
    });

    const recreatedAuthoringPort = buildAppServices({
      mode: 'mock',
      workspaceService: firstServices.workspaceService,
      sessionContext: firstServices.sessionContext,
    }).workspaceGraphDraftAuthoringPort;

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

  it('hard-cuts graph-draft persistence out of workspaceService while keeping mock authoring operational', async () => {
    const services = buildAppServices({ mode: 'mock' });

    expect(services.workspaceService).not.toHaveProperty('getGraphDraft');
    expect(services.workspaceService).not.toHaveProperty('saveGraphDraft');

    const saveResult = await services.workspaceGraphDraftAuthoringPort.saveGraphDraft({
      expectedRevision: null,
      idempotencyKey: 'idem-hard-cut-1',
      draft: SINGLE_NODE_AUTHORING_DRAFT,
    });

    expect(saveResult.kind).toBe('saved');
    if (saveResult.kind !== 'saved') {
      throw new Error('expected mock authoring save to succeed');
    }

    await expect(services.workspaceGraphDraftAuthoringPort.readGraphDraft()).resolves.toMatchObject({
      kind: 'ok',
      record: {
        revision: saveResult.revision,
        draft: {
          nodes: [expect.objectContaining({ id: 'source-node', kind: 'source' })],
          edges: [],
        },
      },
    });
  });

  it('uses explicit overrides instead of rebuilding runtime seams', () => {
    const apiClient = buildApiClientStub();
    const workspaceService = buildWorkspacePortStub();
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
      mode: 'api',
      apiClient,
      workspaceService,
      runsService,
      plansService,
      capabilitiesPort,
      sessionContext,
      shellFeedback,
    });

    expect(appServices.dataSourceMode).toBe('api');
    expect(appServices.apiClient).toBe(apiClient);
    expect(appServices.workspaceService).toBe(workspaceService);
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
      mode: 'api',
      apiClient,
    });

    await expect(appServices.capabilitiesPort.loadCapabilities()).resolves.toEqual(payload);
    expect(apiClient.getJson).toHaveBeenCalledWith('/capabilities', {
      includeSessionHeaders: false,
    });
  });
});
