/** Owned concern: compose one interactive graph-node column row. */
import { useEffect, useRef, useState, type ReactElement } from 'react';

import { CanvasNodePortHandle } from '../../components/canvas/CanvasNodePortHandle';
import { graphColumnInspectionProps, type GraphNodeColumnInspect } from './graphColumnInspection';
import type {
  GraphNodeColumn,
  GraphNodeColumnCompositionFunctionResolver,
  GraphNodeColumnOutputToggleIdentity,
  GraphNodeColumnPortDirection,
  GraphNodeColumnPortIdentity,
  GraphNodeColumnReorderIdentity,
  GraphNodeColumnSectionProps,
} from './graphNodeColumnContracts';
import { GraphNodeColumnDropCompositionFlow } from './GraphNodeColumnDropCompositionFlow';
import { GraphNodeColumnActions } from './GraphNodeColumnActions';
import {
  GraphNodeColumnPiece,
  GraphNodeColumnTooltip,
  type GraphNodeColumnCopy,
} from './GraphNodeColumnPiece';
import { GraphNodeExpressionComposer } from './GraphNodeExpressionComposer';
import { graphNodeColumnClasses } from './graphVisualTokens';
import type { GraphNodeColumnReorderController } from './useGraphNodeColumnReorder';

export function GraphNodeColumnRow(props: {
  onColumnInspect?: GraphNodeColumnInspect;
  column: GraphNodeColumn;
  nodeId?: string;
  portDirections: readonly GraphNodeColumnPortDirection[];
  activeColumnHandleId?: string | null;
  copy: GraphNodeColumnCopy;
  showSourceName?: boolean;
  reorder: GraphNodeColumnReorderController;
  unavailableAliases: readonly string[];
  expressionOperandCandidates: readonly GraphNodeColumn[];
  structuredAppendCandidates: readonly GraphNodeColumn[];
  compositionRequest?: Readonly<{
    sourceColumn: GraphNodeColumn;
    targetColumn: GraphNodeColumn;
  }>;
  onCompositionDismiss?: () => void;
  focusRequested?: boolean;
  onFocusFulfilled?: () => void;
  onFunctionApplied?: (createdFieldId: string) => void;
  onCreateAlias?: () => void;
  resolveColumnCompositionFunctions?: GraphNodeColumnCompositionFunctionResolver;
  onColumnPortActivate?: (identity: GraphNodeColumnPortIdentity) => void;
  onColumnFunctionApply?: GraphNodeColumnSectionProps['onColumnFunctionApply'];
  onStructuredFieldApply?: GraphNodeColumnSectionProps['onStructuredFieldApply'];
  onColumnOutputToggle?: (identity: GraphNodeColumnOutputToggleIdentity) => void;
  onColumnReorder?: (identity: GraphNodeColumnReorderIdentity) => void;
}): ReactElement {
  const pieceRef = useRef<HTMLDivElement>(null);
  const [keyboardFunctionMenuOpen, setKeyboardFunctionMenuOpen] = useState(false);
  const [pendingFunction, setPendingFunction] = useState<string | null>(null);
  const { column, nodeId, copy, reorder } = props;
  const columnId = column.id ?? column.name;
  const isOutput = column.output !== false;
  const inspectionProps = graphColumnInspectionProps(
    column,
    nodeId,
    props.onColumnInspect,
    pieceRef
  );
  useEffect(() => {
    if (!props.focusRequested) return;
    pieceRef.current?.focus();
    props.onFocusFulfilled?.();
  }, [props.focusRequested, props.onFocusFulfilled]);
  const piece = (
    <GraphNodeColumnPiece
      {...inspectionProps}
      ref={pieceRef}
      column={column}
      isOutput={isOutput}
      canReorder={reorder.canReorder(column)}
      outputToggleDisabled={nodeId == null || props.onColumnOutputToggle == null}
      copy={copy}
      showSourceName={props.showSourceName}
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
          ...(column.source == null ? {} : { source: column.source }),
          ...(!isOutput ? { placement: reorder.resolveActivationPlacement(columnId) } : {}),
        });
      }}
    />
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
          nodeId != null &&
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
      <GraphNodeColumnActions
        column={column}
        nodeId={nodeId}
        copy={copy}
        piece={piece}
        tooltip={<GraphNodeColumnTooltip type={column.type} />}
        appendCandidates={props.structuredAppendCandidates}
        keyboardOpen={keyboardFunctionMenuOpen}
        onKeyboardOpenChange={setKeyboardFunctionMenuOpen}
        onCreateAlias={props.onCreateAlias}
        onStructuredFieldApply={props.onStructuredFieldApply}
        onColumnOutputToggle={props.onColumnOutputToggle}
        onRequest={
          props.onColumnFunctionApply == null
            ? undefined
            : (capabilityId) => {
                if (column.functionMenu?.items.some((item) => item.capabilityId === capabilityId))
                  setPendingFunction(capabilityId);
              }
        }
      />
      {nodeId == null ? null : (
        <GraphNodeColumnDropCompositionFlow
          nodeId={nodeId}
          targetColumn={column}
          request={props.compositionRequest}
          operandCandidates={props.expressionOperandCandidates}
          unavailableNames={props.unavailableAliases}
          copy={copy}
          onDismiss={() => props.onCompositionDismiss?.()}
          resolveCompositionFunctions={props.resolveColumnCompositionFunctions}
          onFunctionApply={props.onColumnFunctionApply}
          onFunctionApplied={props.onFunctionApplied}
          onStructuredFieldApply={props.onStructuredFieldApply}
        />
      )}
      {nodeId != null && pendingFunction != null && props.onColumnFunctionApply != null ? (
        <GraphNodeExpressionComposer
          key={`${columnId}:${pendingFunction}`}
          nodeId={nodeId}
          columnId={columnId}
          functions={column.functionMenu?.items ?? []}
          initialCapabilityId={pendingFunction}
          initialOperandFieldIds={[columnId]}
          operandCandidates={props.expressionOperandCandidates}
          resolveCompositionFunctions={props.resolveColumnCompositionFunctions}
          unavailableAliases={props.unavailableAliases}
          copy={copy}
          onCancel={() => setPendingFunction(null)}
          onApply={props.onColumnFunctionApply}
          onApplied={props.onFunctionApplied}
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
