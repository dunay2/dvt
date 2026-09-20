/** Owned concern: author and reopen canonical SortRel/FetchRel wrappers for the Canvas tree. */
import { allocateDvtFieldId, allocateDvtRelationId } from '@dvt/contracts';
import {
  createDvtSubstraitFetchDraft,
  createDvtSubstraitSortDraft,
  inspectDvtSubstraitSortFetchRoot,
  removeDvtSubstraitSortFetchRelation,
  selectDvtSubstraitRelation,
  type DvtSubstraitSortKey,
} from '@dvt/postgres-projection';

import type { DvtSubstraitProjectionDraft } from './canvasDvtSubstraitProjection';

export type CanvasDvtSortFetchField = Readonly<{ fieldId: string; name: string }>;

type SortFetchInspection = Extract<
  ReturnType<typeof inspectDvtSubstraitSortFetchRoot>,
  { ok: true }
>;

function unwrapSortFetchRoot(
  draft: DvtSubstraitProjectionDraft,
  inspection: SortFetchInspection
): DvtSubstraitProjectionDraft {
  // Generic subtree selection rebases anchors for transient queries. Wrapper editing must retain
  // the persisted inner ordering because JOIN admission treats those anchors as structural identity.
  return removeDvtSubstraitSortFetchRelation(draft, inspection.relationId);
}

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

export function resolveDvtSubstraitSortFetchInputFields(
  draft: DvtSubstraitProjectionDraft,
  operation?: 'sort' | 'fetch'
): readonly CanvasDvtSortFetchField[] {
  const inspection = inspectDvtSubstraitSortFetchRoot(draft);
  const relationId =
    inspection.ok && inspection.operation === operation
      ? inspection.inputRelationId
      : rootRelationId(draft);
  return relationId == null ? [] : fieldsForRelation(draft, relationId);
}

function wrapperIdentity(
  draft: DvtSubstraitProjectionDraft,
  operation: 'sort' | 'fetch'
): Readonly<{
  base: DvtSubstraitProjectionDraft;
  relationId: string;
  outputFieldIds: readonly string[];
}> {
  const inspection = inspectDvtSubstraitSortFetchRoot(draft);
  if (inspection.ok && inspection.operation === operation) {
    return {
      base: unwrapSortFetchRoot(draft, inspection),
      relationId: inspection.relationId,
      outputFieldIds: inspection.outputFields.map((field) => field.fieldId),
    };
  }
  const relationId = rootRelationId(draft);
  if (relationId == null) throw new Error('Sort/Fetch input relation is unavailable.');
  const fieldCount = fieldsForRelation(draft, relationId).length;
  return {
    base: draft,
    relationId: allocateDvtRelationId(),
    outputFieldIds: Array.from({ length: fieldCount }, () => allocateDvtFieldId()),
  };
}

export function applyDvtSubstraitSort(
  draft: DvtSubstraitProjectionDraft,
  keys: readonly DvtSubstraitSortKey[],
  relationId?: string
): DvtSubstraitProjectionDraft {
  if (relationId != null) {
    return replaceSortFetchWrapper(draft, relationId, { operation: 'sort', keys });
  }
  const identity = wrapperIdentity(draft, 'sort');
  return createDvtSubstraitSortDraft(identity.base, {
    relationId: identity.relationId,
    outputFieldIds: identity.outputFieldIds,
    keys,
  });
}

export function applyDvtSubstraitFetch(
  draft: DvtSubstraitProjectionDraft,
  values: Readonly<{ offset?: bigint | null; count?: bigint | null }>,
  relationId?: string
): DvtSubstraitProjectionDraft {
  if (relationId != null) {
    return replaceSortFetchWrapper(draft, relationId, { operation: 'fetch', ...values });
  }
  const identity = wrapperIdentity(draft, 'fetch');
  return createDvtSubstraitFetchDraft(identity.base, {
    relationId: identity.relationId,
    outputFieldIds: identity.outputFieldIds,
    ...values,
  });
}

