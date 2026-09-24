/** Owns a well-formed persisted Sort selector outside the admitted execution profile. */
import { SortField_SortDirection } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import type { DvtSubstraitSemanticDocumentV1 } from '@dvt/contracts';

import {
  decodeDvtSubstraitSemanticDocument,
  encodeDvtSubstraitSemanticDocument,
} from '../../../src/app/views/canvas/canvasDvtSubstraitSemanticDocument';
import { applyDvtSubstraitSort } from '../../../src/app/views/canvas/canvasSortFetch.test-support';

import { leftJoinDocument } from './fixture';

export function unsupportedSortDocument(): DvtSubstraitSemanticDocumentV1 {
  const join = decodeDvtSubstraitSemanticDocument(leftJoinDocument());
  const output = join.sidecar.fields.find(
    (field) => field.displayName === 'order_id' && 'sourceFieldId' in field
  )!;
  const sorted = applyDvtSubstraitSort(join, [
    { fieldId: output.fieldId, direction: SortField_SortDirection.ASC_NULLS_LAST },
  ]);
  const root = sorted.plan.relations[0]?.relType;
  if (root?.case !== 'root' || root.value.input?.relType.case !== 'sort')
    throw new Error('Expected SortRel fixture');
  root.value.input.relType.value.sorts[0]!.sortKind = {
    case: 'direction',
    value: SortField_SortDirection.CLUSTERED,
  };
  return encodeDvtSubstraitSemanticDocument(sorted);
}
