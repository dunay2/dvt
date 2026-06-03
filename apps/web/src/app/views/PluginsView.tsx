/** Owned concern: adapt the Plugins route query state into the route workbench frame. */
import { RouteWorkbenchFrame } from '../components/workbench/RouteWorkbenchFrame';
import { useCapabilitiesQuery } from '../queries/useCapabilitiesQuery';
import { useWorkspacePluginCatalogQuery } from '../queries/workspaceQueries';

import { PluginsPrimarySurface, PluginsViewHeader } from './plugins/PluginsRouteWorkbench';
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
  const probeStatus = resolveProbeStatus(
    capabilitiesLoading,
    capabilitiesError,
    capabilities != null
  );

  return (
    <RouteWorkbenchFrame
      header={<PluginsViewHeader capabilities={capabilities} pluginCatalog={pluginCatalog} />}
      bodyContainerClassName="space-y-6"
      slots={{
        primarySurface: (
          <PluginsPrimarySurface
            capabilities={capabilities}
            capabilitiesError={capabilitiesError}
            capabilitiesLoading={capabilitiesLoading}
            pluginCatalog={pluginCatalog}
            pluginCatalogError={pluginCatalogError}
            pluginCatalogLoading={pluginCatalogLoading}
            probeStatus={probeStatus}
          />
        ),
      }}
    />
  );
}
