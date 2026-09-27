/** Build configured JOIN semantics from the exact producer occurrences connected to its ports. */
import type { DvtSubstraitSemanticDocumentV1 } from '@dvt/contracts';
import type { SubstraitDocument } from '@dvt/substrait-analysis';
import type { CanvasDvtCompositionInput } from './canvasDvtCompositionInputCatalog';
import { createCanvasRelationalTreeInitialJoinDraft } from './canvasRelationalTreeAuthoringModel';
import { isCanvasJoinOperation } from './canvasRelationalTreeJoinType';
import type { CanvasStagedOperation } from './canvasStagedOperation';
import {
  decodeDvtSubstraitSemanticDocument,
  encodeDvtSubstraitSemanticDocument,
} from './canvasDvtSubstraitSemanticDocument';
import type { PendingSourceOccurrence } from './relational-source-occurrence/pendingSourceOccurrence';
import { hasSameConnectedSourceRef } from './canvasDvtSubstraitJoinSourceResolution';
import type { CanvasRelationAnalysisSession } from './canvasRelationAnalysisSession';

type JoinOccurrence = PendingSourceOccurrence;
type JoinAnalysis = Readonly<{
  document: SubstraitDocument | null;
  revision: number;
  session: CanvasRelationAnalysisSession;
}> | null;

function withoutSemantic(operation: CanvasStagedOperation): CanvasStagedOperation {
  if (operation.semanticDocument == null) return operation;
  const { semanticDocument: _discarded, ...pending } = operation;
  return pending;
}

function preserveOccurrenceIdentities(
  document: SubstraitDocument,
  operation: CanvasStagedOperation,
  occurrences: readonly JoinOccurrence[]
): SubstraitDocument {
  const reads = document.sidecar.relations
    .filter((binding) => binding.sourceRef != null || binding.producerRef != null)
    .sort((left, right) => left.relAnchor - right.relAnchor);
  const root = document.sidecar.relations.find(
    (binding) => binding.sourceRef == null && binding.producerRef == null
  );
  if (reads.length !== 2 || root == null) return document;
  const fieldIds = new Map<string, string>();
  const readIds = new Map<string, string>();
  reads.forEach((binding, port) => {
    const occurrence = occurrences[port]!;
    readIds.set(binding.relationId, occurrence.read.binding.relationId);
    const generated = document.sidecar.fields
      .filter((field) => field.relationId === binding.relationId)
      .sort((left, right) => left.outputOrdinal - right.outputOrdinal);
    const existing = [...occurrence.read.fields].sort(
      (left, right) => left.outputOrdinal - right.outputOrdinal
    );
    generated.forEach((field, index) => {
      if (existing[index] != null) fieldIds.set(field.fieldId, existing[index]!.fieldId);
    });
  });
  return {
    ...document,
    sidecar: {
      ...document.sidecar,
      relations: document.sidecar.relations.map((binding) => {
        const port = reads.findIndex((candidate) => candidate.relationId === binding.relationId);
        if (port >= 0)
          return {
            ...occurrences[port]!.read.binding,
            relAnchor: binding.relAnchor,
          };
        return binding.relationId === root.relationId
          ? { ...binding, relationId: operation.id, displayName: operation.operation }
          : binding;
      }),
      fields: document.sidecar.fields.map((field) => ({
        ...field,
        relationId:
          field.relationId === root.relationId
            ? operation.id
            : (readIds.get(field.relationId) ?? field.relationId),
        fieldId: fieldIds.get(field.fieldId) ?? field.fieldId,
        ...(field.sourceFieldId == null
          ? {}
          : { sourceFieldId: fieldIds.get(field.sourceFieldId) ?? field.sourceFieldId }),
        ...(field.operandFieldIds == null
          ? {}
          : {
              operandFieldIds: field.operandFieldIds.map(
                (fieldId) => fieldIds.get(fieldId) ?? fieldId
              ),
            }),
      })),
    },
  };
}

export function configureCanvasStagedJoin(
  operation: CanvasStagedOperation,
  inputs: readonly CanvasDvtCompositionInput[],
  pendingSources: readonly PendingSourceOccurrence[],
  analysis: JoinAnalysis = null
): CanvasStagedOperation {
  if (
    !isCanvasJoinOperation(operation.operation) ||
    operation.inputs.some((input) => input == null)
  )
    return withoutSemantic(operation);
  const occurrences = operation.inputs.map((relationId) => {
    const pending = pendingSources.find((source) => source.read.binding.relationId === relationId);
    if (pending != null || relationId == null || analysis?.document == null) return pending;
    let located: ReturnType<CanvasRelationAnalysisSession['locate']>;
    try {
      located = analysis.session.locate(relationId, analysis.revision);
    } catch {
      return undefined;
    }
    if (located.relation.relType.case !== 'read') return undefined;
    const input = inputs.find((candidate) => {
      if (candidate.sourceRef != null && located.binding.sourceRef != null)
        return hasSameConnectedSourceRef(candidate.sourceRef, located.binding.sourceRef);
      return (
        candidate.sourceRef == null &&
        located.binding.producerRef?.nodeId === candidate.producer.nodeId
      );
    });
    if (input == null) return undefined;
    return {
      sourceNodeId: input.nodeId,
      read: {
        relation: located.relation,
        binding: {
          ...located.binding,
          displayName: located.binding.displayName ?? input.table,
        },
        fields: located.fields.map((field) => ({
          ...field,
          displayName:
            field.displayName ?? input.fields[field.outputOrdinal]?.name ?? field.fieldId,
        })),
      },
    } satisfies JoinOccurrence;
  });
  if (occurrences.some((occurrence) => occurrence == null)) return withoutSemantic(operation);
  const resolved = occurrences.filter(
    (occurrence): occurrence is JoinOccurrence => occurrence != null
  );
  const sourceIds = resolved.map((occurrence) => occurrence.sourceNodeId);
  let document: SubstraitDocument | null;
  try {
    document = createCanvasRelationalTreeInitialJoinDraft({
      inputs,
      targetNodeId: operation.id,
      leftInputId: sourceIds[0]!,
      rightInputId: sourceIds[1]!,
      operation: operation.operation,
    });
  } catch {
    return withoutSemantic(operation);
  }
  if (document == null) return withoutSemantic(operation);
  return {
    ...operation,
    semanticDocument: encodeDvtSubstraitSemanticDocument(
      preserveOccurrenceIdentities(document, operation, resolved)
    ),
  };
}

export function decodeCanvasStagedJoin(
  semanticDocument: DvtSubstraitSemanticDocumentV1 | undefined
): SubstraitDocument | null {
  if (semanticDocument == null) return null;
  try {
    return decodeDvtSubstraitSemanticDocument(semanticDocument);
  } catch {
    return null;
  }
}
