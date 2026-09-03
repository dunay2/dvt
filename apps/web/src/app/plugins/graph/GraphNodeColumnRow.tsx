/** Owned concern: compose one interactive graph-node column row. */
import { useState, type ReactElement } from 'react';

import { CanvasNodePortHandle } from '../../components/canvas/CanvasNodePortHandle';
import { Tooltip, TooltipTrigger } from '../../components/ui/tooltip';
import type {
  GraphNodeColumn,
  GraphNodeColumnFunctionApplyIdentity,
  GraphNodeColumnOutputToggleIdentity,
  GraphNodeColumnPortDirection,
  GraphNodeColumnPortIdentity,
  GraphNodeColumnReorderIdentity,
  GraphNodeStructuredFieldIdentity,
} from './graphNodeColumnContracts';
import { GraphNodeColumnDropCompositionFlow } from './GraphNodeColumnDropCompositionFlow';
import { GraphNodeColumnFunctionAliasForm } from './GraphNodeColumnFunctionAliasForm';
import { GraphNodeColumnFunctionMenu } from './GraphNodeColumnFunctionMenu';
import {
  GraphNodeColumnPiece,
  GraphNodeColumnTooltip,
  type GraphNodeColumnCopy,
} from './GraphNodeColumnPiece';
import { graphNodeColumnClasses } from './graphVisualTokens';
import type { GraphNodeColumnReorderController } from './useGraphNodeColumnReorder';

type PendingFunctionRequest = Readonly<{ capabilityId: string; functionName: string }>;

export function GraphNodeColumnRow(props: {
  column: GraphNodeColumn;
  nodeId?: string;
  portDirections: readonly GraphNodeColumnPortDirection[];
  activeColumnHandleId?: string | null;
  copy: GraphNodeColumnCopy;
  reorder: GraphNodeColumnReorderController;
  unavailableAliases: readonly string[];
  compositionRequest?: Readonly<{
    sourceColumn: GraphNodeColumn;
    targetColumn: GraphNodeColumn;
  }>;
  onCompositionDismiss?: () => void;
  onColumnPortActivate?: (identity: GraphNodeColumnPortIdentity) => void;
  onColumnFunctionApply?: (identity: GraphNodeColumnFunctionApplyIdentity) => void;
  onStructuredFieldApply?: (identity: GraphNodeStructuredFieldIdentity) => void;
  onColumnOutputToggle?: (identity: GraphNodeColumnOutputToggleIdentity) => void;
  onColumnReorder?: (identity: GraphNodeColumnReorderIdentity) => void;
}): ReactElement {
  const [keyboardFunctionMenuOpen, setKeyboardFunctionMenuOpen] = useState(false);
  const [pendingFunction, setPendingFunction] = useState<PendingFunctionRequest | null>(null);
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
      nodeId={nodeId}
      onNestedColumnReorder={props.onColumnReorder}
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
        onRequest={(capabilityId) => {
          const selectedFunction = column.functionMenu?.items.find(
            (item) => item.capabilityId === capabilityId
          );
          if (selectedFunction != null) {
            setPendingFunction({ capabilityId, functionName: selectedFunction.name });
          }
        }}
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
      onKeyDown={(event) => {
        if (reorder.composeWithKeyboard(column, event)) return;
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
      {nodeId == null ? null : (
        <GraphNodeColumnDropCompositionFlow
          nodeId={nodeId}
          targetColumn={column}
          request={props.compositionRequest}
          unavailableNames={props.unavailableAliases}
          copy={copy}
          onDismiss={() => props.onCompositionDismiss?.()}
          onFunctionApply={props.onColumnFunctionApply}
          onStructuredFieldApply={props.onStructuredFieldApply}
        />
      )}
      {nodeId != null && pendingFunction != null && props.onColumnFunctionApply != null ? (
        <GraphNodeColumnFunctionAliasForm
          functionName={pendingFunction.functionName}
          unavailableAliases={props.unavailableAliases}
          copy={copy}
          onCancel={() => setPendingFunction(null)}
          onSubmit={(alias) => {
            props.onColumnFunctionApply?.({
              nodeId,
              columnId,
              capabilityId: pendingFunction.capabilityId,
              alias,
            });
            setPendingFunction(null);
          }}
        />
      ) : null}
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
