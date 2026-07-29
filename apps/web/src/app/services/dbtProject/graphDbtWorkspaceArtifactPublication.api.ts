/** Owned concern: adapt graph-derived dbt artifact publication to protected browser HTTP. */
import {
  GraphDbtWorkspaceArtifactPublicationResultSchema,
  PublishGraphDbtWorkspaceArtifactsRequestSchema,
} from '@dvt/contracts';

import type { IGraphDbtWorkspaceArtifactPublicationCommandPort } from '../../ports/graphDbtWorkspaceArtifactPublication';
import type { ApiClient } from '../api/createApiClient';
import { readWorkspaceFilesScope } from '../workspace/workspaceFilesHttp';

const GRAPH_DBT_WORKSPACE_ARTIFACT_PUBLICATION_ENDPOINT =
  '/workspace/dbt/graph-artifacts/publications';

function buildScopedEndpoint(): string {
  return `${GRAPH_DBT_WORKSPACE_ARTIFACT_PUBLICATION_ENDPOINT}?${new URLSearchParams(
    readWorkspaceFilesScope()
  ).toString()}`;
}

export function createApiGraphDbtWorkspaceArtifactPublicationCommandPort(
  apiClient: ApiClient
): IGraphDbtWorkspaceArtifactPublicationCommandPort {
  return {
    async publish(request) {
      const payload = await apiClient.postJson(
        buildScopedEndpoint(),
        PublishGraphDbtWorkspaceArtifactsRequestSchema.parse(request)
      );
      return GraphDbtWorkspaceArtifactPublicationResultSchema.parse(payload);
    },
  };
}
