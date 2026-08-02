/** Owned concern: reconcile DB-authoritative plugin rows with optional local contributions. */
import type { PluginContributions } from '../../plugins/registry';
import type { Plugin } from '../../types/dbt';

export type PluginFrontendPresence = 'registered' | 'not-registered';

export type PluginRuntimeShape =
  'frontend-only' | 'frontend-and-backend' | 'backend-only' | 'unbound';

export type PluginCatalogReconciliation = Readonly<{
  catalog: Plugin;
  localContribution: PluginContributions | null;
  frontendPresence: PluginFrontendPresence;
  backendPluginId?: string;
  runtimeShape: PluginRuntimeShape;
}>;

export type PluginCatalogReconciliationResult = Readonly<{
  entries: readonly PluginCatalogReconciliation[];
  localOnlyContributions: readonly PluginContributions[];
}>;

type ReconcilePluginCatalogInput = Readonly<{
  catalog: readonly Plugin[];
  localContributions: readonly PluginContributions[];
}>;

function resolveRuntimeShape(
  hasFrontendContribution: boolean,
  hasBackendBinding: boolean
): PluginRuntimeShape {
  if (hasFrontendContribution && hasBackendBinding) {
    return 'frontend-and-backend';
  }
  if (hasFrontendContribution) {
    return 'frontend-only';
  }
  if (hasBackendBinding) {
    return 'backend-only';
  }
  return 'unbound';
}

export function reconcilePluginCatalog({
  catalog,
  localContributions,
}: ReconcilePluginCatalogInput): PluginCatalogReconciliationResult {
  const localById = new Map(
    localContributions.map((contribution) => [contribution.id, contribution])
  );
  const catalogIds = new Set(catalog.map((plugin) => plugin.id));

  const entries = catalog.map((catalogPlugin): PluginCatalogReconciliation => {
    const localContribution = localById.get(catalogPlugin.id) ?? null;
    const backendPluginId = catalogPlugin.backendPluginId ?? localContribution?.backendPluginId;
    const hasFrontendContribution = localContribution != null;
    const hasBackendBinding = backendPluginId != null;

    return {
      catalog: catalogPlugin,
      localContribution,
      frontendPresence: hasFrontendContribution ? 'registered' : 'not-registered',
      ...(backendPluginId ? { backendPluginId } : {}),
      runtimeShape: resolveRuntimeShape(hasFrontendContribution, hasBackendBinding),
    };
  });

  return {
    entries,
    localOnlyContributions: localContributions.filter(
      (contribution) => !catalogIds.has(contribution.id)
    ),
  };
}
