/** Translate form values into the existing selected-relation commands. */
import type { SubstraitDocument } from '@dvt/substrait-analysis';
import type { DvtSubstraitSortKey } from '@dvt/postgres-projection';
import type { CanvasRelationAnalysisSession } from '../canvasRelationAnalysisSession';
import type { SelectedUnaryRequest } from '../canvasSelectedRelationUnary';
import { applySelectedRelationFilter } from '../canvasSelectedRelationFilter';
import { applySelectedRelationSortFetch } from '../canvasSelectedRelationSortFetch';
import { removeSelectedRelationPassthrough } from '../canvasSelectedRelationPassthrough';

type UnaryFormRequest = SelectedUnaryRequest &
  Readonly<{
    tool: 'filter' | 'sort' | 'fetch';
    fieldId: string;
    value: string;
    capabilityId: string;
    sortKeys: readonly DvtSubstraitSortKey[];
    offset: string;
    count: string;
    remove: boolean;
  }>;

const apply: Record<
  UnaryFormRequest['tool'],
  (session: CanvasRelationAnalysisSession, request: UnaryFormRequest) => Promise<SubstraitDocument>
> = {
  filter: (session, request) => applySelectedRelationFilter(session, request),
  sort: (session, request) =>
    applySelectedRelationSortFetch(session, {
      ...request,
      operation: 'sort',
      keys: request.sortKeys,
    }),
  fetch: (session, request) =>
    applySelectedRelationSortFetch(session, {
      ...request,
      operation: 'fetch',
      offset: request.offset.trim() === '' ? undefined : BigInt(request.offset),
      count: request.count.trim() === '' ? undefined : BigInt(request.count),
    }),
};

export async function applySelectedUnaryTool(
  session: CanvasRelationAnalysisSession,
  request: UnaryFormRequest
): Promise<SubstraitDocument> {
  return request.remove
    ? removeSelectedRelationPassthrough(
        session,
        request.relationId,
        request.expectedRevision,
        request.signal
      )
    : apply[request.tool](session, request);
}
