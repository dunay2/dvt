/** Owned concern: render one graph-node column piece and its compact type tooltip. */
import { ArrowRight, Check } from 'lucide-react';
import {
  forwardRef,
  type ComponentPropsWithoutRef,
  type DragEventHandler,
  type ReactElement,
} from 'react';

import { canvasNodeEmbeddedControlProps } from '../../components/canvas/canvasNodeInteractionBoundary';
import { TooltipContent } from '../../components/ui/tooltip';
import type { GraphNodeColumn } from './graphNodeColumnContracts';
import type { GraphNodeColumnReorderIdentity } from './graphNodeColumnContracts';
import { resolveGraphNodeCardCopy } from './graphNodeCardCopyTokens';
import { graphNodeColumnClasses } from './graphVisualTokens';
import { GraphNodeColumnChildren } from './GraphNodeColumnChildren';
import { useGraphColumnOutputFocus } from './useGraphColumnOutputFocus';

export type GraphNodeColumnCopy = ReturnType<typeof resolveGraphNodeCardCopy>;

type GraphNodeColumnPieceProps = Readonly<
  Omit<ComponentPropsWithoutRef<'div'>, 'children' | 'onDragStart' | 'onDragEnd'> & {
    column: GraphNodeColumn;
    isOutput: boolean;
    canReorder: boolean;
    outputToggleDisabled: boolean;
    showSourceName?: boolean;
    copy: GraphNodeColumnCopy;
    onDragStart: DragEventHandler<HTMLDivElement>;
    onDragEnd: () => void;
    onOutputToggle: () => void;
    nodeId?: string;
    onNestedColumnReorder?: (identity: GraphNodeColumnReorderIdentity) => void;
  }
>;

export const GraphNodeColumnPiece = forwardRef<HTMLDivElement, GraphNodeColumnPieceProps>(
  function GraphNodeColumnPiece(props, ref): ReactElement {
    const {
      column,
      isOutput,
      copy,
      canReorder,
      outputToggleDisabled,
      showSourceName,
      onDragStart,
      onDragEnd,
      onOutputToggle,
      nodeId,
      onNestedColumnReorder,
      ...elementProps
    } = props;
    const displayedName =
      showSourceName === true && column.sourceNodeName != null
        ? `${column.sourceNodeName}.${column.name}`
        : column.name;
    const accessibleLabel = (
      isOutput ? copy.columnOutputAriaLabelTemplate : copy.columnAvailableInputAriaLabelTemplate
    ).replace('{column}', displayedName);
    const outputFocus = useGraphColumnOutputFocus();

    return (
      <div
        {...elementProps}
        data-canvas-context-menu-owner="column"
        ref={ref}
        data-slot="graph-node-column-piece"
        data-column-name={column.name}
        data-field-id={column.id}
        data-output={String(isOutput)}
        tabIndex={0}
        aria-label={accessibleLabel}
        draggable={canReorder}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        className={graphNodeColumnClasses.piece}
      >
        {column.sourceFieldName != null && column.sourceFieldName !== column.name ? (
          <span data-slot="graph-node-column-alias" className="flex min-w-0 items-center gap-1.5">
            <span className={graphNodeColumnClasses.sourceName}>
              {showSourceName === true && column.sourceNodeName != null
                ? `${column.sourceNodeName}.${column.sourceFieldName}`
                : column.sourceFieldName}
            </span>
            <ArrowRight
              aria-hidden="true"
              className={graphNodeColumnClasses.aliasArrow}
              size={12}
            />
            <span className={graphNodeColumnClasses.name}>{column.name}</span>
          </span>
        ) : (
          <span className={graphNodeColumnClasses.name}>{displayedName}</span>
        )}
        <span className={graphNodeColumnClasses.metadata}>
          <span className={graphNodeColumnClasses.type}>{column.type}</span>
          {column.primaryKey === true ? (
            <span className={graphNodeColumnClasses.constraint}>PK</span>
          ) : null}
          {column.nullable === false ? (
            <span className={graphNodeColumnClasses.constraint}>NN</span>
          ) : null}
          <button
            type="button"
            data-slot="graph-node-column-output-state"
            {...canvasNodeEmbeddedControlProps}
            aria-label={accessibleLabel}
            aria-pressed={isOutput}
            disabled={outputToggleDisabled}
            className={graphNodeColumnClasses.outputState}
            onPointerDown={(event) => {
              outputFocus.capturePointerFocus(event.currentTarget);
              event.stopPropagation();
            }}
            onClick={(event) => {
              event.stopPropagation();
              onOutputToggle();
              outputFocus.retainFocus(event.currentTarget);
            }}
          >
            {isOutput ? (
              <Check
                data-slot="graph-node-column-output-check"
                className={graphNodeColumnClasses.outputCheck}
              />
            ) : null}
          </button>
        </span>
        {column.children == null ? null : (
          <GraphNodeColumnChildren
            nodeId={nodeId}
            parentColumnId={column.id}
            children={column.children}
            onColumnReorder={onNestedColumnReorder}
          />
        )}
      </div>
    );
  }
);

export function GraphNodeColumnTooltip(props: { type: GraphNodeColumn['type'] }): ReactElement {
  return (
    <TooltipContent side="right" sideOffset={8} className={graphNodeColumnClasses.tooltip}>
      {props.type}
    </TooltipContent>
  );
}
