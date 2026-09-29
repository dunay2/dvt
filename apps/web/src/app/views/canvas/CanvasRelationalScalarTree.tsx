/** Owned concern: render the existing scalar graph as connected, nested expression nodes. */
import type { SemanticWorkbenchGraph } from './semanticWorkbenchProjection';
import { CanvasRelationalScalarGraph } from './CanvasRelationalScalarGraph';
import { CanvasRelationalFieldToken } from './CanvasRelationalFieldToken';
import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';
import { resolveCanvasSemanticEditorCopy } from './canvasSemanticEditorCopy';

export function CanvasRelationalScalarTree({
  graph,
  compact = false,
  onSelectCondition,
}: Readonly<{
  graph: SemanticWorkbenchGraph;
  compact?: boolean;
  onSelectCondition?: (index: number, operand?: 'left' | 'right') => void;
}>): JSX.Element {
  const copy = resolveCanvasSemanticEditorCopy(
    useApplicationLanguageStore((state) => state.language)
  );
  if (!compact)
    return <CanvasRelationalScalarGraph graph={graph} onSelectCondition={onSelectCondition} />;
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
        <div className="flex h-8 min-w-0 items-center">
          <CanvasRelationalFieldToken
            id={id}
            data={node.data}
            relationId={graph.relationId}
            title={
              node.data.unavailable ? `${copy.unavailable}: ${node.data.detail}` : node.data.detail
            }
          >
            <span
              className={
                node.data.unavailable
                  ? 'shrink-0 font-semibold text-(--status-danger)'
                  : 'shrink-0 font-semibold text-cyan-300'
              }
            >
              {kind}
            </span>
            {detail.length === 0 || detail.join(' ').toUpperCase() === kind ? null : (
              <span
                className={
                  node.data.unavailable
                    ? 'truncate text-(--status-danger)'
                    : 'truncate text-(--text-strong)'
                }
              >
                {detail.join(' ')}
              </span>
            )}
          </CanvasRelationalFieldToken>
        </div>
        {childIds.length === 0 ? null : (
          <ul className="ml-3 border-l border-(--border-default)">{childIds.map(renderNode)}</ul>
        )}
      </li>
    );
  };
  return (
    <div
      data-slot="canvas-relational-expression-tree"
      data-relation-id={graph.relationId}
      className="min-w-0 p-2"
    >
      <ul>
        {graph.nodes.filter((node) => !operands.has(node.id)).map((node) => renderNode(node.id))}
      </ul>
    </div>
  );
}
