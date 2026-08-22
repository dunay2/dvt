/** Owned concern: adapt Graph Draft DBT model compilation to protected browser HTTP. */
import {
  CompileGraphDbtModelsRequestSchema,
  GraphDbtModelCompilationResultSchema,
} from '@dvt/contracts';

import type { IGraphDbtModelCompilationQueryPort } from '../../ports/graphDbtModelCompilation';
import type { ApiClient } from '../api/createApiClient';
import { readWorkspaceFilesScope } from '../workspace/workspaceFilesHttp';

const GRAPH_DBT_MODEL_COMPILATION_ENDPOINT = '/workspace/dbt/graph-artifacts/compiled-models';

function buildScopedEndpoint(): string {
  return `${GRAPH_DBT_MODEL_COMPILATION_ENDPOINT}?${new URLSearchParams(
    readWorkspaceFilesScope()
  ).toString()}`;
}

export function createApiGraphDbtModelCompilationQueryPort(
  apiClient: ApiClient
): IGraphDbtModelCompilationQueryPort {
  return {
    async compile(request) {
      const payload = await apiClient.postJson(
        buildScopedEndpoint(),
        CompileGraphDbtModelsRequestSchema.parse(request)
      );
      return GraphDbtModelCompilationResultSchema.parse(payload);
    },
  };
}
