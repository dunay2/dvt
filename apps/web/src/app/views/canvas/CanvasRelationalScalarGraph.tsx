/** Owned concern: connected expression cards over the existing scalar projection. */
import { useId, useState } from 'react';
import { Braces, FunctionSquare, Hash, Minus, Plus, Maximize } from 'lucide-react';
import type { SemanticWorkbenchGraph } from './semanticWorkbenchProjection';
import { useCanvasRelationalTreeViewport } from './useCanvasRelationalTreeViewport';

export function CanvasRelationalScalarGraph({
  graph,
  onSelectCondition,
}: Readonly<{
  graph: SemanticWorkbenchGraph;
  onSelectCondition?: (index: number, operand?: 'left' | 'right') => void;
}>): JSX.Element {
  const marker = useId();
  const [selected, setSelected] = useState<string | null>(null);
  const viewport = useCanvasRelationalTreeViewport(graph.relationId, 8);
  const byId = new Map(graph.nodes.map((node) => [node.id, node]));
  const width = Math.max(420, ...graph.nodes.map((node) => node.position.x + 230));
  const height = Math.max(100, ...graph.nodes.map((node) => node.position.y + 68));
  return (
    <div
      className="relative h-full min-h-40 min-w-0 rounded-lg border border-(--border-subtle) bg-(--surface-subtle)"
      data-slot="canvas-join-expression-tree"
      data-relation-id={graph.relationId}
    >
      <div
        ref={viewport.viewportRef}
        className="absolute inset-x-0 top-0 bottom-9 overflow-auto p-1"
        onPointerDown={viewport.onPointerDown}
        onPointerMove={viewport.onPointerMove}
        onPointerUp={viewport.onPointerUp}
        onPointerCancel={viewport.onPointerUp}
      >
        <div
          ref={viewport.contentRef}
          className="relative"
          style={{ width, height, zoom: viewport.zoom }}
        >
          <svg
            className="pointer-events-none absolute inset-0"
            width={width}
            height={height}
            aria-hidden="true"
          >
            <defs>
              <marker id={marker} markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                <path d="M0,0 L6,3 L0,6" fill="#38bdf8" />
              </marker>
            </defs>
            {graph.edges.map((edge) => {
              const child = byId.get(edge.source),
                parent = byId.get(edge.target);
              if (child == null || parent == null) return null;
              const x1 = parent.position.x + 103,
                y1 = parent.position.y + 60;
              const x2 = child.position.x + 103,
                y2 = child.position.y;
              const mid = (y1 + y2) / 2;
              return (
                <path
                  key={edge.id}
                  d={`M${x1},${y1} V${mid} H${x2} V${y2}`}
                  fill="none"
                  stroke="#38bdf8"
                  strokeWidth="1.4"
                  markerEnd={`url(#${marker})`}
                />
              );
            })}
          </svg>
          {graph.nodes.map((node) => {
            const [kind, ...details] = node.data.label.split('\n');
            const Icon =
              node.data.semanticKind === 'field'
                ? Hash
                : node.data.semanticKind === 'literal'
                  ? Braces
                  : FunctionSquare;
            return (
              <button
                key={node.id}
                type="button"
                data-slot="canvas-join-expression-node"
                data-kind={node.data.semanticKind}
                data-semantic-node-id={node.id}
                title={node.data.detail}
                aria-pressed={selected === node.id}
                onClick={() => {
                  setSelected(node.id);
                  if (node.data.joinConditionIndex != null)
                    onSelectCondition?.(
                      node.data.joinConditionIndex,
                      node.data.joinOperand?.operand
                    );
                }}
                className="absolute flex h-[60px] w-[206px] items-center gap-3 rounded-lg border border-sky-800 bg-(--surface-panel) px-3 text-left hover:border-sky-400 aria-pressed:border-sky-400 aria-pressed:ring-1 aria-pressed:ring-sky-400"
                style={{ left: node.position.x, top: node.position.y }}
              >
                <Icon className="size-5 shrink-0 text-sky-300" aria-hidden="true" />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-(--text-strong)">{kind}</span>
                  <span className="block truncate text-xs text-(--text-muted)">
                    {details.join(' ')}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
      <div className="absolute bottom-2 left-2 flex items-center gap-1 rounded border border-(--border-subtle) bg-(--surface-panel) p-1">
        <button
          type="button"
          aria-label="Alejar expresión"
          className="grid size-7 place-items-center"
          onClick={() => viewport.changeZoom(-0.1)}
        >
          <Minus className="size-4" />
        </button>
        <span className="min-w-10 text-center text-xs">{Math.round(viewport.zoom * 100)}%</span>
        <button
          type="button"
          aria-label="Ajustar expresión"
          className="grid size-7 place-items-center"
          onClick={viewport.fit}
        >
          <Maximize className="size-4" />
        </button>
        <button
          type="button"
          aria-label="Acercar expresión"
          className="grid size-7 place-items-center"
          onClick={() => viewport.changeZoom(0.1)}
        >
          <Plus className="size-4" />
        </button>
      </div>
    </div>
  );
}
