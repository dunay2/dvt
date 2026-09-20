/** Owned concern: route toolbar intents to existing Substrait mutation owners. */
import { PostgresIdentifierV1Schema } from '@dvt/contracts';
import {
  applyDvtSubstraitInnerJoinGrouping,
  applyDvtSubstraitInnerJoinGroupedRowNumber,
  inspectDvtSubstraitJoinAcceptedDraft,
  removeDvtSubstraitInnerJoinGrouping,
  removeDvtSubstraitInnerJoinGroupedRowNumber,
  renameDvtSubstraitInnerJoinCountOutput,
  renameDvtSubstraitInnerJoinGroupedRowNumberOutput,
} from './canvasDvtSubstraitJoinComposition';
import {
  applyDvtSubstraitUnionAllGrouping,
  applyDvtSubstraitUnionAllGroupedRowNumber,
  inspectDvtSubstraitUnionAllAcceptedDraft,
  removeDvtSubstraitUnionAllGrouping,
  removeDvtSubstraitUnionAllGroupedRowNumber,
  renameDvtSubstraitUnionAllCountOutput,
  renameDvtSubstraitUnionAllGroupedRowNumberOutput,
} from './canvasDvtSubstraitSetComposition';
import { applyDvtSubstraitFilter, removeDvtSubstraitFilter } from './canvasDvtSubstraitFilter';
import { createDvtSubstraitProjectionOutput } from './canvasDvtSubstraitCalculatedColumn';
import type { DvtSubstraitProjectionDraft } from './canvasDvtSubstraitProjection';
import type { DvtSubstraitSortKey } from '@dvt/postgres-projection';
import {
  applyDvtSubstraitFetch,
  applyDvtSubstraitSort,
  removeDvtSubstraitSortFetch,
  selectCanvasDvtSubstraitSortFetch,
} from './canvasDvtSubstraitSortFetch';
import {
  resolveCanvasRelationalOperatorTools,
  type CanvasRelationalOperatorTool,
} from './canvasRelationalTreeOperatorModel';

export function applyCanvasRelationalOperatorTool(
  draft: DvtSubstraitProjectionDraft,
  request: Readonly<{
    tool: CanvasRelationalOperatorTool['id'];
    fieldId?: string;
    alias?: string;
    capabilityId?: string;
    value?: string;
    sortKeys?: readonly DvtSubstraitSortKey[];
    offset?: bigint | null;
    count?: bigint | null;
    targetRelationId?: string;
    remove?: boolean;
  }>
): DvtSubstraitProjectionDraft {
  const contextualDraft =
    request.targetRelationId == null
      ? draft
      : (selectCanvasDvtSubstraitSortFetch(draft, request.targetRelationId) ?? draft);
  const tool = resolveCanvasRelationalOperatorTools(contextualDraft).find(
    (item) => item.id === request.tool
  );
  if (tool?.enabled !== true) return draft;
  const join = inspectDvtSubstraitJoinAcceptedDraft(draft).ok;
  const union = inspectDvtSubstraitUnionAllAcceptedDraft(draft).ok;
  if (request.remove) {
    if (!tool.active) return draft;
    if (tool.id === 'filter') return removeDvtSubstraitFilter(draft);
    if (tool.id === 'sort' || tool.id === 'fetch') {
      return removeDvtSubstraitSortFetch(draft, tool.id, request.targetRelationId);
    }
    if (tool.id === 'aggregate')
      return join
        ? removeDvtSubstraitInnerJoinGrouping(draft)
        : removeDvtSubstraitUnionAllGrouping(draft);
    return join
      ? removeDvtSubstraitInnerJoinGroupedRowNumber(draft)
      : removeDvtSubstraitUnionAllGroupedRowNumber(draft);
  }
  if (tool.id === 'filter') {
    const field = tool.fields.find((item) => item.fieldId === request.fieldId);
    if (field == null || request.capabilityId == null || request.value == null) return draft;
    return applyDvtSubstraitFilter(draft, {
      fieldId: field.fieldId,
      dataType: field.dataType ?? '',
      capabilityId: request.capabilityId,
      value: request.value,
    });
  }
  if (tool.id === 'sort') {
    if (
      request.sortKeys == null ||
      request.sortKeys.length === 0 ||
      request.sortKeys.some((key) => !tool.fields.some((field) => field.fieldId === key.fieldId))
    ) {
      return draft;
    }
    try {
      return applyDvtSubstraitSort(draft, request.sortKeys, request.targetRelationId);
    } catch {
      return draft;
    }
  }
  if (tool.id === 'fetch') {
    try {
      return applyDvtSubstraitFetch(
        draft,
        {
          offset: request.offset,
          count: request.count,
        },
        request.targetRelationId
      );
    } catch {
      return draft;
    }
  }
  const alias = request.alias?.trim();
  if (alias == null || !PostgresIdentifierV1Schema.safeParse(alias).success) return draft;
  if (tool.id === 'aggregate') {
    if (tool.active)
      return join
        ? renameDvtSubstraitInnerJoinCountOutput(draft, alias)
        : renameDvtSubstraitUnionAllCountOutput(draft, alias);
    if (!tool.fields.some((field) => field.fieldId === request.fieldId)) return draft;
    const args = { groupFieldId: request.fieldId!, countOutputName: alias };
    return join
      ? applyDvtSubstraitInnerJoinGrouping(draft, args)
      : applyDvtSubstraitUnionAllGrouping(draft, args);
  }
  if (tool.active)
    return join
      ? renameDvtSubstraitInnerJoinGroupedRowNumberOutput(draft, alias)
      : renameDvtSubstraitUnionAllGroupedRowNumberOutput(draft, alias);
  if (join) return applyDvtSubstraitInnerJoinGroupedRowNumber(draft, { outputName: alias });
  if (union) return applyDvtSubstraitUnionAllGroupedRowNumber(draft, { outputName: alias });
  if (!tool.fields.some((field) => field.fieldId === request.fieldId)) return draft;
  const result = createDvtSubstraitProjectionOutput(draft, {
    alias,
    expression: { kind: 'row-number', orderFieldId: request.fieldId! },
  });
  return result.outcome === 'applied' ? result.draft : draft;
}
