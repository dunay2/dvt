/** Owned concern: reconcile DB-authoritative plugin rows with optional local contributions. */
import type { PluginContributions } from '../../plugins/registry';
import type { Plugin } from '../../types/dbt';

export type PluginFrontendPresence = 'registered' | 'not-registered';

export type PluginRuntimeShape =
  'frontend-only' | 'frontend-and-backend' | 'backend-only' | 'unbound';

type PluginCatalogReconciliationBase = Readonly<{
  catalog: Plugin;
}>;

export type PluginCatalogReconciliation =
  | (PluginCatalogReconciliationBase &
      Readonly<{
        localContribution: PluginContributions;
        frontendPresence: 'registered';
        backendPluginId?: never;
        runtimeShape: 'frontend-only';
      }>)
  | (PluginCatalogReconciliationBase &
      Readonly<{
        localContribution: PluginContributions;
        frontendPresence: 'registered';
        backendPluginId: string;
        runtimeShape: 'frontend-and-backend';
      }>)
  | (PluginCatalogReconciliationBase &
      Readonly<{
        localContribution: null;
        frontendPresence: 'not-registered';
        backendPluginId: string;
        runtimeShape: 'backend-only';
      }>)
  | (PluginCatalogReconciliationBase &
      Readonly<{
        localContribution: null;
        frontendPresence: 'not-registered';
        backendPluginId?: never;
        runtimeShape: 'unbound';
      }>);

export type PluginCatalogReconciliationResult = Readonly<{
  entries: readonly PluginCatalogReconciliation[];
  localOnlyContributions: readonly PluginContributions[];
}>;

type ReconcilePluginCatalogInput = Readonly<{
  catalog: readonly Plugin[];
  localContributions: readonly PluginContributions[];
}>;

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

    if (localContribution && backendPluginId) {
      return {
        catalog: catalogPlugin,
        localContribution,
        frontendPresence: 'registered',
        backendPluginId,
        runtimeShape: 'frontend-and-backend',
      };
    }
    if (localContribution) {
      return {
        catalog: catalogPlugin,
        localContribution,
        frontendPresence: 'registered',
        runtimeShape: 'frontend-only',
      };
    }
    if (backendPluginId) {
      return {
        catalog: catalogPlugin,
        localContribution: null,
        frontendPresence: 'not-registered',
        backendPluginId,
        runtimeShape: 'backend-only',
      };
    }
    return {
      catalog: catalogPlugin,
      localContribution: null,
      frontendPresence: 'not-registered',
      runtimeShape: 'unbound',
    };
  });

  return {
    entries,
    localOnlyContributions: localContributions.filter(
      (contribution) => !catalogIds.has(contribution.id)
    ),
  };
}
