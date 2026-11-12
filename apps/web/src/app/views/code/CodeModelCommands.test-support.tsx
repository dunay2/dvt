/** Mount real Code commands with fixed plan/run ports; tests control accepted and late results. */
import { act, type ReactElement } from 'react';
import { MemoryRouter } from 'react-router';
import { vi } from 'vitest';
import { createAppServicesTestOverrides } from '../../../testing/appServicesTestDoubles';
import { withTestQueryClient } from '../../../testing/reactQueryHarness';
import {
  createMockRunsService,
  createMockSessionContextPort,
} from '../../../testing/runsPortDoubles';
import type { IPlansPort, PlanPreviewInput, PlanPreviewOutcome } from '../../ports/plans';
import type { FileContent } from '../../ports/workspace';
import { AppServicesProvider } from '../../services/AppServicesContext';
import { DEFAULT_USER_PERMISSIONS, useAuthorizationStore } from '../../stores/authorizationStore';
import { useUiLayoutStore } from '../../stores/uiLayoutStore';
import { makePlanRef } from '../../testing/contractTestUtils';
import { CodeModelCommands } from './CodeModelCommands';
import { executableContextFixture } from './codeWorkspaceFileContext.test-support';

export function acceptedPlan(input: PlanPreviewInput): PlanPreviewOutcome {
  const planRef = makePlanRef({ planId: 'code-plan' });
  return {
    kind: 'accepted',
    plan: {
      planId: 'code-plan',
      planVersion: planRef.planVersion,
      planRef,
      generatedAt: '2026-11-11T00:00:00Z',
      adapter: 'temporal',
      target: 'dev',
      capabilities: [],
      steps: [
        {
          id: 'model.demo.ventas',
          type: 'DBT_MODEL',
          name: 'ventas',
          nodes: ['model.demo.ventas'],
          policies: {},
        },
      ],
      preview: {
        provenance: input.provenance,
        persisted: { planRecordId: 'code-plan', canonicalPlanSha256: planRef.sha256 },
      },
    },
  };
}

export function createCodeModelCommandsHarness() {
  const baseSession = createMockSessionContextPort();
  const fixture = executableContextFixture();
  const state = {
    ui: undefined as Awaited<ReturnType<typeof withTestQueryClient>> | undefined,
    fixture,
    synchronized: true,
    serverFile: fixture.file,
    pendingRead: undefined as Promise<FileContent> | undefined,
    scope: baseSession.getWorkspaceScopeSnapshot(),
  };
  const preview = vi.fn<IPlansPort['previewPlan']>();
  const runs = createMockRunsService();
  const startRun = vi.fn(runs.startRun);
  const feedback = { success: vi.fn(), error: vi.fn() };
  const session = {
    ...baseSession,
    getWorkspaceScope: () => state.scope,
    getWorkspaceScopeSnapshot: () => state.scope,
  };
  const services = {
    ...createAppServicesTestOverrides(),
    sessionContext: session,
    shellFeedback: feedback,
    workspaceFilesQuery: {
      listFiles: async () => [],
      getFileContent: async () => state.pendingRead ?? state.serverFile,
    },
    plansService: { previewPlan: preview, importPlan: vi.fn() },
    runsService: { ...runs, startRun },
  };
  const render = (): ReactElement => (
    <MemoryRouter>
      <AppServicesProvider overrides={services}>
        <CodeModelCommands
          file={state.fixture.file}
          project={state.fixture.project}
          synchronized={state.synchronized}
        />
      </AppServicesProvider>
    </MemoryRouter>
  );
  const button = (command: 'compile' | 'execute'): HTMLButtonElement =>
    state.ui!.container.querySelector<HTMLButtonElement>(`[data-slot="code-${command}-model"]`)!;
  const click = async (command: 'compile' | 'execute'): Promise<void> => {
    await act(async () => {
      button(command).click();
    });
  };

  const reset = () => {
    state.fixture = executableContextFixture();
    state.serverFile = state.fixture.file;
    state.synchronized = true;
    state.pendingRead = undefined;
    state.scope = baseSession.getWorkspaceScopeSnapshot();
    preview.mockReset().mockImplementation(async (input) => acceptedPlan(input));
    startRun.mockReset().mockImplementation(runs.startRun);
    feedback.success.mockClear();
    feedback.error.mockClear();
    useUiLayoutStore.setState({ bottomDrawerVisible: false });
    useAuthorizationStore.setState({
      userPermissions: { ...DEFAULT_USER_PERMISSIONS, canPlan: true, canRun: true },
    });
  };
  const cleanup = async () => {
    await state.ui?.cleanup();
    state.ui = undefined;
    useAuthorizationStore.setState({ userPermissions: DEFAULT_USER_PERMISSIONS });
  };

  return Object.assign(state, {
    preview,
    runs,
    startRun,
    feedback,
    render,
    button,
    click,
    reset,
    cleanup,
  });
}
