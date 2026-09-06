/**
 * @baseline ADR-0064: Substrait semantic reference and bounded logical profile
 * @decision Validate stable FieldId hierarchy against the current structural binding independently from document transport. FieldId/relationId own logical identity; outputOrdinal is only the current sibling position and must never be used to mint or repair identity.
 * @consequence Root and nested sibling order share one fail-closed structural invariant while reorder can preserve persisted FieldId values.
 * @version 1.0.0
 */

export type DvtSubstraitHierarchyFieldV1 = Readonly<{
  fieldId: string;
  relationId: string;
  outputOrdinal: number;
  parentFieldId?: string | undefined;
  sourceFieldId?: string | undefined;
}>;

export type DvtSubstraitFieldHierarchyIssueV1 = Readonly<{
  index: number;
  property: 'fieldId' | 'relationId' | 'outputOrdinal' | 'parentFieldId' | 'sourceFieldId';
  message: string;
}>;

export function validateDvtSubstraitFieldHierarchyV1(
  fields: readonly DvtSubstraitHierarchyFieldV1[],
  relationIds: ReadonlySet<string>
): DvtSubstraitFieldHierarchyIssueV1[] {
  const issues: DvtSubstraitFieldHierarchyIssueV1[] = [];
  const fieldsById = new Map<string, DvtSubstraitHierarchyFieldV1>();
  const positions = new Set<string>();

  fields.forEach((field, index) => {
    if (fieldsById.has(field.fieldId)) {
      issues.push({ index, property: 'fieldId', message: 'Duplicate fieldId.' });
    } else {
      fieldsById.set(field.fieldId, field);
    }
    if (!relationIds.has(field.relationId)) {
      issues.push({ index, property: 'relationId', message: 'Unknown relationId.' });
    }
    const position = `${field.relationId}\u0000${field.parentFieldId ?? ''}\u0000${field.outputOrdinal}`;
    if (positions.has(position)) {
      issues.push({ index, property: 'outputOrdinal', message: 'Duplicate sibling ordinal.' });
    }
    positions.add(position);
  });

  fields.forEach((field, index) => {
    if (field.sourceFieldId != null && !fieldsById.has(field.sourceFieldId)) {
      issues.push({ index, property: 'sourceFieldId', message: 'Unknown source field.' });
    }
    if (field.parentFieldId == null) return;
    const parent = fieldsById.get(field.parentFieldId);
    if (parent == null) {
      issues.push({ index, property: 'parentFieldId', message: 'Unknown parent field.' });
      return;
    }
    if (parent.relationId !== field.relationId) {
      issues.push({
        index,
        property: 'parentFieldId',
        message: 'Parent field belongs to another relation.',
      });
      return;
    }
    const visited = new Set([field.fieldId]);
    let ancestor: DvtSubstraitHierarchyFieldV1 | undefined = parent;
    while (ancestor != null) {
      if (visited.has(ancestor.fieldId)) {
        issues.push({
          index,
          property: 'parentFieldId',
          message: 'Field hierarchy contains a cycle.',
        });
        return;
      }
      visited.add(ancestor.fieldId);
      ancestor =
        ancestor.parentFieldId == null ? undefined : fieldsById.get(ancestor.parentFieldId);
    }
  });

  return issues;
}
