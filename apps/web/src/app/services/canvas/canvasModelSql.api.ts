/** Enforce scoped transport and response identity for the Model SQL query family. */
import {
  ModelSqlTargetSchema,
  ModelSqlContextResponseSchema,
  ModelSqlCompilationRequestSchema,
  ModelSqlCompilationResponseSchema,
  TransformSqlDraftDataSampleRequestSchema,
  TransformSqlDraftDataSampleResponseSchema,
  type ModelSqlTarget,
} from '@dvt/contracts';
import { sha256HexUtf8 } from '@dvt/crypto';

import {
  CanvasModelSqlQueryError,
  type ICanvasModelSqlQueryPort,
} from '../../ports/canvasModelSql';
import type { FrontendOperabilitySink } from '../../ports/frontendOperability';
import { ApiError, type ApiClient } from '../api/createApiClient';
import {
  createContractFailureEvent,
  recordFrontendOperabilityEvent,
} from '../operability/frontendOperabilityRecorder';
import { readWorkspaceGraphDraftScope } from '../workspace/workspaceGraphDraftHttp';

export function createApiCanvasModelSqlQueryPort(
  api: ApiClient,
  sink: FrontendOperabilitySink
): ICanvasModelSqlQueryPort {
  const endpoint = (target: ModelSqlTarget, leaf: string) => {
    const scope = readWorkspaceGraphDraftScope();
    return `/workspace/graph/canvases/${encodeURIComponent(target.canvasId)}/transforms/${encodeURIComponent(target.transformNodeId)}/${leaf}?${new URLSearchParams(scope)}`;
  };
  const targetMatches = (expected: ModelSqlTarget, actual: ModelSqlTarget) =>
    expected.canvasId === actual.canvasId && expected.transformNodeId === actual.transformNodeId;
  const rejected = (rail: Parameters<typeof createContractFailureEvent>[0]) => {
    recordFrontendOperabilityEvent(
      sink,
      createContractFailureEvent(rail, 'response-contract-rejected')
    );
    throw new CanvasModelSqlQueryError('contract');
  };
  const request = async <T>(action: () => Promise<T>): Promise<T> => {
    try {
      return await action();
    } catch (error) {
      if (
        error instanceof CanvasModelSqlQueryError ||
        (error instanceof DOMException && error.name === 'AbortError')
      )
        throw error;
      throw new CanvasModelSqlQueryError(
        error instanceof ApiError
          ? error.statusCode === 409
            ? 'stale'
            : error.statusCode === 403 || error.statusCode === 401
              ? 'denied'
              : 'unavailable'
          : 'unavailable'
      );
    }
  };
  return {
    context: (input, signal) =>
      request(async () => {
        ModelSqlTargetSchema.parse(input);
        const parsed = ModelSqlContextResponseSchema.safeParse(
          await api.getJson(endpoint(input, 'sql-context'), signal == null ? {} : { signal })
        );
        if (!parsed.success || !targetMatches(input, parsed.data))
          return rejected('ProjectCanvasModelSqlContext');
        return parsed.data;
      }),
    compile: (input, signal) =>
      request(async () => {
        ModelSqlCompilationRequestSchema.parse(input);
        const parsed = ModelSqlCompilationResponseSchema.safeParse(
          await api.postJson(
            endpoint(input, 'sql-compilation'),
            input,
            signal == null ? {} : { signal }
          )
        );
        if (
          !parsed.success ||
          !targetMatches(input, parsed.data) ||
          parsed.data.contextSha256 !== input.contextSha256 ||
          parsed.data.draftRevision !== input.draftRevision ||
          parsed.data.sqlSha256 !== sha256HexUtf8(input.sql)
        )
          return rejected('CompileCanvasModelSql');
        return parsed.data;
      }),
    preview: (input, signal) =>
      request(async () => {
        TransformSqlDraftDataSampleRequestSchema.parse(input);
        const parsed = TransformSqlDraftDataSampleResponseSchema.safeParse(
          await api.postJson(
            endpoint(input, 'data-sample'),
            input,
            signal == null ? {} : { signal }
          )
        );
        if (
          !parsed.success ||
          !targetMatches(input, parsed.data.sample) ||
          parsed.data.contextSha256 !== input.contextSha256 ||
          parsed.data.sample.draftRevision !== input.draftRevision ||
          parsed.data.sqlSha256 !== sha256HexUtf8(input.sql)
        )
          return rejected('PreviewCanvasTransformRows');
        return parsed.data;
      }),
  };
}
