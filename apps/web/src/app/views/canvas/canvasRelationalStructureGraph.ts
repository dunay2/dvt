/** Local published Input/Output fields, independent of the owned expression detail. */
import type { CanvasRelationalTreeNode } from './canvasRelationalTreeProjection';
import type { SemanticWorkbenchGraph } from './semanticWorkbenchProjection';

export function projectCanvasRelationalStructureGraph(
  relation: CanvasRelationalTreeNode,
  sourceOutputFieldsByRelationId?: ReadonlyMap<string, readonly string[]>
): SemanticWorkbenchGraph {
  const nodes: SemanticWorkbenchGraph['nodes'] = [];
  const edges: SemanticWorkbenchGraph['edges'] = [];
  const addFields = (owner: CanvasRelationalTreeNode, group: string): void => {
    const published =
      owner.operator === 'read' && sourceOutputFieldsByRelationId != null
        ? new Set(sourceOutputFieldsByRelationId.get(owner.relationId!) ?? [])
        : null;
    for (const field of owner.output.fields) {
      if (published != null && !published.has(field.displayName ?? '')) continue;
      const id = `${group}/${field.fieldId}`;
      nodes.push({
        id,
        position: { x: 0, y: 0 },
        data: {
          label: `FIELD\n${field.displayName ?? ''}`,
          semanticKind: 'field',
          semanticGroup: 'transformation',
          detail: field.displayName ?? '',
          fieldReference: { fieldId: field.fieldId, relationId: owner.relationId! },
        },
      });
      edges.push({ id, source: id, target: group, data: { semanticEdgeKind: 'expression' } });
    }
  };
  for (const child of relation.children) {
    const id = `${relation.locator}/input/${child.role}:${child.ordinal}`;
    nodes.push({
      id,
      position: { x: 0, y: 0 },
      data: {
        label: `${child.role.toUpperCase()}\n${child.node.displayName ?? child.node.substraitKind}`,
        semanticKind: 'relation',
        semanticGroup: 'transformation',
        detail: child.node.substraitKind,
      },
    });
    addFields(child.node, id);
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
  addFields(relation, output);
  return {
    nodes,
    edges,
    relationId: relation.relationId!,
    relationCount: relation.children.length,
    expressionCount: 0,
  };
}
