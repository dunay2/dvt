/** Owned concern: resolve an output FieldId into a read-only canonical expression graph. */
import type { Expression } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import { deriveSubstraitSchemas } from '@dvt/substrait-analysis';
import type { CanonicalNode } from '../../types/canonical';
import { decodeDvtSubstraitSemanticDocument } from './canvasDvtSubstraitSemanticDocument';
import { readCanvasTransformDependencyModel } from './canvasTransformDependencyModel';
import { derivedOutputDataType, rootFields } from './canvasDerivedOutputExpression';
import { dvtSubstraitExpression } from './canvasDvtSubstraitExpression';
import { readDvtTransformAuthoringAuthority } from './canvasDvtTransformAuthoringAuthority';
import { createSemanticExpressionProjector } from './semanticExpressionGraphProjection';
import { layoutSemanticExpressionGraph } from './semanticExpressionGraphLayout';
import type { SemanticWorkbenchGraph } from './semanticWorkbenchProjection';

export type CanvasOutputExpressionProjection =
  | Readonly<{
      status: 'available';
      fieldId: string;
      alias: string;
      dataType: string;
      semanticDigest: string;
      graph: SemanticWorkbenchGraph;
    }>
  | Readonly<{ status: 'unavailable'; reason: 'invalid-output' | 'unsupported-expression' }>;

function supportsExpression(expression: Expression, inputCount: number): boolean {
  const ordinal = dvtSubstraitExpression.fieldOrdinal(expression);
  if (ordinal != null) return ordinal >= 0 && ordinal < inputCount;
  if (expression.rexType.case === 'literal')
    return (
      dvtSubstraitExpression.literalValue(expression) != null ||
      dvtSubstraitExpression.nullType(expression) != null
    );
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
    const draft = decodeDvtSubstraitSemanticDocument(authority.semanticDocument);
    const { index, schemas } = deriveSubstraitSchemas(draft);
    const root = index.relations.get(index.rootId)!;
    const output = rootFields(root.fields).find((candidate) => candidate.fieldId === fieldId);
    if (output == null || root.relation.relType.case !== 'project')
      return { status: 'unavailable', reason: 'invalid-output' };
    const model = readCanvasTransformDependencyModel(root, (id) => index.relations.get(id)!);
    const symbol = model.outputIds[output.outputOrdinal];
    const definition = model.definitions.find((candidate) => candidate.id === symbol);
    const base = rootFields(model.input.fields);
    const inputs = definition?.inputIds ?? base.map((field) => field.fieldId);
    const fields = new Map([
      ...base.map((field) => [field.fieldId, field] as const),
      ...model.definitions.map((item) => [item.id, item.output ?? item.binding] as const),
    ]);
    const bindings = inputs.map((id) => fields.get(id));
    // A forwarded output is a transient leaf; a definition remains its canonical expression.
    const ordinal = symbol == null ? -1 : inputs.indexOf(symbol);
    const expression =
      definition?.expression ?? (ordinal < 0 ? null : dvtSubstraitExpression.field(ordinal));
    const type = schemas.get(index.rootId)?.[output.outputOrdinal]?.type;
    const dataType = type == null ? null : derivedOutputDataType(type);
    if (
      expression == null ||
      dataType == null ||
      bindings.some((field) => field == null) ||
      !supportsExpression(expression, inputs.length)
    ) {
      return { status: 'unavailable', reason: 'unsupported-expression' };
    }
    const graph: SemanticWorkbenchGraph = {
      nodes: [],
      edges: [],
      relationCount: 0,
      expressionCount: 0,
      relationId: index.rootId,
    };
    let sequence = 0;
    const projector = createSemanticExpressionProjector({
      plan: draft.plan,
      nodes: graph.nodes,
      edges: graph.edges,
      showArgumentOrder: true,
      inputFields: bindings.map((field) => ({
        fieldId: field!.fieldId,
        relationId: field!.relationId,
      })),
      nextId: (prefix) => `${prefix}-${sequence++}`,
    });
    projector.addExpression(
      expression,
      bindings.map((field) => field!.displayName ?? '')
    );
    return {
      status: 'available',
      fieldId: output.fieldId,
      alias: output.displayName ?? '',
      dataType: dataType === 'timestamptz' ? 'timestamp with time zone' : dataType,
      semanticDigest: authority.semanticDocument.semanticPlan.sha256,
      graph: layoutSemanticExpressionGraph({ ...graph, expressionCount: projector.count }),
    };
  } catch {
    return { status: 'unavailable', reason: 'invalid-output' };
  }
}
