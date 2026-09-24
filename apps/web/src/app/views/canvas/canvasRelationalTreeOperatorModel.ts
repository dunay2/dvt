/** Owned concern: project admitted operator controls from canonical draft inspections. */
import { DVT_SUBSTRAIT_CAPABILITY_CATALOG_V1 } from '@dvt/contracts';
import {
  inspectDvtSubstraitJoinAcceptedDraft,
  inspectDvtSubstraitInnerJoinGroupingDraft,
  inspectDvtSubstraitInnerJoinGroupedWindowDraft,
} from './canvasDvtSubstraitJoinComposition';
import {
  inspectDvtSubstraitUnionAllAcceptedDraft,
  inspectDvtSubstraitUnionAllGroupingDraft,
  inspectDvtSubstraitUnionAllGroupedWindowDraft,
} from './canvasDvtSubstraitSetComposition';
import {
  inspectDvtSubstraitProjectionDraft,
  type DvtSubstraitProjectionDraft,
} from './canvasDvtSubstraitProjection';
import { resolveDvtSubstraitFilterCapabilities } from './canvasFilterCapabilities';
import { inspectDvtSubstraitFilter, removeDvtSubstraitFilter } from './canvasDvtSubstraitFilter';
import {
  inspectCanvasDvtSubstraitSortFetch,
  resolveDvtSubstraitSortFetchInputFields,
} from './canvasDvtSubstraitSortFetch';
import type { DvtSubstraitSortKey } from '@dvt/postgres-projection';

export type CanvasRelationalOperatorTool = Readonly<{
  id: 'filter' | 'aggregate' | 'window' | 'sort' | 'fetch';
  enabled: boolean;
  active: boolean;
  fields: readonly Readonly<{ fieldId: string; name: string; dataType?: string }>[];
  alias?: string;
  fieldId?: string;
  value?: string;
  capabilityId?: string;
  comparisons?: ReturnType<typeof resolveDvtSubstraitFilterCapabilities>;
  tieBreaker?: string;
  order?: string;
  sortKeys?: readonly DvtSubstraitSortKey[];
  offset?: bigint | null;
  count?: bigint | null;
}>;

export function resolveCanvasRelationalOperatorTools(
  draft: DvtSubstraitProjectionDraft
): readonly CanvasRelationalOperatorTool[] {
  const supported = DVT_SUBSTRAIT_CAPABILITY_CATALOG_V1.entries.filter(
    (entry) => entry.kind === 'standard' && entry.profileStatus === 'supported-profile'
  );
  const admitted = (fragment: string) =>
    supported.some((entry) => entry.entryId.endsWith(fragment));
  const join = inspectDvtSubstraitJoinAcceptedDraft(draft);
  const union = inspectDvtSubstraitUnionAllAcceptedDraft(draft);
  const window = join.ok
    ? inspectDvtSubstraitInnerJoinGroupedWindowDraft(draft)
    : inspectDvtSubstraitUnionAllGroupedWindowDraft(draft);
  const group = join.ok
    ? inspectDvtSubstraitInnerJoinGroupingDraft(draft)
    : inspectDvtSubstraitUnionAllGroupingDraft(draft);
  const filter = inspectDvtSubstraitFilter(draft);
  const projection = inspectDvtSubstraitProjectionDraft(removeDvtSubstraitFilter(draft));
  const fields = join.ok
    ? join.projection.outputs
    : union.ok
      ? union.projection.outputs
      : projection.ok
        ? projection.projection.outputs
        : [];
  const sourceFields = projection.ok
    ? projection.projection.outputs.filter((field) => field.sourceFieldName != null)
    : [];
  const grouping = group.ok ? group.projection : window.ok ? window.projection : null;
  const sortFetch = inspectCanvasDvtSubstraitSortFetch(draft);
  const sortFields = resolveDvtSubstraitSortFetchInputFields(draft, 'sort');
  const fetchFields = resolveDvtSubstraitSortFetchInputFields(draft, 'fetch');
  return [
    {
      id: 'aggregate',
      enabled:
        admitted('/substrait.AggregateRel') &&
        admitted('/count') &&
        (join.ok || union.ok) &&
        !window.ok,
      active: grouping != null,
      fields,
      alias: grouping?.measure.name,
      fieldId: grouping?.groupField.fieldId,
    },
    {
      id: 'window',
      enabled:
        admitted('/row_number') &&
        (group.ok || window.ok || (projection.ok && filter == null && sourceFields.length > 0)),
      active: window.ok,
      fields: sourceFields,
      alias: window.ok ? window.projection.result.name : undefined,
      tieBreaker: grouping?.groupField.name,
      order: grouping?.measure.name,
    },
    {
      id: 'sort',
      enabled: admitted('/substrait.SortRel') && sortFields.length > 0,
      active: sortFetch.ok && sortFetch.operation === 'sort',
      fields: sortFields,
      sortKeys: sortFetch.ok && sortFetch.operation === 'sort' ? sortFetch.keys : undefined,
    },
    {
      id: 'fetch',
      enabled: admitted('/substrait.FetchRel') && fetchFields.length > 0,
      active: sortFetch.ok && sortFetch.operation === 'fetch',
      fields: fetchFields,
      offset: sortFetch.ok && sortFetch.operation === 'fetch' ? sortFetch.offset : undefined,
      count: sortFetch.ok && sortFetch.operation === 'fetch' ? sortFetch.count : undefined,
    },
  ];
}
