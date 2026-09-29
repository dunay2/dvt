/** Owned concern: render the existing scalar graph as connected, nested expression nodes. */
import type { SemanticWorkbenchGraph } from './semanticWorkbenchProjection';
import { CanvasRelationalScalarGraph } from './CanvasRelationalScalarGraph';
import { useContext } from 'react';
import { CanvasRelationAnalysisContext } from './CanvasRelationAnalysisContext';
import { writeCanvasRelationalFieldDrag } from './canvasRelationalTreeDrag';
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
  const analysis = useContext(CanvasRelationAnalysisContext);
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
          <span
            data-slot="canvas-relational-expression-node"
            data-kind={node.data.semanticKind}
            data-unavailable={node.data.unavailable || undefined}
            data-semantic-node-id={id}
            draggable={node.data.fieldReference != null && analysis?.error === null}
            onDragStart={(event) => {
              event.stopPropagation();
              if (node.data.fieldReference == null || analysis == null || analysis.error != null) {
                event.preventDefault();
                return;
              }
              writeCanvasRelationalFieldDrag(event.dataTransfer, {
                ...node.data.fieldReference,
                rootId: analysis.session.rootId,
                revision: analysis.revision,
              });
            }}
            title={
              node.data.unavailable ? `${copy.unavailable}: ${node.data.detail}` : node.data.detail
            }
            className="inline-flex max-w-full items-baseline gap-2 whitespace-nowrap rounded border border-(--border-subtle) bg-(--surface-panel) px-2 py-1 font-mono text-[13px] leading-5"
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