type SortFetchReplacement =
  | Readonly<{ operation: 'sort'; keys: readonly DvtSubstraitSortKey[] }>
  | Readonly<{ operation: 'fetch'; offset?: bigint | null; count?: bigint | null }>;

function replaceSortFetchWrapper(
  draft: DvtSubstraitProjectionDraft,
  relationId: string,
  replacement: SortFetchReplacement
): DvtSubstraitProjectionDraft {
  const chain: Array<
    Readonly<{
      draft: DvtSubstraitProjectionDraft;
      inspection: SortFetchInspection;
    }>
  > = [];
  let current = draft;
  while (true) {
    const inspection = inspectDvtSubstraitSortFetchRoot(current);
    if (!inspection.ok) break;
    chain.push({ draft: current, inspection });
    const unwrapped = unwrapSortFetchRoot(current, inspection);
    if (unwrapped === current) break;
    current = unwrapped;
  }
  const targetIndex = chain.findIndex((entry) => entry.inspection.relationId === relationId);
  if (targetIndex < 0) return draft;
  const target = chain[targetIndex]!;
  let rebuilt = unwrapSortFetchRoot(target.draft, target.inspection);
  const identity = {
    relationId: target.inspection.relationId,
    outputFieldIds: target.inspection.outputFields.map((field) => field.fieldId),
  };
  rebuilt =
    replacement.operation === 'sort'
      ? createDvtSubstraitSortDraft(rebuilt, { ...identity, keys: replacement.keys })
      : createDvtSubstraitFetchDraft(rebuilt, { ...identity, ...replacement });
  for (let index = targetIndex - 1; index >= 0; index -= 1) {
    const outer = chain[index]!.inspection;
    const outerIdentity = {
      relationId: outer.relationId,
      outputFieldIds: outer.outputFields.map((field) => field.fieldId),
    };
    rebuilt =
      outer.operation === 'sort'
        ? createDvtSubstraitSortDraft(rebuilt, { ...outerIdentity, keys: outer.keys })
        : createDvtSubstraitFetchDraft(rebuilt, {
            ...outerIdentity,
            offset: outer.offset,
            count: outer.count,
          });
  }
  return rebuilt;
}

export function selectCanvasDvtSubstraitSortFetch(
  draft: DvtSubstraitProjectionDraft,
  relationId: string
): DvtSubstraitProjectionDraft | null {
  try {
    const selected = selectDvtSubstraitRelation(draft, relationId);
    const inspection = inspectDvtSubstraitSortFetchRoot(selected);
    return inspection.ok && inspection.relationId === relationId ? selected : null;
  } catch {
    return null;
  }
}

export type CanvasDvtSortFetchChain = Readonly<{
  base: DvtSubstraitProjectionDraft;
  wrappers: readonly SortFetchInspection[];
}>;

export function peelCanvasDvtSubstraitSortFetch(
  draft: DvtSubstraitProjectionDraft
): CanvasDvtSortFetchChain {
  const wrappers: SortFetchInspection[] = [];
  let base = draft;
  while (true) {
    const inspection = inspectDvtSubstraitSortFetchRoot(base);
    if (!inspection.ok) break;
    wrappers.push(inspection);
    const unwrapped = unwrapSortFetchRoot(base, inspection);
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

export function inspectCanvasDvtSubstraitSortFetch(draft: DvtSubstraitProjectionDraft) {
  return inspectDvtSubstraitSortFetchRoot(draft);
}

export function removeDvtSubstraitSortFetch(
  draft: DvtSubstraitProjectionDraft,
  operation: 'sort' | 'fetch',
  relationId?: string
): DvtSubstraitProjectionDraft {
  const inspection = inspectDvtSubstraitSortFetchRoot(draft);
  if (relationId != null) return removeDvtSubstraitSortFetchRelation(draft, relationId);
  return inspection.ok && inspection.operation === operation
    ? removeDvtSubstraitSortFetchRelation(draft, inspection.relationId)
    : draft;
}
