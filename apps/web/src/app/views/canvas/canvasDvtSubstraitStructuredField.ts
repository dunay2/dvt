/** Owned concern: compose and inspect canonical nested fields in one Substrait projection. */
import {
  DvtSubstraitAuthoringSidecarV1Schema,
  type DvtSubstraitFieldBindingV1,
  type DvtSubstraitSemanticDocumentV1,
} from '@dvt/contracts';

import type { DvtSubstraitProjectionDraft } from './canvasDvtSubstraitProjection';
import {
  decodeDvtSubstraitSemanticDraft,
  encodeDvtSubstraitSemanticDraft,
} from './canvasDvtSubstraitSemanticCodec';

export type DvtSubstraitStructuredField = Readonly<{
  fieldId: string;
  name: string;
  children?: readonly DvtSubstraitStructuredField[];
}>;
export type DvtSubstraitStructuredFieldInspection =
  Readonly<{ ok: true; fields: readonly DvtSubstraitStructuredField[] }> | Readonly<{ ok: false }>;

export function resolveDvtSubstraitStructuredProjectionParts(draft: DvtSubstraitProjectionDraft) {
  const root = draft.plan.relations[0]?.relType;
  const project = root?.case === 'root' ? root.value.input?.relType : undefined;
  const read = project?.case === 'project' ? project.value.input?.relType : undefined;
  const emit = project?.case === 'project' ? project.value.common?.emitKind : undefined;
  if (
    root?.case !== 'root' ||
    project?.case !== 'project' ||
    read?.case !== 'read' ||
    emit?.case !== 'emit'
  ) {
    return null;
  }
  const sourceRelation = draft.sidecar.relations.find(
    (relation) => relation.relAnchor === read.value.common?.relAnchor
  );
  const targetRelation = draft.sidecar.relations.find(
    (relation) => relation.relAnchor === project.value.common?.relAnchor
  );
  if (sourceRelation == null || targetRelation == null) return null;
  return {
    root: root.value,
    project: project.value,
    emit: emit.value,
    sourceRelation,
    targetRelation,
  };
}

export function orderedDvtSubstraitFields(
  fields: readonly DvtSubstraitFieldBindingV1[],
  relationId: string,
  parentFieldId?: string
): DvtSubstraitFieldBindingV1[] {
  return fields
    .filter((field) => field.relationId === relationId && field.parentFieldId === parentFieldId)
    .sort((left, right) => left.outputOrdinal - right.outputOrdinal);
}

export function buildDvtSubstraitFieldTree(
  field: DvtSubstraitFieldBindingV1,
  allFields: readonly DvtSubstraitFieldBindingV1[]
): DvtSubstraitStructuredField {
  const children = orderedDvtSubstraitFields(allFields, field.relationId, field.fieldId).map(
    (child) => buildDvtSubstraitFieldTree(child, allFields)
  );
  return {
    fieldId: field.fieldId,
    name: field.displayName ?? field.fieldId,
    ...(children.length === 0 ? {} : { children }),
  };
}

export function flattenDvtSubstraitFieldNames(
  fields: readonly DvtSubstraitStructuredField[]
): string[] {
  return fields.flatMap((field) => [
    field.name,
    ...flattenDvtSubstraitFieldNames(field.children ?? []),
  ]);
}

export function inspectDvtSubstraitStructuredFieldDraft(
  draft: DvtSubstraitProjectionDraft
): DvtSubstraitStructuredFieldInspection {
  if (!DvtSubstraitAuthoringSidecarV1Schema.safeParse(draft.sidecar).success) return { ok: false };
  const parts = resolveDvtSubstraitStructuredProjectionParts(draft);
  if (parts == null) return { ok: false };
  const sourceCount = orderedDvtSubstraitFields(
    draft.sidecar.fields,
    parts.sourceRelation.relationId
  ).length;
  const roots = orderedDvtSubstraitFields(draft.sidecar.fields, parts.targetRelation.relationId);
  const fields = roots.map((field) => buildDvtSubstraitFieldTree(field, draft.sidecar.fields));
  if (
    parts.emit.outputMapping.length !== roots.length ||
    flattenDvtSubstraitFieldNames(fields).join('\u0000') !== parts.root.names.join('\u0000')
  ) {
    return { ok: false };
  }
  const usedExpressions = new Set<number>();
  const valid = roots.every((field, index) => {
    const children = orderedDvtSubstraitFields(
      draft.sidecar.fields,
      field.relationId,
      field.fieldId
    );
    const mapping = parts.emit.outputMapping[index];
    if (mapping == null || mapping < 0) return false;
    if (mapping < sourceCount) return children.length === 0;
    const expressionIndex = mapping - sourceCount;
    const expression = parts.project.expressions[expressionIndex];
    usedExpressions.add(expressionIndex);
    if (expression == null) return false;
    return (
      children.length === 0 ||
      (expression.rexType.case === 'nested' &&
        expression.rexType.value.nestedType.case === 'struct' &&
        expression.rexType.value.nestedType.value.fields.length === children.length)
    );
  });
  return valid && usedExpressions.size === parts.project.expressions.length
    ? { ok: true, fields }
    : { ok: false };
}

export function encodeDvtSubstraitStructuredFieldDocument(
  draft: DvtSubstraitProjectionDraft
): DvtSubstraitSemanticDocumentV1 {
  return encodeDvtSubstraitSemanticDraft(
    draft,
    (candidate) => inspectDvtSubstraitStructuredFieldDraft(candidate).ok,
    'Substrait structured-field projection is invalid.'
  );
}

export function decodeDvtSubstraitStructuredFieldDocument(
  input: unknown
): DvtSubstraitProjectionDraft {
  return decodeDvtSubstraitSemanticDraft(input);
}
