// @vitest-environment jsdom

import { fireEvent } from '@testing-library/dom';
import React, { act } from 'react';
import { afterEach, describe, expect, it } from 'vitest';

import { PLUGIN_REGISTRY } from '../plugins/registry';
import type { Plugin } from '../types/dbt';
import { withTestQueryClient } from '../../testing/reactQueryHarness';
import { reconcilePluginCatalog } from './plugins/pluginCatalogReconciliation';
import { PluginsPrimarySurface } from './plugins/PluginsRouteWorkbench';
import { resolvePluginsViewCopy } from './plugins/pluginsViewCopy';

const copy = resolvePluginsViewCopy('en');

function catalogPlugin(id: string, backendPluginId?: string): Plugin {
  return {
    id,
    name: `Catalog ${id}`,
    version: '0.5.3',
    description: id,
    capabilities: ['catalog.capability'],
    enabled: true,
    permissions: [],
    ...(backendPluginId ? { backendPluginId } : {}),
  };
}

describe('PluginsView catalog reconciliation', () => {
  let mounted: Awaited<ReturnType<typeof withTestQueryClient>> | null = null;

  afterEach(async () => {
    await mounted?.cleanup();
    mounted = null;
  });

  it('renders backend-only and unbound DB rows without fabricating frontend presence', async () => {
    const catalog = [catalogPlugin('backend-only', 'backend-service'), catalogPlugin('unbound')];
    const reconciliation = reconcilePluginCatalog({
      catalog,
      localContributions: PLUGIN_REGISTRY,
    });

    mounted = await withTestQueryClient(
      <PluginsPrimarySurface
        capabilities={{
          apiVersion: '1.0.0',
          minFrontendVersion: '0.5.0',
          plugins: { 'backend-service': { available: true } },
        }}
        capabilitiesError={null}
        capabilitiesLoading={false}
        copy={copy}
        pluginCatalogError={null}
        pluginCatalogLoading={false}
        probeStatus={{ state: 'ok', label: 'Available', description: 'Available' }}
        reconciliation={reconciliation}
      />
    );

    const rows = mounted.container.querySelectorAll('[data-slot="plugin-capability-row"]');
    const backendOnlyRow = mounted.container.querySelector(
      '[data-slot="plugin-capability-row"][data-plugin-id="backend-only"]'
    );
    const unboundRow = mounted.container.querySelector(
      '[data-slot="plugin-capability-row"][data-plugin-id="unbound"]'
    );

    expect(rows).toHaveLength(2);
    expect(backendOnlyRow?.textContent).toContain('Not registered');
    expect(backendOnlyRow?.textContent).toContain('Available');
    expect(backendOnlyRow?.textContent).toContain('Ready');
    expect(unboundRow?.textContent).toContain('Not registered');
    expect(unboundRow?.textContent).toContain('Not bound');
    expect(unboundRow?.textContent).toContain('Unbound');
    expect(mounted.container.textContent).toContain('Local registry mismatch');
    expect(Array.from(rows).map((row) => row.getAttribute('data-plugin-id'))).not.toContain(
      PLUGIN_REGISTRY[0]?.id
    );

    const frontendFilter = mounted.container.querySelector<HTMLSelectElement>(
      '[data-slot="plugin-frontend-state-filter"]'
    );
    expect(frontendFilter).not.toBeNull();

    await act(async () => {
      fireEvent.change(frontendFilter!, { target: { value: 'unbound' } });
    });

    expect(mounted.container.querySelectorAll('[data-slot="plugin-capability-row"]')).toHaveLength(
      1
    );
    expect(mounted.container.textContent).toContain('Catalog unbound');
    expect(mounted.container.textContent).not.toContain('Catalog backend-only');
  });

  it('shows Loaded only for an exact local contribution and displays catalog versions', async () => {
    const local = PLUGIN_REGISTRY[0]!;
    const catalog = catalogPlugin(local.id, local.backendPluginId);
    const reconciliation = reconcilePluginCatalog({
      catalog: [catalog],
      localContributions: PLUGIN_REGISTRY,
    });
    const backendPlugins = catalog.backendPluginId
      ? { [catalog.backendPluginId]: { available: true } }
      : {};

    mounted = await withTestQueryClient(
      <PluginsPrimarySurface
        capabilities={{ apiVersion: '1.0.0', minFrontendVersion: '0.5.0', plugins: backendPlugins }}
        capabilitiesError={null}
        capabilitiesLoading={false}
        copy={copy}
        pluginCatalogError={null}
        pluginCatalogLoading={false}
        probeStatus={{ state: 'ok', label: 'Available', description: 'Available' }}
        reconciliation={reconciliation}
      />
    );

    const row = mounted.container.querySelector('[data-slot="plugin-capability-row"]');
    const detail = mounted.container.querySelector('[data-slot="plugin-capability-detail"]');

    expect(row?.textContent).toContain('Loaded');
    expect(detail?.textContent).toContain('Version');
    expect(detail?.textContent).toContain('0.5.3');
  });
});
