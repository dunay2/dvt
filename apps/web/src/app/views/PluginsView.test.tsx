// @vitest-environment jsdom

import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { RuntimeCapabilitiesDto } from '../../capabilities/runtime-capabilities/contracts/runtimeCapabilitiesDtos';
import type { CapabilitiesPort } from '../ports/capabilities';
import { AppServicesProvider } from '../services/AppServicesContext';
import { PLUGIN_REGISTRY } from '../plugins/registry';
import { waitForReactQuery, withTestQueryClient } from '../../testing/reactQueryHarness';
import PluginsView from './PluginsView';

function buildCapabilitiesPayload(
  options?: Readonly<{
    overrides?: Record<string, { available: boolean; reason?: string }>;
    omitPluginIds?: readonly string[];
  }>
): {
  apiVersion: string;
  minFrontendVersion: string;
  plugins: Record<string, { available: boolean; reason?: string }>;
} {
  const plugins = Object.fromEntries(
    PLUGIN_REGISTRY.flatMap((plugin) =>
      plugin.backendPluginId && !options?.omitPluginIds?.includes(plugin.backendPluginId)
        ? [[plugin.backendPluginId, { available: true }]]
        : []
    )
  );

  return {
    apiVersion: '1.0.0',
    minFrontendVersion: '1.0.0',
    plugins: {
      ...plugins,
      ...options?.overrides,
    },
  };
}

