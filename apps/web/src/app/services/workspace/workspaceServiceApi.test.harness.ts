import { createApiWorkspaceService } from './workspaceService.api';
import { createApiClientHarness } from './workspaceApiClient.test.harness';

export function createApiWorkspaceServiceHarness(
  options: Parameters<typeof createApiClientHarness>[0] = {}
) {
  const { apiClient, requestRaw, getJson, postJson } = createApiClientHarness(options);

  return {
    requestRaw,
    getJson,
    postJson,
    service: createApiWorkspaceService(apiClient),
  };
}
