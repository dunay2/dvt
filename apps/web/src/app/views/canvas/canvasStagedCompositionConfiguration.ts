/**
 * Owned concern: configure staged compositions from exact producer operands.
 * @baseline GH-3271-COMPOSITION-CONCERNS: configuration consumes canonical subtrees.
 * @decision Reuse composition, connection and schema owners for fixed and repeated inputs.
 * @consequence Rejected configuration preserves the pending operation without partial semantics.
 * @version 1.0.0
 */
import { hasSameConnectionRef } from '@dvt/postgres-projection';
import { SubstraitAnalysisError, type SubstraitDocument } from '@dvt/substrait-analysis';
import type { CanvasDvtCompositionInput } from './canvasDvtCompositionInputCatalog';
import { createCanonicalComposition } from './canvasCanonicalComposition';
import { mergeCanvasCompositionOperands } from './canvasCompositionOperands';
import { resolveCanvasDvtJoinFieldPair } from './canvasDvtJoinTypeAdmission';
import { encodeDvtSubstraitSemanticDocument } from './canvasDvtSubstraitSemanticDocument';
import { joinConditionFields } from './canvasSelectedJoin';
import { createSourceDocument } from './canvasSourceDocument';
import { canvasInputConnection } from './canvasSourceRelation';
import {
  canvasStagedOperationAppliedOperation,
  deriveCanvasStagedCompositionState,
  readCanvasStagedCompositionSignature,
  type CanvasStagedOperation,
} from './canvasStagedOperation';
import { resolveCanvasStagedProducerDocument } from './canvasStagedOperationDocument';
import type { PendingSourceOccurrence } from './relational-source-occurrence/pendingSourceOccurrence';
import { rebindCanvasUnionComposition } from './canvasRetainedUnionComposition';

function compositionConnection(
  documents: readonly SubstraitDocument[],
  inputs: readonly CanvasDvtCompositionInput[]
): boolean {
  const connections = documents.flatMap((document) =>
    document.sidecar.relations.flatMap((binding) => {
      if (binding.sourceRef != null) return [binding.sourceRef.connectionRef];
      if (binding.producerRef == null) return [];
      const input = inputs.find((candidate) => candidate.nodeId === binding.producerRef?.nodeId);
      if (input == null)
        throw new SubstraitAnalysisError(
          'invalid_binding',
          'Unavailable producer connection.',
          binding.relationId
        );
      return [canvasInputConnection(input)];
    })
  );
  return (
    connections.length > 0 &&
    connections.every((connection) => hasSameConnectionRef(connection, connections[0]!))
  );
}

function compositionPredicate(
  operands: ReturnType<typeof mergeCanvasCompositionOperands>['operands']
) {
  const fields = joinConditionFields(
    operands.map((operand) => ({ bindings: operand.root.fields, fields: operand.schema })),
    (field) => field.displayName ?? field.fieldId
  );
  const options = (port: number) =>
    fields
      .filter((field) => field.inputIndex === port)
      .map((field) => ({
        name: field.label,
        joinDataType: field.dataType,
        fieldId: field.fieldId,
      }));
  const pair = resolveCanvasDvtJoinFieldPair(options(0), options(1));
  return pair == null
    ? undefined
    : { leftFieldId: pair.left.fieldId, rightFieldId: pair.right.fieldId };
}

export function configureCanvasStagedComposition(
  operation: CanvasStagedOperation,
  inputs: readonly CanvasDvtCompositionInput[],
  sources: readonly PendingSourceOccurrence[],
  operations: readonly CanvasStagedOperation[],
  canonical: SubstraitDocument | null = null
): CanvasStagedOperation {
  const signature = readCanvasStagedCompositionSignature(operation.operation);
  if (signature.configuration !== 'composition') return operation;
  const canonicalOperation = canvasStagedOperationAppliedOperation(operation.operation, null);
  const state = deriveCanvasStagedCompositionState(operation);
  if (state === 'unbound' || state === 'partially-bound') {
    const { semanticDocument: _discarded, ...pending } = operation;
    return operation.semanticDocument == null ? operation : pending;
  }
  if (state === 'configured') return operation;
  try {
    const documents = operation.inputs.map((relationId) =>
      resolveCanvasStagedProducerDocument({ relationId, canonical, operations, sources })
    );
    if (documents.some((document) => document == null)) return operation;
    const resolved = documents.filter((document) => document != null);
    if (!compositionConnection(resolved, inputs)) return operation;
    const merged = mergeCanvasCompositionOperands(resolved);
    const { plan, operands, nextAnchor } = merged;
    const root =
      operation.configurationDocument != null
        ? rebindCanvasUnionComposition(operation, merged)
        : createCanonicalComposition({
            plan,
            binding: {
              relationId: operation.id,
              relAnchor: nextAnchor,
              displayName: canonicalOperation,
            },
            operation: canonicalOperation,
            inputs: operands.map((operand) => operand.root),
            schemas: operands.map((operand) => operand.schema),
            predicate: signature.operator === 'join' ? compositionPredicate(operands) : undefined,
          });
    const { configurationDocument: _retained, ...configured } = operation;
    return {
      ...configured,
      semanticDocument: encodeDvtSubstraitSemanticDocument(
        createSourceDocument(
          [...operands.flatMap((operand) => operand.entries), root],
          root,
          'extensions' in root ? (root.extensions ?? plan) : plan
        )
      ),
    };
  } catch {
    return operation;
  }
}