describe('PluginsView', () => {
  let mounted: Awaited<ReturnType<typeof withTestQueryClient>> | null;

  beforeEach(() => {
    mounted = null;
    (
      globalThis as typeof globalThis & {
        ResizeObserver?: new (callback: ResizeObserverCallback) => ResizeObserver;
      }
    ).ResizeObserver = class ResizeObserver {
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    } as unknown as new (callback: ResizeObserverCallback) => ResizeObserver;
  });

  afterEach(async () => {
    if (mounted) {
      await mounted.cleanup();
    }

    Reflect.deleteProperty(globalThis, 'ResizeObserver');
  });

  it('renders the plugins workbench inside governed route chrome', async () => {
    const capabilitiesPort: CapabilitiesPort = {
      loadCapabilities: vi.fn().mockResolvedValue(buildCapabilitiesPayload()),
    };

    mounted = await withTestQueryClient(
      <AppServicesProvider overrides={{ mode: 'mock', capabilitiesPort }}>
        <PluginsView />
      </AppServicesProvider>
    );

    await waitForReactQuery(
      () =>
        mounted?.container
          .querySelector('[data-slot="plugins-capability-probe"]')
          ?.textContent?.includes('Available') === true,
      { description: 'plugin capability probe success render' }
    );

    const routeFrame = mounted.container.querySelector('[data-slot="route-workbench-frame"]');
    const headerBand = mounted.container.querySelector('[data-slot="plugins-view-header-band"]');
    const probeCard = mounted.container.querySelector('[data-slot="plugins-capability-probe"]');
    const pluginCards = mounted.container.querySelectorAll('[data-slot="plugin-card"]');
    const backendPlugin = PLUGIN_REGISTRY.find((plugin) => plugin.backendPluginId);

    expect(mounted.container.textContent).toContain('Plugins');
    expect(mounted.container.textContent).toContain('Backend capability probe');
    expect(mounted.container.textContent).toContain('Registered');
    expect(routeFrame?.className).toContain('bg-[var(--surface-route)]');
    expect(headerBand?.className).toContain('bg-[var(--surface-panel)]');
    expect(headerBand?.className).toContain('border-[color:var(--border-default)]');
    expect(probeCard?.className).toContain('bg-[var(--surface-panel)]');
    expect(probeCard?.className).toContain('border-[color:var(--border-default)]');
    expect(pluginCards).toHaveLength(PLUGIN_REGISTRY.length);
    expect(mounted.container.innerHTML).not.toContain('bg-slate-900');
    expect(mounted.container.innerHTML).not.toContain('bg-slate-950');
    expect(mounted.container.innerHTML).not.toContain('border-slate-700');
    expect(mounted.container.innerHTML).not.toContain('text-amber-200');
    expect(mounted.container.innerHTML).not.toContain('text-red-400');
    expect(mounted.container.textContent).toContain('Loaded');

    if (backendPlugin) {
      const card = mounted.container.querySelector(
        `[data-slot="plugin-card"][data-plugin-id="${backendPlugin.id}"]`
      );

      expect(card?.textContent).toContain('Available');
      expect(card?.textContent).toContain('Ready');
    }
  });

  it('renders a loading probe state while capability availability is pending', async () => {
    const capabilitiesPort: CapabilitiesPort = {
      loadCapabilities: vi.fn(() => new Promise<RuntimeCapabilitiesDto>(() => {})),
    };

    mounted = await withTestQueryClient(
      <AppServicesProvider overrides={{ mode: 'mock', capabilitiesPort }}>
        <PluginsView />
      </AppServicesProvider>
    );

    const probeCard = mounted.container.querySelector('[data-slot="plugins-capability-probe"]');
    const backendPlugin = PLUGIN_REGISTRY.find((plugin) => plugin.backendPluginId);

    expect(probeCard?.textContent).toContain('Checking backend capability availability.');
    expect(probeCard?.textContent).toContain('Checking');

    if (backendPlugin) {
      const card = mounted.container.querySelector(
        `[data-slot="plugin-card"][data-plugin-id="${backendPlugin.id}"]`
      );

      expect(card?.textContent).toContain('Pending');
      expect(card?.textContent).toContain('Checking');
    }
  });

  it('renders degraded readiness when a backend capability entry is missing', async () => {
    const backendPlugin = PLUGIN_REGISTRY.find((plugin) => plugin.backendPluginId);

    if (!backendPlugin?.backendPluginId) {
      return;
    }

    const capabilitiesPort: CapabilitiesPort = {
      loadCapabilities: vi
        .fn()
        .mockResolvedValue(
          buildCapabilitiesPayload({ omitPluginIds: [backendPlugin.backendPluginId] })
        ),
    };

    mounted = await withTestQueryClient(
      <AppServicesProvider overrides={{ mode: 'mock', capabilitiesPort }}>
        <PluginsView />
      </AppServicesProvider>
    );

    await waitForReactQuery(
      () =>
        mounted?.container
          .querySelector(`[data-slot="plugin-card"][data-plugin-id="${backendPlugin.id}"]`)
          ?.textContent?.includes('Unknown') === true,
      { description: 'plugin missing backend capability render' }
    );

    const card = mounted.container.querySelector(
      `[data-slot="plugin-card"][data-plugin-id="${backendPlugin.id}"]`
    );

    expect(card?.textContent).toContain('Unknown');
    expect(card?.textContent).toContain('Degraded');
  });

  it('renders blocked readiness when the backend reports a plugin as unavailable', async () => {
    const backendPlugin = PLUGIN_REGISTRY.find((plugin) => plugin.backendPluginId);

    if (!backendPlugin?.backendPluginId) {
      return;
    }

    const capabilitiesPort: CapabilitiesPort = {
      loadCapabilities: vi.fn().mockResolvedValue(
        buildCapabilitiesPayload({
          overrides: {
            [backendPlugin.backendPluginId]: {
              available: false,
              reason: 'disabled in backend',
            },
          },
        })
      ),
    };

    mounted = await withTestQueryClient(
      <AppServicesProvider overrides={{ mode: 'mock', capabilitiesPort }}>
        <PluginsView />
      </AppServicesProvider>
    );

    await waitForReactQuery(
      () =>
        mounted?.container
          .querySelector(`[data-slot="plugin-card"][data-plugin-id="${backendPlugin.id}"]`)
          ?.textContent?.includes('Blocked') === true,
      { description: 'plugin blocked backend capability render' }
    );

    const card = mounted.container.querySelector(
      `[data-slot="plugin-card"][data-plugin-id="${backendPlugin.id}"]`
    );

    expect(card?.textContent).toContain('Blocked');
    expect(card?.textContent).toContain('disabled in backend');
  });

  it('renders degraded readiness when the capability probe fails', async () => {
    const capabilitiesPort: CapabilitiesPort = {
      loadCapabilities: vi.fn().mockRejectedValue(new Error('probe down')),
    };

    mounted = await withTestQueryClient(
      <AppServicesProvider overrides={{ mode: 'mock', capabilitiesPort }}>
        <PluginsView />
      </AppServicesProvider>
    );

    await waitForReactQuery(
      () => mounted?.container.textContent?.includes('Capability probe unavailable.') === true,
      { description: 'plugin capability probe error render' }
    );

    const probeCard = mounted.container.querySelector('[data-slot="plugins-capability-probe"]');
    const backendPlugin = PLUGIN_REGISTRY.find((plugin) => plugin.backendPluginId);

    expect(probeCard?.textContent).toContain('Probe unavailable');
    expect(probeCard?.textContent).toContain('Capability probe unavailable.');

    if (backendPlugin) {
      const card = mounted.container.querySelector(
        `[data-slot="plugin-card"][data-plugin-id="${backendPlugin.id}"]`
      );

      expect(card?.textContent).toContain('Probe unavailable');
      expect(card?.textContent).toContain('Degraded');
    }
  });
});
