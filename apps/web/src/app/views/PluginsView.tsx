/** Owned concern: adapt the Plugins route query state into the route workbench frame. */
import { RouteWorkbenchFrame } from '../components/workbench/RouteWorkbenchFrame';
import { useCapabilitiesQuery } from '../queries/useCapabilitiesQuery';

import { PluginsPrimarySurface, PluginsViewHeader } from './plugins/PluginsRouteWorkbench';
import { resolveProbeStatus } from './plugins/pluginsViewModel';

export default function PluginsView() {
  const {
    data: capabilities,
    error: capabilitiesError,
    isLoading: capabilitiesLoading,
  } = useCapabilitiesQuery();
  const probeStatus = resolveProbeStatus(
    capabilitiesLoading,
    capabilitiesError,
    capabilities != null
  );

  return (
    <RouteWorkbenchFrame
      header={<PluginsViewHeader capabilities={capabilities} />}
      bodyContainerClassName="space-y-6"
      slots={{
        primarySurface: (
          <PluginsPrimarySurface
            capabilities={capabilities}
            capabilitiesError={capabilitiesError}
            capabilitiesLoading={capabilitiesLoading}
            probeStatus={probeStatus}
          />
        ),
      }}
    />
  );
}
