/** Owned concern: show the existing scalar projection of the selected JOIN, not another AST. */
import { useMemo } from 'react';
import type { CanonicalNode } from '../../types/canonical';
import type { DvtSubstraitInnerJoinDraft } from './canvasDvtSubstraitJoinComposition';
import { createCanvasRelationalTreeNodeDraft } from './canvasRelationalTreeAuthoringModel';
import { applyCanvasInspectorNodeDraft } from './canvasInspectorAuthoringModel';
import { projectSemanticWorkbenchGraph } from './semanticWorkbenchProjection';

export function CanvasRelationalJoinExpressionTree({
  transformNode,
  draft,
  relationId,
}: Readonly<{
  transformNode: CanonicalNode;
  draft?: DvtSubstraitInnerJoinDraft;
  relationId: string | null;
}>): JSX.Element | null {
  const graph = useMemo(() => {
    if (relationId == null) return null;
    const node =
      draft == null
        ? transformNode
        : applyCanvasInspectorNodeDraft(
            transformNode,
            createCanvasRelationalTreeNodeDraft(transformNode, 'inner_join', draft)
          );
    return projectSemanticWorkbenchGraph(node, {
      view: 'join-expression',
      joinRelationId: relationId,
    });
  }, [transformNode, draft, relationId]);
  if (graph == null) return null;
  const nodes = new Map(graph.nodes.map((node) => [node.id, node]));
  const children = new Map<string, string[]>();
  const operands = new Set<string>();
  for (const edge of graph.edges) {
    children.set(edge.target, [...(children.get(edge.target) ?? []), edge.source]);
    operands.add(edge.source);
  }
  const renderNode = (id: string): JSX.Element => {
    const node = nodes.get(id)!;
    const [kind, ...detail] = node.data.label.split('\n');
    const childIds = children.get(id) ?? [];
    return (
      <li
        key={id}
        className="relative py-1 pl-3 before:absolute before:left-0 before:top-4 before:w-2 before:border-t before:border-(--border-default)"
      >
        <span
          data-slot="canvas-join-expression-node"
          data-kind={node.data.semanticKind}
          title={node.data.detail}
          className="inline-flex max-w-full flex-wrap items-baseline gap-2 rounded border border-(--border-subtle) bg-(--surface-subtle) px-2 py-1 font-mono text-xs"
        >
          <span className="font-semibold text-cyan-300">{kind}</span>
          {detail.length === 0 || detail.join(' ').toUpperCase() === kind ? null : (
            <span className="break-all text-(--text-primary)">{detail.join(' ')}</span>
          )}
        </span>
        {childIds.length === 0 ? null : (
          <ul className="ml-3 border-l border-(--border-default)">{childIds.map(renderNode)}</ul>
        )}
      </li>
    );
  };
  return (
    <div
      data-slot="canvas-join-expression-tree"
      data-relation-id={relationId}
      className="sticky top-0 min-w-0 overflow-auto rounded border border-(--border-subtle) bg-(--surface-panel) p-2"
    >
      <ul aria-label="JOIN · expression">
        {graph.nodes.filter((node) => !operands.has(node.id)).map((node) => renderNode(node.id))}
      </ul>
    </div>
  );
}
