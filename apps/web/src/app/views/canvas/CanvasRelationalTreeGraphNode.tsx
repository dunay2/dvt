/** Owned concern: compose one relational card, contextual actions and semantic detail. */
import { ChevronDown } from 'lucide-react';
import { useId } from 'react';
import { CanvasNodeDataAction } from '../../components/canvas/CanvasNodeDataAction';
import { useCanvasRelationalOperationExecution } from './useCanvasRelationalOperationExecution';
import { CanvasRelationalScalarTree } from './CanvasRelationalScalarTree';
import { CanvasRelationalTreeCardMenu } from './CanvasRelationalTreeCardMenu';
import { CanvasRelationalTreeNodeButton } from './CanvasRelationalTreeNodeButton';
import type { SemanticWorkbenchGraph } from './semanticWorkbenchProjection';
import type { CanvasRelationalTreePlacedNode } from './canvasRelationalTreeGeometry';
import type { CanvasRelationalTreeWorkbenchCopy } from './canvasRelationalTreeWorkbench.types';
import type { CanvasStagedOperation } from './canvasStagedOperation';
import { CanvasRelationalOperationPorts } from './CanvasRelationalOperationPorts';
import styles from './CanvasRelationalTreeCard.module.css';

export function CanvasRelationalTreeGraphNode({
  placed,
  selected,
  copy,
  onSelect,
  onExpand,
  onRemove,
  semanticGraph,
  expanded,
  onToggleDetail,
  movable,
  pending = false,
  stagedOperation,
  selectedConnectionSource,
  onSelectConnectionSource,
  onConnectOperation,
}: Readonly<{
  placed: CanvasRelationalTreePlacedNode;
  selected: boolean;
  copy: CanvasRelationalTreeWorkbenchCopy;
  onSelect: (locator: string) => void;
  onExpand?: (locator: string) => void;
  onRemove?: (relationId: string, keep?: 'left' | 'right') => void;
  semanticGraph?: SemanticWorkbenchGraph;
  expanded: boolean;
  onToggleDetail?: () => void;
  movable: boolean;
  pending?: boolean;
  stagedOperation?: CanvasStagedOperation;
  selectedConnectionSource?: string | null;
  onSelectConnectionSource?: (relationId: string) => void;
  onConnectOperation?: (operationId: string, port: number, relationId: string) => void;
}>): JSX.Element {
  const detailId = useId();
  const detailed = expanded && semanticGraph != null;
  const execution = useCanvasRelationalOperationExecution(placed.node);
  return (
    <CanvasRelationalTreeCardMenu
      node={placed.node}
      pending={pending}
      onRemove={onRemove}
      onExpand={onExpand}
    >
      <li
        role="none"
        className={styles.card}
        style={{ left: placed.x, top: placed.y, width: placed.width, height: placed.height }}
        data-parent-locator={placed.parentLocator ?? undefined}
        data-pending-operation={stagedOperation == null ? undefined : true}
      >
        <CanvasRelationalTreeNodeButton
          placed={placed}
          selected={selected}
          copy={copy}
          onSelect={onSelect}
          onExpand={onExpand}
          onDelete={
            onRemove == null || placed.node.relationId == null
              ? undefined
              : () => onRemove(placed.node.relationId!)
          }
          detailed={detailed}
          movable={movable}
          pending={pending}
          hideDetail={stagedOperation != null && !pending}
        />
        {onSelectConnectionSource == null || onConnectOperation == null ? null : (
          <CanvasRelationalOperationPorts
            relationId={placed.node.relationId}
            staged={stagedOperation}
            copy={copy}
            selectedSource={selectedConnectionSource ?? null}
            onSelectSource={onSelectConnectionSource}
            onConnect={onConnectOperation}
          />
        )}
        {execution == null ? null : (
          <div className={styles.execution}>
            <CanvasNodeDataAction {...execution} />
          </div>
        )}
        {!detailed ? null : (
          <div
            id={detailId}
            data-slot="canvas-relational-card-detail"
            data-relation-id={placed.node.relationId ?? undefined}
            className={styles.semanticDetail}
          >
            <CanvasRelationalScalarTree graph={semanticGraph} compact />
          </div>
        )}
        {semanticGraph == null || onToggleDetail == null ? null : (
          <button
            type="button"
            data-slot="canvas-relational-node-expand"
            aria-label={`${copy.relationalTreeDetailLabel}: ${placed.node.operator.toUpperCase()} · ${placed.node.displayName ?? ''}`}
            title={`${copy.relationalTreeDetailLabel}: ${placed.node.operator.toUpperCase()}`}
            aria-expanded={detailed}
            aria-controls={detailed ? detailId : undefined}
            onClick={onToggleDetail}
            className={styles.expand}
          >
            <ChevronDown
              aria-hidden="true"
              data-expanded={detailed}
              className={styles.expandIcon}
            />
          </button>
        )}
      </li>
    </CanvasRelationalTreeCardMenu>
  );
}
