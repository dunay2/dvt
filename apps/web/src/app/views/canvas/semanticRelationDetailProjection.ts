/** Project aggregate, ordering and slicing details through the shared expression graph. */
import type { Rel } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import type { Plan } from '@buf/substrait_substrait.bufbuild_es/substrait/plan_pb.js';
import type { SemanticWorkbenchGraph } from './semanticWorkbenchProjection';
import type { createSemanticExpressionProjector } from './semanticExpressionGraphProjection';
import { createSemanticExpressionDescription, literalLabel } from './semanticExpressionDescription';
import { semanticExpressionStyles } from './semanticExpressionGraphLayout';
import { sortDirectionLabel } from './semanticWorkbenchRelationMetadata';

export function projectSemanticRelationDetails({
  relation,
  relationId,
  fields,
  plan,
  nodes,
  edges,
  nextId,
  addExpression,
}: Readonly<{
  relation: Rel;
  relationId: string;
  fields: readonly string[];
  plan: Plan;
  nodes: SemanticWorkbenchGraph['nodes'];
  edges: SemanticWorkbenchGraph['edges'];
  nextId: (prefix: string) => string;
  addExpression: ReturnType<typeof createSemanticExpressionProjector>['addExpression'];
}>): number {
  const { functionName } = createSemanticExpressionDescription(plan);
  let count = 0;
  function connect(source: string, target: string): void {
    edges.push({ id: nextId('edge'), source, target, data: { semanticEdgeKind: 'expression' } });
  }
  function addDetail(label: string, kind: 'expression' | 'literal' = 'expression'): string {
    count += 1;
    const id = nextId('relation-detail');
    nodes.push({
      id,
      position: { x: 0, y: 0 },
      data: {
        label,
        semanticKind: kind,
        semanticGroup: 'condition',
        detail: label.replaceAll('\n', ' · '),
      },
      style: semanticExpressionStyles[kind],
    });
    connect(id, relationId);
    return id;
  }
  switch (relation.relType.case) {
    case 'aggregate':
      for (const { measure } of relation.relType.value.measures) {
        if (measure == null) continue;
        const name = functionName(measure.functionReference);
        const id = addDetail(
          `${name.toUpperCase()}\n${measure.arguments.length === 0 ? '(*)' : name}`
        );
        for (const argument of measure.arguments) {
          if (argument.argType.case === 'value')
            connect(addExpression(argument.argType.value, fields), id);
        }
      }
      break;
    case 'sort':
      for (const key of relation.relType.value.sorts) {
        const direction =
          key.sortKind.case === 'direction' ? sortDirectionLabel(key.sortKind.value) : '';
        const id = addDetail(`ORDER BY\n${direction}`);
        if (key.expr != null) connect(addExpression(key.expr, fields), id);
      }
      break;
    case 'fetch': {
      const { countExpr, offsetExpr } = relation.relType.value;
      addDetail(`LIMIT\n${countExpr == null ? 'ALL' : literalLabel(countExpr)}`, 'literal');
      addDetail(`OFFSET\n${offsetExpr == null ? '0' : literalLabel(offsetExpr)}`, 'literal');
      break;
    }
  }
  return count;
}
