/** Owned concern: compose one relational card, contextual actions and semantic detail. */
import { ChevronDown } from 'lucide-react';
import { useContext, useId } from 'react';
import { CanvasCardRemovalContext } from './CanvasCardRemovalContext';
import { CanvasNodeDataAction } from '../../components/canvas/CanvasNodeDataAction';
import { useCanvasRelationalOperationExecution } from './useCanvasRelationalOperationExecution';
import { CanvasRelationalTreeCardMenu } from './CanvasRelationalTreeCardMenu';
import { CanvasRelationalTreeCardDetail } from './CanvasRelationalTreeCardDetail';
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
  onRemove?: (relationId: string) => void;
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
  const removal = useContext(CanvasCardRemovalContext);
  const detailed = expanded && semanticGraph != null;
  const execution = useCanvasRelationalOperationExecution(placed.node);
  return (
    <CanvasRelationalTreeCardMenu node={placed.node} onRemove={onRemove} onExpand={onExpand}>
      <li
        role="none"
        data-slot="canvas-relational-card"
        className={styles.card}
        data-removal-impact={
          removal?.pending?.affectedIds.includes(placed.node.relationId ?? '') || undefined
        }
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
          missingInput={stagedOperation?.inputs.includes(null)}
          hideDetail={stagedOperation != null && !pending}
        />
        {onSelectConnectionSource == null || onConnectOperation == null ? null : (
          <CanvasRelationalOperationPorts
            node={placed.node}
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
            {execution.disabledReason == null ? null : (
              <p data-slot="canvas-operation-preview-reason" className={styles.previewReason}>
                {execution.disabledReason}
              </p>
            )}
          </div>
        )}
        {!detailed ? null : (
          <CanvasRelationalTreeCardDetail
            id={detailId}
            relationId={placed.node.relationId ?? undefined}
            label={copy.relationalTreeDetailLabel}
            graph={semanticGraph}
            stagedOperation={stagedOperation}
          />
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
