// @vitest-environment jsdom

import { fireEvent } from '@testing-library/dom';
import React, { act } from 'react';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { waitForReactQuery, withTestQueryClient } from '../../testing/reactQueryHarness';
import { setBootstrapStepStatus, startBootstrapScreen } from './appBootstrapScreen';
import type { CreateProjectResponse } from '../services/projectOnboarding/projectOnboardingService';
import { resolveProtectedRouteSessionContext } from '../services/session/protectedRouteSessionContext';
import AuthRouteGate from './AuthRouteGate';

vi.mock('../services/session/protectedRouteSessionContext', () => ({
  resolveProtectedRouteSessionContext: vi.fn(),
}));

vi.mock('../views/ProjectOnboardingView', () => ({
  default: ({
    onProjectCreated,
  }: {
    onProjectCreated: (response: CreateProjectResponse) => Promise<void> | void;
  }) => (
    <button
      type="button"
      onClick={() => {
        void onProjectCreated({
          project: {
            tenantId: 'tenant-1',
            projectId: 'orders',
            name: 'Orders',
            environmentIds: ['dev'],
          },
          defaultWorkspace: {
            tenantId: 'tenant-1',
            projectId: 'orders',
            projectName: 'Orders',
            environmentId: 'dev',
          },
        });
      }}
    >
      Create a project
    </button>
  ),
}));

function workspaceContextDeniedError(): unknown {
  return {
    endpoint: '/workspace/context',
    statusCode: 403,
    responseBody: {
      error: {
        type: 'forbidden',
        reason: 'workspace_context_not_granted',
      },
    },
  };
}

function installBootstrapScreen(): void {
  document.body.insertAdjacentHTML(
    'beforeend',
    '<div id="app-loading-screen" data-state="loading"></div>'
  );
  startBootstrapScreen();
  setBootstrapStepStatus({ step: 'hydrate', status: 'complete' });
  setBootstrapStepStatus({ step: 'services', status: 'complete' });
}

describe('AuthRouteGate project onboarding recovery', () => {
  let mounted: Awaited<ReturnType<typeof withTestQueryClient>> | null;

  beforeEach(() => {
    mounted = null;
    vi.mocked(resolveProtectedRouteSessionContext).mockReset();
  });

  afterEach(async () => {
    if (mounted) {
      await mounted.cleanup();
    }

    document.getElementById('app-loading-screen')?.remove();
  });

  it('uses project onboarding instead of a terminal workspace-denied screen', async () => {
    vi.mocked(resolveProtectedRouteSessionContext)
      .mockRejectedValueOnce(workspaceContextDeniedError())
      .mockResolvedValueOnce(undefined);

    mounted = await withTestQueryClient(
      <MemoryRouter initialEntries={['/canvas']}>
        <AuthRouteGate>
          <div>Product shell</div>
        </AuthRouteGate>
      </MemoryRouter>
    );

    await waitForReactQuery(
      () => mounted?.container.textContent?.includes('Create a project') === true,
      {
        description: 'project onboarding recovery',
      }
    );
    expect(mounted.container.textContent).not.toContain('Workspace access required');

    await act(async () => {
      fireEvent.click(mounted?.container.querySelector('button') as HTMLButtonElement);
      await Promise.resolve();
    });

    await waitForReactQuery(
      () => mounted?.container.textContent?.includes('Product shell') === true,
      {
        description: 'protected product shell after project onboarding',
      }
    );
    expect(resolveProtectedRouteSessionContext).toHaveBeenCalledTimes(2);
  });

  it('releases the startup overlay while project onboarding owns protected recovery', async () => {
    installBootstrapScreen();
    vi.mocked(resolveProtectedRouteSessionContext).mockRejectedValueOnce(
      workspaceContextDeniedError()
    );

    mounted = await withTestQueryClient(
      <MemoryRouter initialEntries={['/canvas']}>
        <AuthRouteGate>
          <div>Product shell</div>
        </AuthRouteGate>
      </MemoryRouter>
    );

    await waitForReactQuery(
      () => document.getElementById('app-loading-screen')?.dataset.state === 'complete',
      {
        description: 'project onboarding bootstrap release',
      }
    );
  });
});
