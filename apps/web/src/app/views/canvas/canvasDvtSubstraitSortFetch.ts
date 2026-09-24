/** Preserve outer wrappers while the remaining aggregate and binary editors are migrated. */
import {
  createDvtSubstraitFetchDraft,
  createDvtSubstraitSortDraft,
  inspectDvtSubstraitSortFetchRoot,
  removeDvtSubstraitSortFetchRelation,
} from '@dvt/postgres-projection';

import type { DvtSubstraitProjectionDraft } from './canvasDvtSubstraitProjection';

type CanvasDvtSortFetchField = Readonly<{ fieldId: string; name: string }>;

function rootRelationId(draft: DvtSubstraitProjectionDraft): string | null {
  const root = draft.plan.relations[0]?.relType;
  if (root?.case !== 'root' || root.value.input == null) return null;
  const value: unknown = root.value.input.relType.value;
  const anchor =
    value != null && typeof value === 'object'
      ? (value as { common?: { relAnchor?: number } }).common?.relAnchor
      : undefined;
  return (
    draft.sidecar.relations.find((relation) => relation.relAnchor === anchor)?.relationId ?? null
  );
}

function fieldsForRelation(
  draft: DvtSubstraitProjectionDraft,
  relationId: string
): readonly CanvasDvtSortFetchField[] {
  return draft.sidecar.fields
    .filter((field) => field.relationId === relationId)
    .sort((left, right) => left.outputOrdinal - right.outputOrdinal)
    .flatMap((field) =>
      field.displayName == null ? [] : [{ fieldId: field.fieldId, name: field.displayName }]
    );
}

export type CanvasDvtSortFetchChain = Readonly<{
  base: DvtSubstraitProjectionDraft;
  wrappers: readonly Extract<ReturnType<typeof inspectDvtSubstraitSortFetchRoot>, { ok: true }>[];
}>;

export function peelCanvasDvtSubstraitSortFetch(
  draft: DvtSubstraitProjectionDraft
): CanvasDvtSortFetchChain {
  const wrappers: Array<
    Extract<ReturnType<typeof inspectDvtSubstraitSortFetchRoot>, { ok: true }>
  > = [];
  let base = draft;
  while (true) {
    const inspection = inspectDvtSubstraitSortFetchRoot(base);
    if (!inspection.ok) break;
    wrappers.push(inspection);
    const unwrapped = removeDvtSubstraitSortFetchRelation(base, inspection.relationId);
    if (unwrapped === base) break;
    base = unwrapped;
  }
  return { base, wrappers };
}

export function restoreCanvasDvtSubstraitSortFetch(
  chain: CanvasDvtSortFetchChain,
  replacementBase: DvtSubstraitProjectionDraft
): DvtSubstraitProjectionDraft | null {
  let rebuilt = replacementBase;
  try {
    for (const wrapper of [...chain.wrappers].reverse()) {
      const inputRelationId = rootRelationId(rebuilt);
      if (inputRelationId == null) return null;
      const inputFields = fieldsForRelation(rebuilt, inputRelationId);
      const outputByInputFieldId = new Map(
        wrapper.outputFields.flatMap((field) =>
          field.sourceFieldId == null ? [] : [[field.sourceFieldId, field.fieldId] as const]
        )
      );
      const outputFieldIds = inputFields.map((field) => outputByInputFieldId.get(field.fieldId));
      if (outputFieldIds.some((fieldId) => fieldId == null)) return null;
      const identity = {
        relationId: wrapper.relationId,
        outputFieldIds: outputFieldIds as string[],
      };
      if (wrapper.operation === 'sort') {
        const admitted = new Set(inputFields.map((field) => field.fieldId));
        if (wrapper.keys.some((key) => !admitted.has(key.fieldId))) return null;
        rebuilt = createDvtSubstraitSortDraft(rebuilt, { ...identity, keys: wrapper.keys });
      } else {
        rebuilt = createDvtSubstraitFetchDraft(rebuilt, {
          ...identity,
          offset: wrapper.offset,
          count: wrapper.count,
        });
      }
    }
    return rebuilt;
  } catch {
    return null;
  }
}
