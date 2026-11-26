// @vitest-environment jsdom

import { fireEvent, within } from '@testing-library/dom';
import React, { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { RuntimeCapabilitiesDto } from '../../capabilities/runtime-capabilities/contracts/runtimeCapabilitiesDtos';
import { createAppServicesTestOverrides } from '../../testing/appServicesTestDoubles';
import { waitForReactQuery, withTestQueryClient } from '../../testing/reactQueryHarness';
import { resolveString } from '../plugins/contracts/PluginManifest';
import { PLUGIN_REGISTRY, type PluginContributions } from '../plugins/registry';
import type { IWorkspacePluginCatalogQueryPort } from '../ports/workspace';
import { AppServicesProvider } from '../services/AppServicesContext';
import { useApplicationLanguageStore } from '../stores/applicationLanguageStore';
import type { Plugin } from '../types/dbt';

import PluginsView from './PluginsView';

function toCatalogPlugin(plugin: PluginContributions): Plugin {
  return {
    id: plugin.id,
    name: resolveString(plugin.displayName),
    version: plugin.version,
    description: '',
    capabilities: [...(plugin.capabilities ?? [])],
    enabled: true,
    permissions: [],
    ...(plugin.backendPluginId ? { backendPluginId: plugin.backendPluginId } : {}),
  };
}

function buildPluginCatalogPayload(): Plugin[] {
  return PLUGIN_REGISTRY.map(toCatalogPlugin);
}

const catalog = buildPluginCatalogPayload();
const backendPluginId = 'dvt.http-json';

function createPluginCatalogQueryPort(): IWorkspacePluginCatalogQueryPort {
  return { getPlugins: vi.fn().mockResolvedValue(catalog) };
}

function capabilities(
  plugins: RuntimeCapabilitiesDto['plugins'] = { [backendPluginId]: { available: true } }
): RuntimeCapabilitiesDto {
  return { apiVersion: '1.0.0', minFrontendVersion: '1.0.0', plugins };
}

describe('PluginsView', () => {
  let mounted: Awaited<ReturnType<typeof withTestQueryClient>> | undefined;

  async function render({
    loadCapabilities = vi.fn().mockResolvedValue(capabilities()),
    workspacePluginCatalogQuery = createPluginCatalogQueryPort(),
  }: {
    loadCapabilities?: () => Promise<RuntimeCapabilitiesDto>;
    workspacePluginCatalogQuery?: IWorkspacePluginCatalogQueryPort;
  } = {}): Promise<HTMLElement> {
    mounted = await withTestQueryClient(
      <AppServicesProvider
        overrides={{
          ...createAppServicesTestOverrides(),
          capabilitiesPort: { loadCapabilities },
          workspacePluginCatalogQuery,
        }}
      >
        <PluginsView />
      </AppServicesProvider>
    );
    return mounted.container;
  }

  function backendRow(container: HTMLElement): HTMLTableRowElement | null {
    return container.querySelector<HTMLTableRowElement>(`[data-plugin-id="${backendPluginId}"]`);
  }

  async function waitForBackendState(
    container: HTMLElement,
    state: string
  ): Promise<HTMLTableRowElement> {
    await waitForReactQuery(
      () => backendRow(container)?.getAttribute('data-backend-state') === state,
      {
        description: `plugin backend state ${state}`,
      }
    );
    return backendRow(container)!;
  }

  beforeEach(() => {
    useApplicationLanguageStore.getState().configureApplicationLanguage('en');
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe(): void {}
        unobserve(): void {}
        disconnect(): void {}
      }
    );
  });

  afterEach(async () => {
    await mounted?.cleanup();
    mounted = undefined;
    useApplicationLanguageStore.getState().configureApplicationLanguage('en');
    vi.unstubAllGlobals();
  });

  it('uses the workbench frame, compact backend status and semantic table', async () => {
    const container = await render();
    const row = await waitForBackendState(container, 'available');
    const table = within(container).getByRole('table', { name: 'Plugins' });

    expect(container.querySelector('[data-slot="route-workbench-frame"]')).not.toBeNull();
    expect(
      container.querySelector(
        '[data-slot="route-workbench-header"] [data-slot="plugins-capability-probe"]'
      )?.textContent
    ).toBe('Capability check · Available');
    expect(table.querySelectorAll('[data-slot="plugin-capability-row"]')).toHaveLength(
      catalog.length
    );
    expect(container.querySelector('[data-slot="plugin-local-registry-diagnostic"]')).toBeNull();
    expect(row.textContent).toContain('Loaded');
    expect(row.textContent).toContain('Ready');
  });

  it('keeps the catalog loading state until the protected query returns', async () => {
    const container = await render({
      workspacePluginCatalogQuery: { getPlugins: () => new Promise<Plugin[]>(() => {}) },
    });

    expect(container.textContent).toContain('Loading plugin catalog');
    expect(within(container).queryByRole('table')).toBeNull();
  });

  it('shows pending capability data while the backend check runs', async () => {
    const container = await render({
      loadCapabilities: () => new Promise<RuntimeCapabilitiesDto>(() => {}),
    });

    const row = await waitForBackendState(container, 'pending');
    expect(row.textContent).toContain('Checking');
    expect(row.getAttribute('data-operational-state')).toBe('pending');
  });

  it.each([
    { state: 'unknown', loadCapabilities: () => Promise.resolve(capabilities({})) },
    { state: 'probe-unavailable', loadCapabilities: () => Promise.reject(new Error('probe down')) },
  ])('reports $state capability data as degraded', async ({ state, loadCapabilities }) => {
    const container = await render({ loadCapabilities });
    const row = await waitForBackendState(container, state);

    expect(row.getAttribute('data-operational-state')).toBe('degraded');
  });

  it('selects a plugin with its button and keeps its backend reason visible after filtering', async () => {
    const container = await render({
      loadCapabilities: () =>
        Promise.resolve(
          capabilities({
            ...Object.fromEntries(
              catalog.flatMap(({ backendPluginId }) =>
                backendPluginId ? [[backendPluginId, { available: true }]] : []
              )
            ),
            [backendPluginId]: { available: false, reason: 'disabled in backend' },
          })
        ),
    });
    const row = await waitForBackendState(container, 'unavailable');
    const button = within(row).getByRole('button');

    await act(async () => {
      fireEvent.click(button);
    });

    const detail = container.querySelector('[data-slot="plugin-capability-detail"]');
    expect(button.getAttribute('aria-pressed')).toBe('true');
    expect(detail?.textContent).toContain('disabled in backend');

    await act(async () => {
      fireEvent.change(
        within(container).getByRole('combobox', { name: 'Filter by backend state' }),
        {
          target: { value: 'blocked' },
        }
      );
    });
    expect(container.querySelectorAll('[data-slot="plugin-capability-row"]')).toHaveLength(1);
    expect(container.querySelector('[data-slot="plugin-capability-detail"]')).toBe(detail);
  });

  it('applies a language change immediately while retaining the catalog search', async () => {
    const container = await render();
    await waitForBackendState(container, 'available');

    await act(async () => {
      fireEvent.input(within(container).getByRole('searchbox'), {
        target: { value: backendPluginId },
      });
      useApplicationLanguageStore.getState().configureApplicationLanguage('es');
    });

    const scope = within(container);
    const search = scope.getByRole<HTMLInputElement>('searchbox', {
      name: 'Buscar plugins, capacidades o tipos de nodo',
    });
    expect(search.value).toBe(backendPluginId);
    expect(scope.getByRole('combobox', { name: 'Filtrar por estado del backend' })).not.toBeNull();
    expect(container.querySelectorAll('[data-slot="plugin-capability-row"]')).toHaveLength(1);
    expect(backendRow(container)?.textContent).toContain('Disponible');
    expect(
      container.querySelector('[data-slot="plugin-capability-detail"]')?.textContent
    ).toContain('Versión');
  });
});
