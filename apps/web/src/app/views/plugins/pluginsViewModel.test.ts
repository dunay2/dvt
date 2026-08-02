import { describe, expect, it } from 'vitest';

import type { PluginContributions } from '../../plugins/registry';
import type { Plugin } from '../../types/dbt';

import { reconcilePluginCatalog } from './pluginCatalogReconciliation';
import { resolvePluginsViewCopy } from './pluginsViewCopy';
import { type PluginCapabilitiesSnapshot, resolvePluginReadiness } from './pluginsViewModel';

const copy = resolvePluginsViewCopy('en');

function catalogPlugin(id: string, backendPluginId?: string): Plugin {
  return {
    id,
    name: id,
    version: '0.5.3',
    description: id,
    capabilities: [],
    enabled: true,
    permissions: [],
    ...(backendPluginId ? { backendPluginId } : {}),
  };
}

function contribution(id: string): PluginContributions {
  return { id, displayName: id, version: '0.5.3' };
}

function reconcile(catalog: Plugin, local?: PluginContributions) {
  return reconcilePluginCatalog({
    catalog: [catalog],
    localContributions: local ? [local] : [],
  }).entries[0]!;
}

const backendStateFixtures: readonly Readonly<{
  name: string;
  capabilities: Pick<PluginCapabilitiesSnapshot, 'plugins'> | undefined;
  loading: boolean;
  error: unknown;
  backendState: string;
  operationalState: string;
}>[] = [
  {
    name: 'pending probe',
    capabilities: undefined,
    loading: true,
    error: null,
    backendState: 'pending',
    operationalState: 'pending',
  },
  {
    name: 'failed probe',
    capabilities: undefined,
    loading: false,
    error: new Error('probe down'),
    backendState: 'probe-unavailable',
    operationalState: 'degraded',
  },
  {
    name: 'missing capability row',
    capabilities: { plugins: {} },
    loading: false,
    error: null,
    backendState: 'unknown',
    operationalState: 'degraded',
  },
  {
    name: 'unavailable backend',
    capabilities: { plugins: { backend: { available: false } } },
    loading: false,
    error: null,
    backendState: 'unavailable',
    operationalState: 'blocked',
  },
];

describe('resolvePluginReadiness', () => {
  it('reports a matched frontend-only plugin as registered and ready', () => {
    const readiness = resolvePluginReadiness(
      reconcile(catalogPlugin('frontend'), contribution('frontend')),
      undefined,
      false,
      null,
      copy
    );

    expect(readiness).toMatchObject({
      backendState: 'not-required',
      operationalState: 'ready',
      frontendPresence: 'registered',
      runtimeShape: 'frontend-only',
      summary: { label: 'Ready' },
    });
    expect(readiness.items.find((item) => item.key === 'frontend')?.label).toBe('Loaded');
  });

  it('reports an available backend-only catalog row without claiming frontend registration', () => {
    const readiness = resolvePluginReadiness(
      reconcile(catalogPlugin('backend-only', 'backend-service')),
      { plugins: { 'backend-service': { available: true } } },
      false,
      null,
      copy
    );

    expect(readiness).toMatchObject({
      backendState: 'available',
      operationalState: 'ready',
      frontendPresence: 'not-registered',
      runtimeShape: 'backend-only',
      summary: { label: 'Ready' },
    });
    expect(readiness.items.find((item) => item.key === 'frontend')?.label).toBe('Not registered');
    expect(readiness.items.find((item) => item.key === 'frontend')?.detail).not.toContain('loaded');
  });

  it('keeps a catalog row without frontend or backend binding visibly unbound', () => {
    const readiness = resolvePluginReadiness(
      reconcile(catalogPlugin('unbound')),
      undefined,
      false,
      null,
      copy
    );

    expect(readiness).toMatchObject({
      backendState: 'not-bound',
      operationalState: 'unbound',
      frontendPresence: 'not-registered',
      runtimeShape: 'unbound',
      summary: { label: 'Unbound' },
    });
  });

  it.each(backendStateFixtures)('preserves source-owned backend semantics for $name', (fixture) => {
    const readiness = resolvePluginReadiness(
      reconcile(catalogPlugin('plugin', 'backend'), contribution('plugin')),
      fixture.capabilities,
      fixture.loading,
      fixture.error,
      copy
    );

    expect(readiness.backendState).toBe(fixture.backendState);
    expect(readiness.operationalState).toBe(fixture.operationalState);
  });
});
