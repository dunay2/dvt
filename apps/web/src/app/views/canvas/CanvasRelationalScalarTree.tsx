/** Owned concern: render the existing scalar graph as connected, nested expression nodes. */
import type { SemanticWorkbenchGraph } from './semanticWorkbenchProjection';

export function CanvasRelationalScalarTree({
  graph,
  compact = false,
}: Readonly<{
  graph: SemanticWorkbenchGraph;
  compact?: boolean;
}>): JSX.Element {
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
        className="relative pl-3 before:absolute before:left-0 before:top-4 before:w-2 before:border-t before:border-(--border-default)"
      >
        <div className={compact ? 'flex h-8 min-w-0 items-center' : 'py-1'}>
          <span
            data-slot="canvas-join-expression-node"
            data-kind={node.data.semanticKind}
            data-semantic-node-id={id}
            title={node.data.detail}
            className={`inline-flex max-w-full items-baseline gap-2 rounded border border-(--border-subtle) bg-(--surface-panel) px-2 py-1 font-mono text-xs ${compact ? 'whitespace-nowrap' : 'flex-wrap'}`}
          >
            <span className="shrink-0 font-semibold text-cyan-300">{kind}</span>
            {detail.length === 0 || detail.join(' ').toUpperCase() === kind ? null : (
              <span
                className={
                  compact ? 'truncate text-(--text-strong)' : 'break-all text-(--text-strong)'
                }
              >
                {detail.join(' ')}
              </span>
            )}
          </span>
        </div>
        {childIds.length === 0 ? null : (
          <ul className="ml-3 border-l border-(--border-default)">{childIds.map(renderNode)}</ul>
        )}
      </li>
    );
  };
  return (
    <div
      data-slot="canvas-join-expression-tree"
      data-relation-id={graph.relationId}
      className={
        compact
          ? 'min-w-0 p-2'
          : 'sticky top-0 min-w-0 overflow-auto rounded border border-(--border-subtle) bg-(--surface-panel) p-2'
      }
    >
      <ul aria-label="JOIN · expression">
        {graph.nodes.filter((node) => !operands.has(node.id)).map((node) => renderNode(node.id))}
      </ul>
    </div>
  );
}
