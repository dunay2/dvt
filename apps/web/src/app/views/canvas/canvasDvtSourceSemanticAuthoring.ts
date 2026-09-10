/** Owns persistence and field-only output projection for a DVT Source. */
import { allocateDvtFieldId } from '@dvt/contracts';

import type { CanonicalNode } from '../../types/canonical';
import {
  createDvtSubstraitProjectionDraft,
  decodeDvtSubstraitProjectionDocument,
  encodeDvtSubstraitProjectionDocument,
  inspectDvtSubstraitProjectionDraft,
  canonicalizeDvtSubstraitProjectionDataType,
  reorderDvtSubstraitProjectionOutputs,
  resolveDvtSubstraitProjectionSource,
  type DvtSubstraitProjectionDraft,
  type DvtSubstraitProjectionOutput,
  type DvtSubstraitProjectionSource,
} from './canvasDvtSubstraitProjection';
import {
  applyDvtSubstraitSemanticDocument,
  readDvtTransformAuthoringAuthority,
} from './canvasDvtTransformAuthoringAuthority';

export type DvtSourceOutputProjection = Readonly<{
  source: DvtSubstraitProjectionSource;
  draft: DvtSubstraitProjectionDraft | null;
  outputs: readonly DvtSubstraitProjectionOutput[];
}>;

export type DvtSourceOutputMutation =
  | Readonly<{ outcome: 'applied'; node: CanonicalNode }>
  | Readonly<{ outcome: 'rejected'; reason: 'invalid_source_projection' | 'last_source_output' }>;

export function isDvtSourceOutputProjectionNode(node: CanonicalNode): boolean {
  return (
    node.kind === 'dvt:source' &&
    node.role === 'input' &&
    (node.pluginId === 'dvt' || node.pluginId === 'dvt.warehouse-source')
  );
}

function sameSourceIdentity(
  left: DvtSubstraitProjectionSource,
  right: DvtSubstraitProjectionSource
): boolean {
  return (
    left.schema === right.schema &&
    left.table === right.table &&
    left.sourceRef.schemaVersion === right.sourceRef.schemaVersion &&
    left.sourceRef.sourceObjectId === right.sourceRef.sourceObjectId &&
    left.sourceRef.connectionRef.schemaVersion === right.sourceRef.connectionRef.schemaVersion &&
    left.sourceRef.connectionRef.provider === right.sourceRef.connectionRef.provider &&
    left.sourceRef.connectionRef.connectionId === right.sourceRef.connectionRef.connectionId
  );
}

function sameFieldSignature(
  left: readonly Readonly<{ name: string; dataType: string }>[],
  right: readonly Readonly<{ name: string; dataType: string }>[]
): boolean {
  return (
    left.length === right.length &&
    left.every(
      (field, index) =>
        field.name === right[index]?.name &&
        canonicalizeDvtSubstraitProjectionDataType(field.dataType) ===
          canonicalizeDvtSubstraitProjectionDataType(right[index]?.dataType)
    )
  );
}
function isDirectSourceOutput(output: DvtSubstraitProjectionOutput): boolean {
  return (
    output.sourceFieldName != null &&
    output.name === output.sourceFieldName &&
    output.calculation == null &&
    output.scalarExpression == null &&
    output.operandFieldIds == null &&
    output.description == null &&
    (output.operations == null || output.operations.length === 0)
  );
}

