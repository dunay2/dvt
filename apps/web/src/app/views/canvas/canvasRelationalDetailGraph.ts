/** Merge a relation's structural fields with its canonical expression roots. */
import type { CanvasRelationalTreeNode } from './canvasRelationalTreeProjection';
import type { relationalExpressionSlices } from './canvasRelationalExpressionSlice';
import { projectCanvasRelationalStructureGraph } from './canvasRelationalStructureGraph';
import type { SemanticWorkbenchGraph } from './semanticWorkbenchProjection';

export function projectCanvasRelationalDetailGraph(
  relation: CanvasRelationalTreeNode,
  expressions: ReturnType<ReturnType<typeof relationalExpressionSlices>>,
  sourceOutputFieldsByRelationId?: ReadonlyMap<string, readonly string[]>
): SemanticWorkbenchGraph {
  const structure = projectCanvasRelationalStructureGraph(
    relation,
    sourceOutputFieldsByRelationId,
    expressions.referencedFields
  );
  // A published calculation replaces its duplicate field token, not its definition.
  const roots = new Map(
    expressions.nodes.flatMap((expression) =>
      expression.data.projectExpressionOrdinal != null && expression.data.fieldReference != null
        ? [[expression.data.fieldReference.fieldId, expression.id] as const]
        : []
    )
  );
  const replacements = new Map(
    structure.nodes.flatMap((field) => {
      const rootId =
        field.data.fieldSelection === 'output'
          ? roots.get(field.data.fieldReference?.fieldId ?? '')
          : undefined;
      return rootId == null ? [] : [[field.id, rootId] as const];
    })
  );
  const outputNames = new Map(
    relation.output.fields.map((field) => [field.fieldId, field.displayName])
  );
  return {
    ...structure,
    nodes: [
      ...structure.nodes.filter((field) => !replacements.has(field.id)),
      ...expressions.nodes.map((expression) => {
        const name = outputNames.get(expression.data.fieldReference?.fieldId ?? '');
        return expression.data.projectExpressionOrdinal == null || name == null
          ? expression
          : {
              ...expression,
              data: {
                ...expression.data,
                label: `${expression.data.label.split('\n')[0]}\n${name}`,
                detail: `${name} = ${expression.data.expression ?? expression.data.detail}`,
              },
            };
      }),
    ],
    edges: [
      ...structure.edges.map((edge) => ({
        ...edge,
        source: replacements.get(edge.source) ?? edge.source,
      })),
      ...expressions.edges,
    ],
    expressionCount: expressions.nodes.length,
  };
}
