/** Owned concern: adapt the Plugins route query state into the route workbench frame. */
import { useMemo } from 'react';

import { RouteWorkbenchFrame } from '../components/workbench/RouteWorkbenchFrame';
import { PLUGIN_REGISTRY } from '../plugins/registry';
import { useCapabilitiesQuery } from '../queries/useCapabilitiesQuery';
import { useWorkspacePluginCatalogQuery } from '../queries/workspaceQueries';

import { reconcilePluginCatalog } from './plugins/pluginCatalogReconciliation';
import { PluginsPrimarySurface, PluginsViewHeader } from './plugins/PluginsRouteWorkbench';
import { resolvePluginsViewCopy } from './plugins/pluginsViewCopy';
import { resolveProbeStatus } from './plugins/pluginsViewModel';

export default function PluginsView() {
  const {
    data: capabilities,
    error: capabilitiesError,
    isLoading: capabilitiesLoading,
  } = useCapabilitiesQuery();
  const {
    data: pluginCatalog,
    error: pluginCatalogError,
    isLoading: pluginCatalogLoading,
  } = useWorkspacePluginCatalogQuery();
  const copy = resolvePluginsViewCopy();
  const reconciliation = useMemo(
    () =>
      pluginCatalog === undefined
        ? undefined
        : reconcilePluginCatalog({
            catalog: pluginCatalog,
            localContributions: PLUGIN_REGISTRY,
          }),
    [pluginCatalog]
  );
  const probeStatus = resolveProbeStatus(
    capabilitiesLoading,
    capabilitiesError,
    capabilities != null,
    copy
  );

  return (
    <RouteWorkbenchFrame
      header={
        <PluginsViewHeader
          capabilities={capabilities}
          copy={copy}
          reconciliation={reconciliation}
        />
      }
      bodyContainerClassName="space-y-6"
      slots={{
        primarySurface: (
          <PluginsPrimarySurface
            capabilities={capabilities}
            capabilitiesError={capabilitiesError}
            capabilitiesLoading={capabilitiesLoading}
            copy={copy}
            pluginCatalogError={pluginCatalogError}
            pluginCatalogLoading={pluginCatalogLoading}
            probeStatus={probeStatus}
            reconciliation={reconciliation}
          />
        ),
      }}
    />
  );
}
