/** Owns creation and persistence of the Source relation's canonical semantic draft. */
import type { CanonicalNode } from '../../types/canonical';
import { inspectDvtSubstraitFilter, removeDvtSubstraitFilter } from './canvasDvtSubstraitFilter';
import {
  createDvtSubstraitProjectionDraft,
  decodeDvtSubstraitProjectionDocument,
  encodeDvtSubstraitProjectionDocument,
  inspectDvtSubstraitProjectionDraft,
  reorderDvtSubstraitProjectionOutputs,
  resolveDvtSubstraitProjectionEntry,
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
    const draft = removeDvtSubstraitFilter(
      decodeDvtSubstraitProjectionDocument(authority.semanticDocument)
    );
    if (!inspectDvtSubstraitProjectionDraft(draft).ok) {
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
  return applyDvtSubstraitSemanticDocument(
    node,
    encodeDvtSubstraitProjectionDocument(removeDvtSubstraitFilter(draft))
  );
}

function normalizeDvtSourceFilterAuthority(node: CanonicalNode): CanonicalNode {
  const authority = readDvtTransformAuthoringAuthority(node);
  if (authority == null) return node;
  const draft = decodeDvtSubstraitProjectionDocument(authority.semanticDocument);
  return inspectDvtSubstraitFilter(draft) == null
    ? node
    : applyDvtSourceSemanticDraft(node, removeDvtSubstraitFilter(draft));
}

/**
 * Repairs the legacy Source state where a display reorder mutated the physical column declaration
 * without applying the same order to the semantic projection. The repair is intentionally narrow:
 * every output must still be a one-to-one passthrough of the exact connected-source field set.
 */
export function reconcileDvtSourceSemanticColumnOrder(node: CanonicalNode): CanonicalNode {
  if (node.kind !== 'dvt:source' || node.role !== 'input') return node;

  let normalizedNode: CanonicalNode;
  try {
    normalizedNode = normalizeDvtSourceFilterAuthority(node);
  } catch {
    return node;
  }

  const columns = normalizedNode.metadata?.columns;
  if (!Array.isArray(columns) || !columns.every(isNamedSourceColumn)) return normalizedNode;

  let semanticDraft: DvtSubstraitProjectionDraft | undefined;
  try {
    semanticDraft = createDvtSourceSemanticDraft(normalizedNode);
  } catch {
    return normalizedNode;
  }
  if (semanticDraft == null) return normalizedNode;

  const baseDraft = removeDvtSubstraitFilter(semanticDraft);
  const inspection = inspectDvtSubstraitProjectionDraft(baseDraft);
  if (
    !inspection.ok ||
    resolveDvtSubstraitProjectionEntry({
      targetNode: normalizedNode,
      nodes: [normalizedNode],
      edges: [],
      draft: baseDraft,
    }) == null
  ) {
    return normalizedNode;
  }

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
    return normalizedNode;
  }

  const fieldIdBySourceName = new Map(
    inspection.projection.outputs.map((output) => [output.sourceFieldName, output.fieldId] as const)
  );
  const desiredFieldIds = metadataNames.flatMap((name) => {
    const fieldId = fieldIdBySourceName.get(name);
    return fieldId == null ? [] : [fieldId];
  });
  if (desiredFieldIds.length !== metadataNames.length) return normalizedNode;

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
    return normalizedNode;
  }

  const columnByName = new Map(columns.map((column) => [column.name, column] as const));
  const physicalColumns = physicalNames.map((name) => columnByName.get(name));
  if (physicalColumns.some((column) => column == null)) return normalizedNode;

  return applyDvtSourceSemanticDraft(
    {
      ...normalizedNode,
      metadata: { ...normalizedNode.metadata, columns: physicalColumns },
    },
    reorderedDraft
  );
}
