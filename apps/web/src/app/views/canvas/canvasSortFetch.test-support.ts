/** Independent fixtures for wrapper consumers; production edits use the analysis session. */
import { allocateDvtFieldId, allocateDvtRelationId } from '@dvt/contracts';
import {
  createDvtSubstraitFetchDraft,
  createDvtSubstraitSortDraft,
  inspectDvtSubstraitSortFetchRoot,
  removeDvtSubstraitSortFetchRelation,
  type DvtSubstraitSortKey,
} from '@dvt/postgres-projection';
import { indexSubstraitRelations, type SubstraitDocument } from '@dvt/substrait-analysis';

export function resolveDvtSubstraitSortFetchInputFields(
  draft: SubstraitDocument,
  operation?: 'sort' | 'fetch'
) {
  const indexed = indexSubstraitRelations(draft);
  if (!indexed.ok) throw indexed.error;
  const inspection = inspectDvtSubstraitSortFetchRoot(draft);
  const relationId =
    inspection.ok && inspection.operation === operation
      ? inspection.inputRelationId
      : indexed.index.rootId;
  return indexed.index.relations
    .get(relationId)!
    .fields.filter((field) => field.parentFieldId == null)
    .map((field) => ({ fieldId: field.fieldId, name: field.displayName ?? field.fieldId }));
}

function identity(draft: SubstraitDocument, operation: 'sort' | 'fetch') {
  const inspection = inspectDvtSubstraitSortFetchRoot(draft);
  return inspection.ok && inspection.operation === operation
    ? {
        base: removeDvtSubstraitSortFetchRelation(draft, inspection.relationId),
        relationId: inspection.relationId,
        outputFieldIds: inspection.outputFields.map((field) => field.fieldId),
      }
    : {
        base: draft,
        relationId: allocateDvtRelationId(),
        outputFieldIds: resolveDvtSubstraitSortFetchInputFields(draft).map(() =>
          allocateDvtFieldId()
        ),
      };
}

export function applyDvtSubstraitSort(
  draft: SubstraitDocument,
  keys: readonly DvtSubstraitSortKey[]
) {
  const { base, ...binding } = identity(draft, 'sort');
  return createDvtSubstraitSortDraft(base, { ...binding, keys });
}

export function applyDvtSubstraitFetch(
  draft: SubstraitDocument,
  values: Readonly<{ offset?: bigint | null; count?: bigint | null }>
) {
  const { base, ...binding } = identity(draft, 'fetch');
  return createDvtSubstraitFetchDraft(base, { ...binding, ...values });
}

export { inspectDvtSubstraitSortFetchRoot as inspectCanvasDvtSubstraitSortFetch } from '@dvt/postgres-projection';
