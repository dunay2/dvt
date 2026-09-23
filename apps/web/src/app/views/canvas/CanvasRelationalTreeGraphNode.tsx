/** Owned concern: compose one relational card, contextual actions and semantic detail. */
import { ChevronDown } from 'lucide-react';
import { CanvasNodeDataAction } from '../../components/canvas/CanvasNodeDataAction';
import { useCanvasRelationalOperationExecution } from './useCanvasRelationalOperationExecution';
import { CanvasRelationalScalarTree } from './CanvasRelationalScalarTree';
import { CanvasRelationalTreeCardMenu } from './CanvasRelationalTreeCardMenu';
import { CanvasRelationalTreeNodeButton } from './CanvasRelationalTreeNodeButton';
import type { SemanticWorkbenchGraph } from './semanticWorkbenchProjection';
import type { CanvasRelationalTreePlacedNode } from './canvasRelationalTreeGeometry';
import type { CanvasRelationalTreeWorkbenchCopy } from './canvasRelationalTreeWorkbench.types';

export function CanvasRelationalTreeGraphNode({
  placed,
  selected,
  copy,
  onSelect,
  onExpand,
  onRemove,
  semanticGraph,
}: Readonly<{
  placed: CanvasRelationalTreePlacedNode;
  selected: boolean;
  copy: CanvasRelationalTreeWorkbenchCopy;
  onSelect: (locator: string) => void;
  onExpand?: (locator: string) => void;
  onRemove?: (relationId: string, keep?: 'left' | 'right') => void;
  semanticGraph?: SemanticWorkbenchGraph;
}>): JSX.Element {
  const canExpand = placed.node.expressionRefs.length > 0 || placed.node.operator === 'cross';
  const execution = useCanvasRelationalOperationExecution(placed.node);
  return (
    <CanvasRelationalTreeCardMenu node={placed.node} onRemove={onRemove} onExpand={onExpand}>
      <li
        role="none"
        className="group/canvas-node absolute"
        style={{ left: placed.x, top: placed.y, width: placed.width, height: placed.height }}
        data-parent-locator={placed.parentLocator ?? undefined}
      >
        <CanvasRelationalTreeNodeButton
          placed={placed}
          selected={selected}
          copy={copy}
          onSelect={onSelect}
          onExpand={onExpand}
          detailed={semanticGraph != null}
        />
        {execution == null ? null : (
          <div className="absolute top-full w-full">
            <CanvasNodeDataAction {...execution} />
          </div>
        )}
        {semanticGraph == null ? null : (
          <div
            data-slot="canvas-relational-semantic-zoom"
            data-relation-id={placed.node.relationId ?? undefined}
            className="rounded-b-md border border-t-0 border-blue-500 bg-(--surface-panel)"
          >
            <CanvasRelationalScalarTree graph={semanticGraph} compact />
          </div>
        )}
        {!canExpand || onExpand == null ? null : (
          <button
            type="button"
            data-slot="canvas-relational-node-expand"
            aria-label={`${copy.relationalTreeDetailLabel}: ${placed.node.operator.toUpperCase()} · ${placed.node.displayName ?? ''}`}
            title={`${copy.relationalTreeDetailLabel}: ${placed.node.operator.toUpperCase()}`}
            onClick={() => onExpand(placed.node.locator)}
            className="absolute right-1 top-1 grid size-7 place-items-center rounded text-(--text-muted) hover:bg-(--surface-selected) hover:text-(--text-strong)"
          >
            <ChevronDown aria-hidden="true" className="size-4" />
          </button>
        )}
      </li>
    </CanvasRelationalTreeCardMenu>
  );
}
