/** Owned concern: remove canonical projection roots without consuming their source roots. */
import { fromBinary, toBinary } from '@bufbuild/protobuf';
import { PlanSchema } from '@buf/substrait_substrait.bufbuild_es/substrait/plan_pb.js';

import type { DvtSubstraitProjectionDraft } from './canvasDvtSubstraitProjection';
import {
  buildDvtSubstraitFieldTree,
  flattenDvtSubstraitFieldNames,
  inspectDvtSubstraitStructuredFieldDraft,
  orderedDvtSubstraitFields,
  resolveDvtSubstraitStructuredProjectionParts,
} from './canvasDvtSubstraitStructuredField';

export function removeDvtSubstraitProjectionRoot(
  draft: DvtSubstraitProjectionDraft,
  args: Readonly<{ fieldId: string }>
): DvtSubstraitProjectionDraft {
  const inspection = inspectDvtSubstraitStructuredFieldDraft(draft);
  const sourceParts = resolveDvtSubstraitStructuredProjectionParts(draft);
  if (!inspection.ok || sourceParts == null) return draft;
  const roots = orderedDvtSubstraitFields(
    draft.sidecar.fields,
    sourceParts.targetRelation.relationId
  );
  const rootIndex = roots.findIndex((field) => field.fieldId === args.fieldId);
  if (rootIndex < 0) return draft;

  const sourceCount = orderedDvtSubstraitFields(
    draft.sidecar.fields,
    sourceParts.sourceRelation.relationId
  ).length;
  const removedMapping = sourceParts.emit.outputMapping[rootIndex];
  if (removedMapping == null) return draft;

  const next = {
    plan: fromBinary(PlanSchema, toBinary(PlanSchema, draft.plan)),
    sidecar: draft.sidecar,
  };
  const parts = resolveDvtSubstraitStructuredProjectionParts(next);
  if (parts == null) return draft;
  parts.emit.outputMapping.splice(rootIndex, 1);
  if (removedMapping >= sourceCount) {
    const expressionIndex = removedMapping - sourceCount;
    if (parts.project.expressions[expressionIndex] == null) return draft;
    parts.project.expressions.splice(expressionIndex, 1);
    parts.emit.outputMapping = parts.emit.outputMapping.map((mapping) =>
      mapping > removedMapping ? mapping - 1 : mapping
    );
  }

  const removedIds = new Set<string>([args.fieldId]);
  let changed = true;
  while (changed) {
    changed = false;
    draft.sidecar.fields.forEach((field) => {
      if (
        field.parentFieldId != null &&
        removedIds.has(field.parentFieldId) &&
        !removedIds.has(field.fieldId)
      ) {
        removedIds.add(field.fieldId);
        changed = true;
      }
    });
  }
  const retainedRoots = roots
    .filter((field) => field.fieldId !== args.fieldId)
    .map((field, outputOrdinal) => ({ ...field, outputOrdinal }));
  next.sidecar = {
    ...draft.sidecar,
    fields: [
      ...draft.sidecar.fields.filter(
        (field) => field.relationId !== parts.targetRelation.relationId
      ),
      ...retainedRoots,
      ...draft.sidecar.fields.filter(
        (field) =>
          field.relationId === parts.targetRelation.relationId &&
          field.parentFieldId != null &&
          !removedIds.has(field.fieldId)
      ),
    ],
  };
  parts.root.names = flattenDvtSubstraitFieldNames(
    retainedRoots.map((field) => buildDvtSubstraitFieldTree(field, next.sidecar.fields))
  );
  return inspectDvtSubstraitStructuredFieldDraft(next).ok ? next : draft;
}
