/** Bind a proposal response to the exact scoped source buffer and complete graph digest. */
import {
  WorksheetCanvasModelProposalSchema,
  WorksheetCanvasModelRequestSchema,
  type WorksheetCanvasModelProposal,
  type WorksheetCanvasModelRequest,
} from '@dvt/contracts';
import { jcsCanonicalize, sha256HexUtf8 } from '@dvt/crypto';
import {
  WorksheetCanvasModelQueryError,
  type IWorksheetCanvasModelQueryPort,
  type WorksheetCanvasModelFailure,
} from '../../ports/worksheetCanvasModel';
import { ApiError, type ApiClient } from '../api/createApiClient';
import { readWorkspaceGraphDraftScope } from '../workspace/workspaceGraphDraftHttp';

function matchesProposal(
  input: WorksheetCanvasModelRequest,
  scope: ReturnType<typeof readWorkspaceGraphDraftScope>,
  result: WorksheetCanvasModelProposal
): boolean {
  const actual = {
    canvasId: result.canvasId,
    modelId: result.modelId,
    name: result.name,
    revision: result.expectedRevision,
    sql: result.sqlSha256,
    connection: result.connectionRef,
    scope: result.scope,
  };
  const expected = {
    canvasId: input.canvasId,
    modelId: input.modelId,
    name: input.name,
    revision: input.expectedRevision,
    sql: sha256HexUtf8(input.sql),
    connection: input.connectionRef,
    scope,
  };
  if (jcsCanonicalize(actual) !== jcsCanonicalize(expected)) return false;
  if (!matchesProposalMode(input, result)) return false;
  if (result.status !== 'valid') return true;
  const { proposalSha256, ...body } = result;
  return proposalSha256 === sha256HexUtf8(jcsCanonicalize(body));
}

function matchesProposalMode(
  input: WorksheetCanvasModelRequest,
  result: WorksheetCanvasModelProposal
): boolean {
  if (input.verifyContextSha256 === undefined) return result.status !== 'current';
  if (result.status !== 'current') return false;
  return result.contextSha256 === input.verifyContextSha256;
}

const httpFailures: ReadonlyMap<number, WorksheetCanvasModelFailure> = new Map([
  [401, 'denied'],
  [403, 'denied'],
  [409, 'stale'],
]);
const isAborted = (error: unknown) => error instanceof DOMException && error.name === 'AbortError';

function httpFailure(error: unknown): WorksheetCanvasModelFailure {
  if (!(error instanceof ApiError)) return 'unavailable';
  return httpFailures.get(error.statusCode ?? 0) ?? 'unavailable';
}

function transportFailure(error: unknown): never {
  if (error instanceof WorksheetCanvasModelQueryError) throw error;
  if (isAborted(error)) throw error;
  throw new WorksheetCanvasModelQueryError(httpFailure(error));
}

export function createWorksheetCanvasModelQuery(api: ApiClient): IWorksheetCanvasModelQueryPort {
  return {
    async propose(input, signal) {
      WorksheetCanvasModelRequestSchema.parse(input);
      const scope = readWorkspaceGraphDraftScope();
      const endpoint = `/workspace/graph/canvases/${encodeURIComponent(input.canvasId)}/sql-model-proposal?${new URLSearchParams(scope)}`;
      try {
        const parsed = WorksheetCanvasModelProposalSchema.safeParse(
          await api.postJson(endpoint, input, signal == null ? {} : { signal })
        );
        if (!parsed.success || !matchesProposal(input, scope, parsed.data))
          throw new WorksheetCanvasModelQueryError('contract');
        return parsed.data;
      } catch (error) {
        return transportFailure(error);
      }
    },
  };
}
