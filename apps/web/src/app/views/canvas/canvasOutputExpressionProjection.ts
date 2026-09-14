/** Owned concern: resolve an output FieldId into a read-only canonical expression graph. */
import type { Expression } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import type { CanonicalNode } from '../../types/canonical';
import {
  decodeDvtSubstraitProjectionDocument,
  inspectDvtSubstraitProjectionDraft,
} from './canvasDvtSubstraitProjection';
import { dvtSubstraitExpression } from './canvasDvtSubstraitExpression';
import { readDvtTransformAuthoringAuthority } from './canvasDvtTransformAuthoringAuthority';
import {
  createSemanticExpressionProjector,
  layoutSemanticExpressionGraph,
} from './semanticExpressionGraphProjection';
import type { SemanticWorkbenchGraph } from './semanticWorkbenchProjection';

export type CanvasOutputExpressionProjection =
  | Readonly<{
      status: 'available';
      fieldId: string;
      alias: string;
      dataType: string;
      graph: SemanticWorkbenchGraph;
    }>
  | Readonly<{ status: 'unavailable'; reason: 'invalid-output' | 'unsupported-expression' }>;

function supportsExpression(expression: Expression, inputCount: number): boolean {
  const ordinal = dvtSubstraitExpression.fieldOrdinal(expression);
  if (ordinal != null) return ordinal >= 0 && ordinal < inputCount;
  if (expression.rexType.case === 'literal')
    return dvtSubstraitExpression.literalValue(expression) != null;
  return (
    expression.rexType.case === 'scalarFunction' &&
    expression.rexType.value.arguments.every(
      (argument) =>
        argument.argType.case === 'enum' ||
        (argument.argType.case === 'value' &&
          supportsExpression(argument.argType.value, inputCount))
    )
  );
}

export function projectCanvasOutputExpression(
  node: CanonicalNode,
  fieldId: string
): CanvasOutputExpressionProjection {
  try {
    if (node.kind !== 'dvt:transform') return { status: 'unavailable', reason: 'invalid-output' };
    const authority = readDvtTransformAuthoringAuthority(node);
    if (authority == null) return { status: 'unavailable', reason: 'invalid-output' };
    const draft = decodeDvtSubstraitProjectionDocument(authority.semanticDocument);
    const inspection = inspectDvtSubstraitProjectionDraft(draft);
    if (!inspection.ok) return { status: 'unavailable', reason: 'unsupported-expression' };
    const output = inspection.projection.outputs.find((candidate) => candidate.fieldId === fieldId);
    const root = draft.plan.relations[0]?.relType;
    const project = root?.case === 'root' ? root.value.input?.relType : undefined;
    if (
      output == null ||
      project?.case !== 'project' ||
      project.value.common?.emitKind.case !== 'emit'
    ) {
      return { status: 'unavailable', reason: 'invalid-output' };
    }
    const mapping = project.value.common.emitKind.value.outputMapping[output.outputOrdinal];
    const inputs = inspection.projection.inputFields;
    if (mapping == null) return { status: 'unavailable', reason: 'invalid-output' };
    // Direct mappings become a transient leaf; the Plan is never modified or re-encoded.
    const expression =
      mapping < inputs.length
        ? dvtSubstraitExpression.field(mapping)
        : project.value.expressions[mapping - inputs.length];
    if (expression == null || !supportsExpression(expression, inputs.length)) {
      return { status: 'unavailable', reason: 'unsupported-expression' };
    }
    const graph: SemanticWorkbenchGraph = {
      nodes: [],
      edges: [],
      relationCount: 0,
      expressionCount: 0,
      relationId: inspection.projection.targetRelationId,
    };
    let sequence = 0;
    const projector = createSemanticExpressionProjector({
      plan: draft.plan,
      nodes: graph.nodes,
      edges: graph.edges,
      showArgumentOrder: true,
      nextId: (prefix) => `${prefix}-${sequence++}`,
    });
    projector.addExpression(
      expression,
      inputs.map((field) => field.name)
    );
    return {
      status: 'available',
      fieldId: output.fieldId,
      alias: output.name,
      dataType: output.dataType,
      graph: layoutSemanticExpressionGraph({ ...graph, expressionCount: projector.count }),
    };
  } catch {
    return { status: 'unavailable', reason: 'invalid-output' };
  }
}