export function readDvtSourceOutputProjection(
  node: CanonicalNode
): DvtSourceOutputProjection | null {
  if (!isDvtSourceOutputProjectionNode(node)) return null;
  const source = resolveDvtSubstraitProjectionSource(node);
  if (source == null) return null;
  const authority = readDvtTransformAuthoringAuthority(node);
  if (authority == null) {
    return {
      source,
      draft: null,
      outputs: source.fields.map((field, outputOrdinal) => ({
        fieldId: field.name,
        name: field.name,
        sourceFieldName: field.name,
        dataType: field.dataType,
        outputOrdinal,
      })),
    };
  }

  const draft = decodeDvtSubstraitProjectionDocument(authority.semanticDocument);
  const inspection = inspectDvtSubstraitProjectionDraft(draft);
  const physicalNames = source.fields.map((field) => field.name);
  if (
    !inspection.ok ||
    !sameSourceIdentity(
      {
        nodeId: node.id,
        schema: inspection.projection.source.schema,
        table: inspection.projection.source.table,
        sourceRef: inspection.projection.source.sourceRef,
        fields: inspection.projection.inputFields.map((field) => ({
          name: field.name,
          dataType: field.dataType,
        })),
      },
      source
    ) ||
    !sameFieldSignature(inspection.projection.inputFields, source.fields) ||
    inspection.projection.outputs.length === 0 ||
    inspection.projection.outputs.some((output) => {
      const physical = source.fields.find((field) => field.name === output.sourceFieldName);
      return (
        !isDirectSourceOutput(output) ||
        physical == null ||
        canonicalizeDvtSubstraitProjectionDataType(physical.dataType) !== output.dataType
      );
    }) ||
    new Set(inspection.projection.outputs.map((output) => output.sourceFieldName)).size !==
      inspection.projection.outputs.length
  ) {
    throw new Error('DVT Source semantic authority is not an admitted projection shape.');
  }
  return { source, draft, outputs: inspection.projection.outputs };
}

export function createDvtSourceSemanticDraft(
  node: CanonicalNode
): DvtSubstraitProjectionDraft | undefined {
  const projection = readDvtSourceOutputProjection(node);
  return projection?.draft ?? undefined;
}

function rebuildSourceProjection(
  node: CanonicalNode,
  source: DvtSubstraitProjectionSource,
  outputs: readonly Readonly<{ fieldId: string; name: string; sourceFieldName: string }>[]
): CanonicalNode {
  const draft = createDvtSubstraitProjectionDraft({
    source,
    targetNodeId: node.id,
    outputs,
  });
  return applyDvtSubstraitSemanticDocument(node, encodeDvtSubstraitProjectionDocument(draft));
}

function defaultOutputs(
  projection: DvtSourceOutputProjection
): readonly Readonly<{ fieldId: string; name: string; sourceFieldName: string }>[] {
  if (projection.draft != null) {
    return projection.outputs.map((output) => ({
      fieldId: output.fieldId,
      name: output.name,
      sourceFieldName: output.sourceFieldName!,
    }));
  }
  return projection.source.fields.map((field) => ({
    fieldId: allocateDvtFieldId(),
    name: field.name,
    sourceFieldName: field.name,
  }));
}

export function setDvtSourceOutputIncluded(
  node: CanonicalNode,
  columnName: string,
  included: boolean,
  placement?: Readonly<{ targetColumnId: string; placement: 'before' | 'after' }>
): DvtSourceOutputMutation {
  let projection: DvtSourceOutputProjection | null;
  try {
    projection = readDvtSourceOutputProjection(node);
  } catch {
    return { outcome: 'rejected', reason: 'invalid_source_projection' };
  }
  if (projection == null || !projection.source.fields.some((field) => field.name === columnName)) {
    return { outcome: 'rejected', reason: 'invalid_source_projection' };
  }
  const outputs = defaultOutputs(projection);
  const currentIndex = outputs.findIndex((output) => output.sourceFieldName === columnName);
  if (included && currentIndex >= 0) return { outcome: 'applied', node };
  if (!included && currentIndex < 0) return { outcome: 'applied', node };
  if (!included && outputs.length === 1) {
    return { outcome: 'rejected', reason: 'last_source_output' };
  }

  let nextOutputs = included
    ? [...outputs]
    : outputs.filter((output) => output.sourceFieldName !== columnName);
  if (included) {
    const created = {
      fieldId: allocateDvtFieldId(),
      name: columnName,
      sourceFieldName: columnName,
    };
    const placementIndex =
      placement == null
        ? -1
        : nextOutputs.findIndex(
            (output) =>
              output.fieldId === placement.targetColumnId ||
              output.sourceFieldName === placement.targetColumnId
          );
    if (placementIndex >= 0 && placement != null) {
      nextOutputs.splice(
        placement.placement === 'after' ? placementIndex + 1 : placementIndex,
        0,
        created
      );
    } else {
      const physicalIndex = projection.source.fields.findIndex(
        (field) => field.name === columnName
      );
      const precedingNames = new Set(
        projection.source.fields.slice(0, physicalIndex).map((field) => field.name)
      );
      let insertionIndex = -1;
      for (let index = nextOutputs.length - 1; index >= 0; index -= 1) {
        if (precedingNames.has(nextOutputs[index]!.sourceFieldName)) {
          insertionIndex = index + 1;
          break;
        }
      }
      nextOutputs.splice(insertionIndex < 0 ? 0 : insertionIndex, 0, created);
    }
  }

  return {
    outcome: 'applied',
    node: rebuildSourceProjection(node, projection.source, nextOutputs),
  };
}

