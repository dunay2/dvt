/** Render a local predicate preview without rebuilding or accepting the containing model. */
import { useContext, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { CanvasOperationExpressionHost } from './CanvasRelationalTreeEditorFrame';
import { CanvasRelationalScalarTree } from './CanvasRelationalScalarTree';
import type { SelectedJoin } from './canvasSelectedJoin';
import type { DvtSubstraitJoinPredicateCondition } from './canvasDvtSubstraitJoinCondition';
import { buildSelectedJoinExpression } from './canvasSelectedJoinExpression';
import { createSemanticExpressionProjector } from './semanticExpressionGraphProjection';
import { layoutSemanticExpressionGraph } from './semanticExpressionGraphLayout';
import type { SemanticWorkbenchGraph } from './semanticWorkbenchProjection';

export function CanvasSelectedJoinConditionTree({
  selected,
  conditions,
  onSelectCondition,
}: Readonly<{
  selected: SelectedJoin;
  conditions: readonly DvtSubstraitJoinPredicateCondition[] | null;
  onSelectCondition: (index: number, operand?: 'left' | 'right') => void;
}>) {
  const dock = useContext(CanvasOperationExpressionHost);
  const graph = useMemo(() => {
    try {
      const original = selected.target.relation.relType;
      const { plan, expression } =
        conditions == null
          ? {
              plan: selected.target.plan,
              expression: original.case === 'join' ? original.value.expression : undefined,
            }
          : buildSelectedJoinExpression({ ...selected, plan: selected.target.plan }, conditions);
      if (expression == null) return null;
      const nodes: SemanticWorkbenchGraph['nodes'] = [];
      const edges: SemanticWorkbenchGraph['edges'] = [];
      let next = 0;
      const projector = createSemanticExpressionProjector({
        plan,
        nodes,
        edges,
        nextId: (prefix) => `${selected.relationId}-${prefix}-${next++}`,
      });
      let offset = 0;
      const labels = selected.inputs.flatMap((input) => {
        const names = input.fields.map(
          (_, ordinal) =>
            selected.fields.find((candidate) => candidate.ordinal === offset + ordinal)?.label ??
            input.bindings.find(
              (field) => field.parentFieldId == null && field.outputOrdinal === ordinal
            )?.displayName ??
            String(ordinal)
        );
        offset += input.fields.length;
        return names;
      });
      projector.addExpression(expression, labels, { joinRelationId: selected.relationId });
      return layoutSemanticExpressionGraph({
        nodes,
        edges,
        relationCount: 0,
        expressionCount: projector.count,
        relationId: selected.relationId,
      });
    } catch {
      return null;
    }
  }, [selected, conditions]);
  const tree =
    graph == null ? (
      <p role="status">Completa los operandos para representar la condición.</p>
    ) : (
      <CanvasRelationalScalarTree
        graph={graph}
        onSelectCondition={(index, operand) => {
          dock?.openProperties();
          onSelectCondition(index, operand);
        }}
      />
    );
  return dock == null ? tree : dock.host == null ? null : createPortal(tree, dock.host);
}
