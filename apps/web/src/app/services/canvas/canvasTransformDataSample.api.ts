/** Owned concern: adapt Transform row sample queries to the protected Canvas API rail. */
import { TransformDataSampleResponseSchema } from '@dvt/contracts';

import type { FrontendOperabilitySink } from '../../ports/frontendOperability';
import {
  CanvasTransformDataSampleQueryError,
  type ICanvasTransformDataSampleQueryPort,
} from '../../ports/canvasDataSample';
import type { ApiClient } from '../api/createApiClient';
import {
  createContractFailureEvent,
  recordFrontendOperabilityEvent,
} from '../operability/frontendOperabilityRecorder';
import { readWorkspaceGraphDraftScope } from '../workspace/workspaceGraphDraftHttp';

export function createApiCanvasTransformDataSampleQueryPort(
  apiClient: ApiClient,
  frontendOperabilitySink: FrontendOperabilitySink
): ICanvasTransformDataSampleQueryPort {
  return {
    previewTransformRows: async (input) => {
      const scope = readWorkspaceGraphDraftScope();
      const params = new URLSearchParams({
        tenantId: scope.tenantId,
        projectId: scope.projectId,
        environmentId: scope.environmentId,
        limit: String(input.limit),
      });
      const endpoint = `/workspace/graph/canvases/${encodeURIComponent(input.canvasId)}/transforms/${encodeURIComponent(input.transformNodeId)}/data-sample?${params}`;
      try {
        const response = await apiClient.getJson(endpoint);
        const parsed = TransformDataSampleResponseSchema.safeParse(response);
        if (!parsed.success) {
          recordFrontendOperabilityEvent(
            frontendOperabilitySink,
            createContractFailureEvent('PreviewCanvasTransformRows', 'response-contract-rejected')
          );
          throw parsed.error;
        }
        return parsed.data;
      } catch (error) {
        if (error instanceof CanvasTransformDataSampleQueryError) throw error;
        throw new CanvasTransformDataSampleQueryError();
      }
    },
  };
}
