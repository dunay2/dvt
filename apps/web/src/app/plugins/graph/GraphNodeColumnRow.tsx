/** Owned concern: compose one interactive graph-node column row. */
import { useState, type ReactElement } from 'react';

import { CanvasNodePortHandle } from '../../components/canvas/CanvasNodePortHandle';
import { Tooltip, TooltipTrigger } from '../../components/ui/tooltip';
import type {
  GraphNodeColumn,
  GraphNodeColumnOutputToggleIdentity,
  GraphNodeColumnPortDirection,
  GraphNodeColumnPortIdentity,
} from './graphNodeColumnContracts';
import { GraphNodeColumnFunctionMenu } from './GraphNodeColumnFunctionMenu';
import {
  GraphNodeColumnPiece,
  GraphNodeColumnTooltip,
  type GraphNodeColumnCopy,
} from './GraphNodeColumnPiece';
import { graphNodeColumnClasses } from './graphVisualTokens';
import type { GraphNodeColumnReorderController } from './useGraphNodeColumnReorder';

export function GraphNodeColumnRow(props: {
  column: GraphNodeColumn;
  nodeId?: string;
  portDirections: readonly GraphNodeColumnPortDirection[];
  activeColumnHandleId?: string | null;
  copy: GraphNodeColumnCopy;
  reorder: GraphNodeColumnReorderController;
  onColumnPortActivate?: (identity: GraphNodeColumnPortIdentity) => void;
  onColumnFunctionApply?: (identity: {
    nodeId: string;
    columnId: string;
    capabilityId: string;
  }) => void;
  onColumnOutputToggle?: (identity: GraphNodeColumnOutputToggleIdentity) => void;
}): ReactElement {
  const [keyboardFunctionMenuOpen, setKeyboardFunctionMenuOpen] = useState(false);
  const { column, nodeId, copy, reorder } = props;
  const columnId = column.id ?? column.name;
  const isOutput = column.output !== false;
  const piece = (
    <GraphNodeColumnPiece
      column={column}
      isOutput={isOutput}
      canReorder={reorder.canReorder(column)}
      outputToggleDisabled={nodeId == null || props.onColumnOutputToggle == null}
      copy={copy}
      onDragStart={(event) => reorder.startDrag(column, event)}
      onDragEnd={reorder.endDrag}
      onOutputToggle={() => {
        if (nodeId == null) return;
        props.onColumnOutputToggle?.({
          nodeId,
          columnId,
          columnType: column.type,
          output: !isOutput,
          ...(!isOutput ? { placement: reorder.resolveActivationPlacement(column.name) } : {}),
        });
      }}
    />
  );
  const tooltip = <GraphNodeColumnTooltip column={column} isOutput={isOutput} copy={copy} />;
  const content =
    nodeId != null && column.functionMenu != null && props.onColumnFunctionApply != null ? (
      <GraphNodeColumnFunctionMenu
        menu={column.functionMenu}
        copy={copy}
        keyboardOpen={keyboardFunctionMenuOpen}
        onKeyboardOpenChange={setKeyboardFunctionMenuOpen}
        onApply={(capabilityId) =>
          props.onColumnFunctionApply?.({ nodeId, columnId, capabilityId })
        }
        piece={piece}
        tooltip={tooltip}
      />
    ) : (
      <Tooltip>
        <TooltipTrigger asChild>{piece}</TooltipTrigger>
        {tooltip}
      </Tooltip>
    );

  return (
    <div
      data-slot="graph-node-column-row"
      data-drop-placement={reorder.dropPlacement(column)}
      className={graphNodeColumnClasses.row}
      onDragOver={(event) => reorder.dragOver(column, event)}
      onDragLeave={reorder.dragLeave}
      onDrop={(event) => reorder.drop(column, event)}
      onKeyDownCapture={(event) => {
        if (reorder.moveWithKeyboard(column, event)) return;
        if (
          column.functionMenu != null &&
          props.onColumnFunctionApply != null &&
          ((event.key === 'F10' && event.shiftKey) || event.key === 'ContextMenu')
        ) {
          event.preventDefault();
          event.stopPropagation();
          setKeyboardFunctionMenuOpen(true);
        }
      }}
    >
      {nodeId != null &&
      column.targetHandleId != null &&
      props.portDirections.includes('target') ? (
        <CanvasNodePortHandle
          kind="target"
          id={column.targetHandleId}
          tone="model"
          variant="column"
          active={props.activeColumnHandleId === column.targetHandleId}
          label={copy.targetColumnPortLabelTemplate.replace('{column}', column.name)}
          onActivate={() => props.onColumnPortActivate?.({ direction: 'target', nodeId, columnId })}
        />
      ) : null}
      {content}
      {nodeId != null &&
      column.sourceHandleId != null &&
      props.portDirections.includes('source') ? (
        <CanvasNodePortHandle
          kind="source"
          id={column.sourceHandleId}
          tone="source"
          variant="column"
          active={props.activeColumnHandleId === column.sourceHandleId}
          label={copy.sourceColumnPortLabelTemplate.replace('{column}', column.name)}
          onActivate={() => props.onColumnPortActivate?.({ direction: 'source', nodeId, columnId })}
        />
      ) : null}
    </div>
  );
}
