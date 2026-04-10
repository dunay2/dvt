import type { RuntimeCapabilitiesDto } from '../../capabilities/runtime-capabilities';
import {
  getDefaultCoreViewPath,
  getNavigationViews,
  getRegisteredPluginIds,
} from '../plugins/registry';
import { buildShellNavigationModel } from './shellNavigationModel';

function normalizeCapabilities(
  capabilities: RuntimeCapabilitiesDto | undefined
): RuntimeCapabilitiesDto | undefined {
  if (!capabilities || typeof capabilities.plugins !== 'object' || capabilities.plugins === null) {
    return undefined;
  }

  return capabilities;
}

export function buildShellRuntimeState(capabilities: RuntimeCapabilitiesDto | undefined) {
  const runtimeCapabilities = normalizeCapabilities(capabilities);
  const navigationViews = getNavigationViews(runtimeCapabilities);
  const defaultCoreViewPath = getDefaultCoreViewPath(runtimeCapabilities);
  const registeredPluginIds = getRegisteredPluginIds(runtimeCapabilities);
  const navigationModel = buildShellNavigationModel(navigationViews);

  return {
    capabilities: runtimeCapabilities,
    navigationViews,
    navigationModel,
    defaultCoreViewPath,
    registeredPluginIds,
    enabledPluginIds: new Set(registeredPluginIds),
  };
}
