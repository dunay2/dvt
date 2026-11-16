/** Adapt SQL inspection identities to the protected server-owned projection query. */
import {
  TransformSqlProjectionRequestSchema,
  TransformSqlProjectionResponseSchema,
} from '@dvt/contracts';
import {
  CanvasTransformSqlQueryError,
  type ICanvasTransformSqlQueryPort,
} from '../../ports/canvasTransformSql';
import type { FrontendOperabilitySink } from '../../ports/frontendOperability';
import type { ApiClient } from '../api/createApiClient';
import {
  createContractFailureEvent,
  recordFrontendOperabilityEvent,
} from '../operability/frontendOperabilityRecorder';
import { readWorkspaceGraphDraftScope } from '../workspace/workspaceGraphDraftHttp';

export function createApiCanvasTransformSqlQueryPort(
  apiClient: ApiClient,
  frontendOperabilitySink: FrontendOperabilitySink
): ICanvasTransformSqlQueryPort {
  return {
    async projectTransformSql(input) {
      try {
        TransformSqlProjectionRequestSchema.parse(input);
        const scope = readWorkspaceGraphDraftScope();
        const params = new URLSearchParams({
          ...scope,
          semanticPlanSha256: input.semanticPlanSha256,
          ...(input.relationId === undefined ? {} : { relationId: input.relationId }),
          ...(input.presentation === undefined ? {} : { presentation: input.presentation }),
        });
        const endpoint = `/workspace/graph/canvases/${encodeURIComponent(input.canvasId)}/transforms/${encodeURIComponent(input.transformNodeId)}/sql?${params}`;
        const response = await apiClient.getJson(endpoint);
        const parsed = TransformSqlProjectionResponseSchema.safeParse(response);
        if (
          !parsed.success ||
          parsed.data.canvasId !== input.canvasId ||
          parsed.data.transformNodeId !== input.transformNodeId ||
          parsed.data.semanticPlanSha256 !== input.semanticPlanSha256 ||
          parsed.data.relationId !== input.relationId ||
          (input.presentation === 'readable' && parsed.data.presentation === undefined) ||
          (input.presentation === undefined && parsed.data.presentation !== undefined)
        ) {
          recordFrontendOperabilityEvent(
            frontendOperabilitySink,
            createContractFailureEvent('ProjectCanvasTransformSql', 'response-contract-rejected')
          );
          throw new CanvasTransformSqlQueryError();
        }
        return parsed.data;
      } catch {
        throw new CanvasTransformSqlQueryError();
      }
    },
  };
}
