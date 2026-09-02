/** Owned concern: render one graph-node column piece and its factual metadata tooltip. */
import { Check } from 'lucide-react';
import {
  forwardRef,
  type ComponentPropsWithoutRef,
  type DragEventHandler,
  type ReactElement,
} from 'react';

import { canvasNodeEmbeddedControlProps } from '../../components/canvas/canvasNodeInteractionBoundary';
import { TooltipContent } from '../../components/ui/tooltip';
import type { GraphNodeColumn } from './graphNodeColumnContracts';
import { resolveGraphNodeCardCopy } from './graphNodeCardCopyTokens';
import { graphNodeColumnClasses } from './graphVisualTokens';

export type GraphNodeColumnCopy = ReturnType<typeof resolveGraphNodeCardCopy>;

type GraphNodeColumnPieceProps = Readonly<
  Omit<ComponentPropsWithoutRef<'div'>, 'children' | 'onDragStart' | 'onDragEnd'> & {
    column: GraphNodeColumn;
    isOutput: boolean;
    canReorder: boolean;
    outputToggleDisabled: boolean;
    copy: GraphNodeColumnCopy;
    onDragStart: DragEventHandler<HTMLDivElement>;
    onDragEnd: () => void;
    onOutputToggle: () => void;
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
      onDragStart,
      onDragEnd,
      onOutputToggle,
      ...elementProps
    } = props;
    const accessibleLabel = (
      isOutput ? copy.columnOutputAriaLabelTemplate : copy.columnAvailableInputAriaLabelTemplate
    ).replace('{column}', column.name);

    return (
      <div
        {...elementProps}
        ref={ref}
        data-slot="graph-node-column-piece"
        data-output={String(isOutput)}
        tabIndex={0}
        aria-label={accessibleLabel}
        draggable={canReorder}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        className={graphNodeColumnClasses.piece}
      >
        <span className={graphNodeColumnClasses.name}>{column.name}</span>
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
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              onOutputToggle();
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
      </div>
    );
  }
);

export function GraphNodeColumnTooltip(props: {
  column: GraphNodeColumn;
  isOutput: boolean;
  copy: GraphNodeColumnCopy;
}): ReactElement {
  const { column, copy } = props;
  const rows = [
    { label: copy.columnTypeLabel, value: column.type },
    ...(column.nullable == null
      ? []
      : [
          {
            label: copy.columnNullabilityLabel,
            value: column.nullable ? copy.columnNullableValue : copy.columnNotNullValue,
          },
        ]),
    ...(column.sourceNodeName == null
      ? []
      : [{ label: copy.columnOriginLabel, value: column.sourceNodeName }]),
    ...(column.reference == null
      ? []
      : [{ label: copy.columnReferenceLabel, value: column.reference }]),
    {
      label: copy.columnsLabel,
      value: props.isOutput ? copy.columnOutputValue : copy.columnAvailableInputValue,
    },
  ];

  return (
    <TooltipContent side="right" sideOffset={8} className={graphNodeColumnClasses.tooltip}>
      <dl className={graphNodeColumnClasses.tooltipRows}>
        {rows.map((row) => (
          <div key={row.label} className={graphNodeColumnClasses.tooltipRow}>
            <dt className={graphNodeColumnClasses.tooltipLabel}>{row.label}</dt>
            <dd className={graphNodeColumnClasses.tooltipValue}>{row.value}</dd>
          </div>
        ))}
      </dl>
    </TooltipContent>
  );
}
