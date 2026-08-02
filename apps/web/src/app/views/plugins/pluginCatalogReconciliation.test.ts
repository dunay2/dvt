import { describe, expect, it } from 'vitest';

import type { PluginContributions } from '../../plugins/registry';
import type { Plugin } from '../../types/dbt';

import { reconcilePluginCatalog } from './pluginCatalogReconciliation';

function catalogPlugin(id: string, backendPluginId?: string): Plugin {
  return {
    id,
    name: `Catalog ${id}`,
    version: '0.5.3',
    description: `Catalog descriptor for ${id}`,
    capabilities: ['catalog.capability'],
    enabled: true,
    permissions: [],
    ...(backendPluginId ? { backendPluginId } : {}),
  };
}

function localContribution(id: string, backendPluginId?: string): PluginContributions {
  return {
    id,
    displayName: `Local ${id}`,
    version: '9.9.9',
    capabilities: ['canvas.render'],
    ...(backendPluginId ? { backendPluginId } : {}),
  };
}

describe('reconcilePluginCatalog', () => {
  it('keeps DB catalog membership authoritative and attaches exact local matches only', () => {
    const matched = localContribution('matched', 'local-backend');
    const localOnly = localContribution('local-only');
    const result = reconcilePluginCatalog({
      catalog: [
        catalogPlugin('matched', 'catalog-backend'),
        catalogPlugin('backend-only', 'backend-service'),
        catalogPlugin('unbound'),
      ],
      localContributions: [matched, localOnly],
    });

    expect(result.entries.map((entry) => entry.catalog.id)).toEqual([
      'matched',
      'backend-only',
      'unbound',
    ]);
    expect(result.localOnlyContributions).toEqual([localOnly]);
    expect(result.entries[0]).toMatchObject({
      catalog: { name: 'Catalog matched', version: '0.5.3' },
      localContribution: matched,
      frontendPresence: 'registered',
      backendPluginId: 'catalog-backend',
      runtimeShape: 'frontend-and-backend',
    });
    expect(result.entries[1]).toMatchObject({
      localContribution: null,
      frontendPresence: 'not-registered',
      backendPluginId: 'backend-service',
      runtimeShape: 'backend-only',
    });
    expect(result.entries[2]).toMatchObject({
      localContribution: null,
      frontendPresence: 'not-registered',
      runtimeShape: 'unbound',
    });
    expect(result.entries[2]).not.toHaveProperty('backendPluginId');
  });

  it('classifies a registered contribution without a backend binding as frontend-only', () => {
    const contribution = localContribution('frontend-only');

    const result = reconcilePluginCatalog({
      catalog: [catalogPlugin('frontend-only')],
      localContributions: [contribution],
    });

    expect(result.entries[0]).toMatchObject({
      localContribution: contribution,
      frontendPresence: 'registered',
      runtimeShape: 'frontend-only',
    });
  });
});
