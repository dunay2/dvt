/**
 * Owned concern: rebind retained UNION configuration without resetting output identity.
 * @baseline ADR-0064: canonical Substrait and its sidecar own meaning and provenance.
 * @decision Preserve selection and aliases while the existing schema owner validates operands.
 * @consequence Invalid retained identity raises the existing typed analysis error, never a repair.
 * @version 1.0.0
 */
import { indexSubstraitRelations, SubstraitAnalysisError } from '@dvt/substrait-analysis';
import type { CanvasStagedOperation } from './canvasStagedOperation';
import { decodeDvtSubstraitSemanticDocument } from './canvasDvtSubstraitSemanticDocument';
import type { mergeCanvasCompositionOperands } from './canvasCompositionOperands';
import { rebindSetCompositionOutputs } from './canvasCompositionOutputs';
import { sourceSetOperations } from './canvasSourceSet';

export function rebindCanvasUnionComposition(
  operation: CanvasStagedOperation,
  merged: ReturnType<typeof mergeCanvasCompositionOperands>
) {
  if (
    operation.configurationDocument == null ||
    (operation.operation !== 'union_all' && operation.operation !== 'union_distinct')
  )
    throw new SubstraitAnalysisError(
      'invalid_binding',
      'Expected retained UNION configuration.',
      operation.id
    );
  const previous = indexSubstraitRelations(
    decodeDvtSubstraitSemanticDocument(operation.configurationDocument)
  );
  if (!previous.ok || previous.index.rootId !== operation.id)
    throw new SubstraitAnalysisError(
      'invalid_binding',
      'Unavailable UNION configuration.',
      operation.id
    );
  const root = previous.index.relations.get(operation.id)!;
  if (root.relation.relType.case !== 'set')
    throw new SubstraitAnalysisError(
      'invalid_binding',
      'Expected SET configuration.',
      operation.id
    );
  return {
    binding: { ...root.binding, relAnchor: merged.nextAnchor },
    fields: rebindSetCompositionOutputs(
      root.fields,
      root.inputs.map((id) => previous.index.relations.get(id)!.fields),
      merged.operands.map((operand) => operand.root.fields)
    ),
    relation: {
      ...root.relation,
      relType: {
        case: 'set' as const,
        value: {
          ...root.relation.relType.value,
          common: { ...root.relation.relType.value.common!, relAnchor: merged.nextAnchor },
          op: sourceSetOperations[operation.operation],
          inputs: merged.operands.map((operand) => operand.root.relation),
        },
      },
    },
  };
}
