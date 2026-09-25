/** Translate form values into the existing selected-relation commands. */
import type { SubstraitDocument } from '@dvt/substrait-analysis';
import type { DvtSubstraitSortKey } from '@dvt/postgres-projection';
import type { CanvasRelationAnalysisSession } from '../canvasRelationAnalysisSession';
import type { SelectedUnaryRequest } from '../canvasSelectedRelationUnary';
import { applySelectedRelationFilter } from '../canvasSelectedRelationFilter';
import { applySelectedRelationSortFetch } from '../canvasSelectedRelationSortFetch';
import { applySelectedRelationAggregate } from '../canvasSelectedRelationAggregate';
import { applySelectedRelationWindow } from '../canvasSelectedRelationWindow';

type UnaryFormRequest = SelectedUnaryRequest &
  Readonly<{
    tool: 'filter' | 'sort' | 'fetch' | 'aggregate' | 'window';
    alias: string;
    fieldId: string;
    partitionFieldIds?: readonly string[];
    value: string;
    capabilityId: string;
    sortKeys: readonly DvtSubstraitSortKey[];
    offset: string;
    count: string;
  }>;

const apply: Record<
  UnaryFormRequest['tool'],
  (session: CanvasRelationAnalysisSession, request: UnaryFormRequest) => Promise<SubstraitDocument>
> = {
  aggregate: applySelectedRelationAggregate,
  window: applySelectedRelationWindow,
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
  return apply[request.tool](session, request);
}