export function reorderDvtSourceOutputs(
  node: CanonicalNode,
  columnName: string,
  targetColumnName: string,
  placement: 'before' | 'after'
): DvtSourceOutputMutation {
  let projection: DvtSourceOutputProjection | null;
  try {
    projection = readDvtSourceOutputProjection(node);
  } catch {
    return { outcome: 'rejected', reason: 'invalid_source_projection' };
  }
  if (projection == null) return { outcome: 'rejected', reason: 'invalid_source_projection' };
  const baseDraft =
    projection.draft ??
    createDvtSubstraitProjectionDraft({
      source: projection.source,
      targetNodeId: node.id,
      outputs: defaultOutputs(projection),
    });
  const inspection = inspectDvtSubstraitProjectionDraft(baseDraft);
  if (!inspection.ok) return { outcome: 'rejected', reason: 'invalid_source_projection' };
  const fieldId = inspection.projection.outputs.find(
    (output) => output.sourceFieldName === columnName
  )?.fieldId;
  const targetFieldId = inspection.projection.outputs.find(
    (output) => output.sourceFieldName === targetColumnName
  )?.fieldId;
  if (fieldId == null || targetFieldId == null) {
    return { outcome: 'rejected', reason: 'invalid_source_projection' };
  }
  const reordered = reorderDvtSubstraitProjectionOutputs(baseDraft, {
    fieldId,
    targetFieldId,
    placement,
  });
  if (reordered === baseDraft) {
    return { outcome: 'rejected', reason: 'invalid_source_projection' };
  }
  return {
    outcome: 'applied',
    node: applyDvtSubstraitSemanticDocument(node, encodeDvtSubstraitProjectionDocument(reordered)),
  };
}

export function applyDvtSourceSemanticDraft(
  node: CanonicalNode,
  draft: DvtSubstraitProjectionDraft
): CanonicalNode {
  const source = resolveDvtSubstraitProjectionSource(node);
  const inspection = inspectDvtSubstraitProjectionDraft(draft);
  const physicalNames = new Set(source?.fields.map((field) => field.name) ?? []);
  if (
    source == null ||
    !inspection.ok ||
    !sameFieldSignature(inspection.projection.inputFields, source.fields) ||
    inspection.projection.outputs.length === 0 ||
    inspection.projection.outputs.some(
      (output) => !isDirectSourceOutput(output) || !physicalNames.has(output.sourceFieldName!)
    )
  ) {
    throw new Error('DVT Source semantic authority is not an admitted projection shape.');
  }
  const rebound = createDvtSubstraitProjectionDraft({
    source,
    targetNodeId: node.id,
    outputs: inspection.projection.outputs.map((output) => ({
      fieldId: output.fieldId,
      name: output.name,
      sourceFieldName: output.sourceFieldName!,
    })),
  });
  const applied = applyDvtSubstraitSemanticDocument(
    node,
    encodeDvtSubstraitProjectionDocument(rebound)
  );
  readDvtSourceOutputProjection(applied);
  return applied;
}
