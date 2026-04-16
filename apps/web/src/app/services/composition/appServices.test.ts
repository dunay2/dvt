import { describe, expect, it, vi } from 'vitest';

import type { IPlansPort } from '../../ports/plans';
import type { CapabilitiesPort } from '../../ports/capabilities';
import type { IRunsPort } from '../../ports/runs';
import type { SessionContextPort } from '../../ports/sessionContext';
import type { ShellFeedbackPort } from '../../ports/shellFeedback';
import type { IWorkspacePort } from '../../ports/workspace';
import { makeRunContext } from '../../testing/contractTestUtils';
import type { ApiClient } from '../api/createApiClient';
import { getRuntimeDataSourceMode } from '../config/runtimeDataSourceMode';
import { buildAppServices } from './appServices';

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

  it('uses explicit overrides instead of rebuilding runtime seams', () => {
    const apiClient = buildApiClientStub();
    const workspaceService = {} as IWorkspacePort;
    const runsService = {} as IRunsPort;
    const plansService = {} as IPlansPort;
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
