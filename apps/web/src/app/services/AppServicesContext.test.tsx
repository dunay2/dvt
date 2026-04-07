// @vitest-environment jsdom

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { CapabilitiesPort } from '../ports/capabilities';
import type { PlansService } from './plans/plansService';
import type { RunsService } from './runs/runsService';
import type { WorkspaceService } from './workspace/workspaceService';
import {
  AppServicesProvider,
  useAppDataSourceMode,
  useCapabilitiesPort,
  usePlansService,
  useRunsService,
  useWorkspaceService,
} from './AppServicesContext';

describe('AppServicesProvider', () => {
  let container: HTMLDivElement;
  let root: Root;
  let previousActEnvironment: boolean | undefined;

  const captured: {
    mode: ReturnType<typeof useAppDataSourceMode> | null;
    workspaceService: WorkspaceService | null;
    runsService: RunsService | null;
    plansService: PlansService | null;
    capabilitiesPort: CapabilitiesPort | null;
  } = {
    mode: null,
    workspaceService: null,
    runsService: null,
    plansService: null,
    capabilitiesPort: null,
  };

  function Probe(): null {
    captured.mode = useAppDataSourceMode();
    captured.workspaceService = useWorkspaceService();
    captured.runsService = useRunsService();
    captured.plansService = usePlansService();
    captured.capabilitiesPort = useCapabilitiesPort();
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
    captured.workspaceService = null;
    captured.runsService = null;
    captured.plansService = null;
    captured.capabilitiesPort = null;

    const globalObject = globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean };
    if (previousActEnvironment === undefined) {
      Reflect.deleteProperty(globalObject, 'IS_REACT_ACT_ENVIRONMENT');
    } else {
      globalObject.IS_REACT_ACT_ENVIRONMENT = previousActEnvironment;
    }
  });

  it('builds services from mode and exposes them through hooks', async () => {
    await act(async () => {
      root.render(
        <AppServicesProvider overrides={{ mode: 'mock' }}>
          <Probe />
        </AppServicesProvider>
      );
    });

    expect(captured.mode).toBe('mock');
    expect(captured.workspaceService).not.toBeNull();
    expect(captured.runsService).not.toBeNull();
    expect(captured.plansService).not.toBeNull();
    expect(captured.capabilitiesPort).not.toBeNull();
  });

  it('uses explicit overrides when provided', async () => {
    const workspaceService = {
      getGraphSnapshot: async () => ({ nodes: [], edges: [] }),
      getDiffChanges: async () => [],
      getPlugins: async () => [],
      getRoles: async () => [],
      getAuditLog: async () => [],
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
      listFiles: async () => [],
      getFileContent: async (path: string) => ({
        path,
        name: path.split('/').at(-1) ?? path,
        language: 'plaintext',
        content: '',
        lastModified: '2026-04-06T00:00:00Z',
      }),
      saveFileContent: async (path: string, content: string) => ({
        path,
        name: path.split('/').at(-1) ?? path,
        language: 'plaintext',
        content,
        lastModified: '2026-04-06T00:00:00Z',
      }),
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
            mode: 'api',
            workspaceService,
            capabilitiesPort,
          }}
        >
          <Probe />
        </AppServicesProvider>
      );
    });

    expect(captured.mode).toBe('api');
    expect(captured.workspaceService).toBe(workspaceService);
    expect(captured.capabilitiesPort).toBe(capabilitiesPort);
  });
});
