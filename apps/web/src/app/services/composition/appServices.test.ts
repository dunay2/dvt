import { describe, expect, it, vi } from 'vitest';

import type { IPlansPort } from '../../ports/plans';
import type { IRunsPort } from '../../ports/runs';
import type { SessionContextPort } from '../../ports/sessionContext';
import type { ShellFeedbackPort } from '../../ports/shellFeedback';
import type { IWorkspacePort } from '../../ports/workspace';
import type { ApiClient } from '../api/createApiClient';
import { getRuntimeDataSourceMode } from '../config/runtimeDataSourceMode';
import { buildAppServices } from './appServices';

function buildApiClientStub(): ApiClient {
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
    expect(appServices.sessionContext.buildRunContext('run-1')).toMatchObject({ runId: 'run-1' });
    expect(typeof appServices.shellFeedback.error).toBe('function');
    expect(typeof appServices.shellFeedback.success).toBe('function');
  });

  it('uses explicit overrides instead of rebuilding runtime seams', () => {
    const apiClient = buildApiClientStub();
    const workspaceService = {} as IWorkspacePort;
    const runsService = {} as IRunsPort;
    const plansService = {} as IPlansPort;
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
      buildRunContext: (runId) => ({
        tenantId: 'tenant-1',
        projectId: 'project-1',
        environmentId: 'env-1',
        targetAdapter: 'temporal',
        runId,
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
      sessionContext,
      shellFeedback,
    });

    expect(appServices.dataSourceMode).toBe('api');
    expect(appServices.apiClient).toBe(apiClient);
    expect(appServices.workspaceService).toBe(workspaceService);
    expect(appServices.runsService).toBe(runsService);
    expect(appServices.plansService).toBe(plansService);
    expect(appServices.sessionContext).toBe(sessionContext);
    expect(appServices.shellFeedback).toBe(shellFeedback);
  });
});
