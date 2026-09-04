/** Owns creation and persistence of the Source relation's canonical semantic draft. */
import type { CanonicalNode } from '../../types/canonical';
import {
  encodeDvtSubstraitFilterDocument,
  inspectDvtSubstraitFilter,
  removeDvtSubstraitFilter,
} from './canvasDvtSubstraitFilter';
import {
  createDvtSubstraitProjectionDraft,
  decodeDvtSubstraitProjectionDocument,
  encodeDvtSubstraitProjectionDocument,
  inspectDvtSubstraitProjectionDraft,
  reorderDvtSubstraitProjectionOutputs,
  resolveDvtSubstraitProjectionSource,
  type DvtSubstraitProjectionDraft,
} from './canvasDvtSubstraitProjection';
import {
  applyDvtSubstraitSemanticDocument,
  readDvtTransformAuthoringAuthority,
} from './canvasDvtTransformAuthoringAuthority';

function outputFieldId(name: string): string {
  return `output:${encodeURIComponent(name)}`;
}

function isNamedSourceColumn(value: unknown): value is Record<string, unknown> & { name: string } {
  return (
    value != null &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    typeof (value as { name?: unknown }).name === 'string' &&
    (value as { name: string }).name.trim().length > 0
  );
}

function sameOrderedValues(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function sameUniqueValues(left: readonly string[], right: readonly string[]): boolean {
  return (
    left.length === right.length &&
    new Set(left).size === left.length &&
    new Set(right).size === right.length &&
    left.every((value) => right.includes(value))
  );
}

function reorderProjectionToFieldIds(
  draft: DvtSubstraitProjectionDraft,
  currentFieldIds: readonly string[],
  desiredFieldIds: readonly string[]
): DvtSubstraitProjectionDraft {
  let reorderedDraft = draft;
  const workingOrder = [...currentFieldIds];

  desiredFieldIds.forEach((desiredFieldId, targetIndex) => {
    const currentIndex = workingOrder.indexOf(desiredFieldId);
    if (currentIndex < 0 || currentIndex === targetIndex) return;
    const targetFieldId = workingOrder[targetIndex];
    if (targetFieldId == null) return;

    reorderedDraft = reorderDvtSubstraitProjectionOutputs(reorderedDraft, {
      fieldId: desiredFieldId,
      targetFieldId,
      placement: 'before',
    });
    workingOrder.splice(currentIndex, 1);
    workingOrder.splice(targetIndex, 0, desiredFieldId);
  });

  return reorderedDraft;
}

export function createDvtSourceSemanticDraft(
  node: CanonicalNode
): DvtSubstraitProjectionDraft | undefined {
  const authority = readDvtTransformAuthoringAuthority(node);
  if (authority != null) {
    const draft = decodeDvtSubstraitProjectionDocument(authority.semanticDocument);
    if (!inspectDvtSubstraitProjectionDraft(draft).ok && inspectDvtSubstraitFilter(draft) == null) {
      throw new Error('DVT Source semantic authority is not an admitted projection shape.');
    }
    return draft;
  }
  const source = resolveDvtSubstraitProjectionSource(node);
  return source == null
    ? undefined
    : createDvtSubstraitProjectionDraft({
        source,
        targetNodeId: node.id,
        outputs: source.fields.map((field) => ({
          fieldId: outputFieldId(field.name),
          name: field.name,
          sourceFieldName: field.name,
        })),
      });
}

export function applyDvtSourceSemanticDraft(
  node: CanonicalNode,
  draft: DvtSubstraitProjectionDraft
): CanonicalNode {
  const document =
    inspectDvtSubstraitFilter(draft) == null
      ? encodeDvtSubstraitProjectionDocument(draft)
      : encodeDvtSubstraitFilterDocument(draft);
  return applyDvtSubstraitSemanticDocument(node, document);
}

/**
 * Repairs the legacy Source state where a display reorder mutated the physical column declaration
 * without applying the same order to the semantic projection. The repair is intentionally narrow:
 * every output must still be a one-to-one passthrough of the exact connected-source field set.
 */
export function reconcileDvtSourceSemanticColumnOrder(node: CanonicalNode): CanonicalNode {
  if (node.kind !== 'dvt:source' || node.role !== 'input') return node;

  const columns = node.metadata?.columns;
  if (!Array.isArray(columns) || !columns.every(isNamedSourceColumn)) return node;

  let semanticDraft: DvtSubstraitProjectionDraft | undefined;
  try {
    semanticDraft = createDvtSourceSemanticDraft(node);
  } catch {
    return node;
  }
  if (semanticDraft == null) return node;

  const inspection = inspectDvtSubstraitProjectionDraft(removeDvtSubstraitFilter(semanticDraft));
  if (!inspection.ok || inspection.projection.targetNodeId !== node.id) return node;

  const metadataNames = columns.map((column) => column.name);
  const physicalNames = inspection.projection.source.fields.map((field) => field.name);
  const outputSourceNames = inspection.projection.outputs.flatMap((output) =>
    output.sourceFieldName == null ? [] : [output.sourceFieldName]
  );
  if (
    sameOrderedValues(metadataNames, physicalNames) ||
    outputSourceNames.length !== inspection.projection.outputs.length ||
    !sameUniqueValues(metadataNames, physicalNames) ||
    !sameUniqueValues(outputSourceNames, physicalNames)
  ) {
    return node;
  }

  const fieldIdBySourceName = new Map(
    inspection.projection.outputs.map((output) => [output.sourceFieldName, output.fieldId] as const)
  );
  const desiredFieldIds = metadataNames.flatMap((name) => {
    const fieldId = fieldIdBySourceName.get(name);
    return fieldId == null ? [] : [fieldId];
  });
  if (desiredFieldIds.length !== metadataNames.length) return node;

  const reorderedDraft = reorderProjectionToFieldIds(
    semanticDraft,
    inspection.projection.outputs.map((output) => output.fieldId),
    desiredFieldIds
  );
  const reorderedInspection = inspectDvtSubstraitProjectionDraft(
    removeDvtSubstraitFilter(reorderedDraft)
  );
  if (
    !reorderedInspection.ok ||
    !sameOrderedValues(
      reorderedInspection.projection.outputs.map((output) => output.fieldId),
      desiredFieldIds
    )
  ) {
    return node;
  }

  const columnByName = new Map(columns.map((column) => [column.name, column] as const));
  const physicalColumns = physicalNames.map((name) => columnByName.get(name));
  if (physicalColumns.some((column) => column == null)) return node;

  return applyDvtSourceSemanticDraft(
    {
      ...node,
      metadata: { ...node.metadata, columns: physicalColumns },
    },
    reorderedDraft
  );
}
