/** Local structural inspection when a relation has no owned expression tree. */
import type { CanvasRelationalTreeNode } from './canvasRelationalTreeProjection';
import type { SemanticWorkbenchGraph } from './semanticWorkbenchProjection';

export function projectCanvasRelationalStructureGraph(
  relation: CanvasRelationalTreeNode
): SemanticWorkbenchGraph {
  const nodes: SemanticWorkbenchGraph['nodes'] = [];
  const edges: SemanticWorkbenchGraph['edges'] = [];
  for (const child of relation.children) {
    nodes.push({
      id: `${relation.locator}/input/${child.role}:${child.ordinal}`,
      position: { x: 0, y: 0 },
      data: {
        label: `${child.role.toUpperCase()}\n${child.node.displayName ?? child.node.substraitKind}`,
        semanticKind: 'relation',
        semanticGroup: 'transformation',
        detail: child.node.substraitKind,
      },
    });
  }
  const output = `${relation.locator}/output`;
  nodes.push({
    id: output,
    position: { x: 0, y: 0 },
    data: {
      label: 'OUTPUT',
      semanticKind: 'group',
      semanticGroup: 'transformation',
      detail: 'Output',
    },
  });
  for (const field of relation.output.fields) {
    nodes.push({
      id: field.fieldId,
      position: { x: 0, y: 0 },
      data: {
        label: `FIELD\n${field.displayName ?? ''}`,
        semanticKind: 'field',
        semanticGroup: 'transformation',
        detail: field.displayName ?? '',
        fieldReference: { fieldId: field.fieldId, relationId: relation.relationId! },
      },
    });
    edges.push({
      id: `${output}/${field.fieldId}`,
      source: field.fieldId,
      target: output,
      data: { semanticEdgeKind: 'expression' },
    });
  }
  return {
    nodes,
    edges,
    relationId: relation.relationId!,
    relationCount: relation.children.length,
    expressionCount: 0,
  };
}
