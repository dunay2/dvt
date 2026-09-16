/** Owned concern: render one directed Canvas dependency without owning graph semantics. */
import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  Position,
  type Edge,
  type EdgeProps,
} from '@xyflow/react';
import { type ReactElement } from 'react';

import { canvasNodeEmbeddedControlProps } from '../../components/canvas/canvasNodeInteractionBoundary';
import { createGraphFlowEdgeStyle, graphFlowPalette } from '../../plugins/graph/graphVisualTokens';
import {
  readCanvasDependencyEdgeData,
  type CanvasDependencyEdgeData,
} from './canvasDependencyEdgeModel';

function resolveIncomingDirection(targetPosition: Position): Readonly<{ x: number; y: number }> {
  switch (targetPosition) {
    case Position.Right:
      return { x: -1, y: 0 };
    case Position.Top:
      return { x: 0, y: 1 };
    case Position.Bottom:
      return { x: 0, y: -1 };
    case Position.Left:
    default:
      return { x: 1, y: 0 };
  }
}

export function resolveCanvasRelationalJunction(
  targetX: number,
  targetY: number,
  targetPosition: Position,
  badgeWidth = 0
): Readonly<{ x: number; y: number; trunkSourcePosition: Position }> {
  const direction = resolveIncomingDirection(targetPosition);
  const badgeAxisRadius =
    targetPosition === Position.Left || targetPosition === Position.Right ? badgeWidth / 2 : 0;
  const offset = Math.max(
    graphFlowPalette.relationalJunctionOffset,
    badgeAxisRadius + graphFlowPalette.relationalBadgeNodeClearance
  );
  return {
    x: targetX - direction.x * offset,
    y: targetY - direction.y * offset,
    trunkSourcePosition:
      targetPosition === Position.Left
        ? Position.Right
        : targetPosition === Position.Right
          ? Position.Left
          : targetPosition === Position.Top
            ? Position.Bottom
            : Position.Top,
  };
}

export function resolveCanvasDependencyArrowPoints(
  targetX: number,
  targetY: number,
  targetPosition: Position
): string {
  const direction = resolveIncomingDirection(targetPosition);
  const tipX = targetX - direction.x * graphFlowPalette.directionCueTargetClearance;
  const tipY = targetY - direction.y * graphFlowPalette.directionCueTargetClearance;
  const baseX = tipX - direction.x * graphFlowPalette.directionCueLength;
  const baseY = tipY - direction.y * graphFlowPalette.directionCueLength;
  const perpendicularX = direction.y;
  const perpendicularY = -direction.x;
  const halfWidth = graphFlowPalette.directionCueHalfWidth;

  return [
    `${tipX},${tipY}`,
    `${baseX + perpendicularX * halfWidth},${baseY + perpendicularY * halfWidth}`,
    `${baseX - perpendicularX * halfWidth},${baseY - perpendicularY * halfWidth}`,
  ].join(' ');
}

export function CanvasDependencyEdge({
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style,
  interactionWidth,
  selected,
  data,
}: EdgeProps<Edge<CanvasDependencyEdgeData>>): ReactElement {
  const dependency = readCanvasDependencyEdgeData(data);
  const composition = dependency?.composition;
  const badgeWidth =
    composition == null
      ? 0
      : Math.max(
          72,
          composition.label.length * graphFlowPalette.relationalBadgeCharacterWidth +
            graphFlowPalette.relationalBadgeHorizontalPadding
        );
  const junction =
    composition == null
      ? null
      : resolveCanvasRelationalJunction(targetX, targetY, targetPosition, badgeWidth);
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX: junction?.x ?? targetX,
    targetY: junction?.y ?? targetY,
    targetPosition,
  });
  const trunkPath =
    junction == null || composition?.role !== 'trunk-owner'
      ? null
      : getSmoothStepPath({
          sourceX: junction.x,
          sourceY: junction.y,
          sourcePosition: junction.trunkSourcePosition,
          targetX,
          targetY,
          targetPosition,
        })[0];
  const execution = dependency?.execution;
  const closed = execution?.gateState === 'closed';
  const resolvedStyle = {
    ...(style ?? createGraphFlowEdgeStyle()),
    ...(closed
      ? {
          strokeDasharray: graphFlowPalette.closedEdgeDashArray,
          opacity: graphFlowPalette.closedEdgeOpacity,
        }
      : {}),
    ...(selected
      ? {
          stroke: 'var(--status-info)',
        }
      : {}),
  };
  const trunkStyle = {
    ...(style ?? createGraphFlowEdgeStyle()),
    ...(selected ? { stroke: 'var(--status-info)' } : {}),
  };
  return (
    <>
      <BaseEdge
        path={edgePath}
        style={resolvedStyle}
        interactionWidth={interactionWidth ?? graphFlowPalette.edgeInteractionWidth}
      />
      {trunkPath == null || junction == null || composition == null ? null : (
        <g data-slot="canvas-relational-composition" data-state={composition.state}>
          <path
            data-slot="canvas-relational-composition-trunk"
            d={trunkPath}
            fill="none"
            pointerEvents="none"
            style={trunkStyle}
          />
          <circle
            data-slot="canvas-relational-composition-junction"
            cx={junction.x}
            cy={junction.y}
            r={graphFlowPalette.relationalJunctionRadius}
            fill="var(--canvas-surface)"
            stroke={
              typeof trunkStyle.stroke === 'string'
                ? trunkStyle.stroke
                : graphFlowPalette.edgeStroke
            }
            strokeWidth={graphFlowPalette.edgeStrokeWidth}
          />
        </g>
      )}
      {trunkPath == null || junction == null || composition == null ? null : (
        <EdgeLabelRenderer>
          <div
            data-slot="canvas-relational-composition-badge"
            data-state={composition.state}
            {...canvasNodeEmbeddedControlProps}
            aria-hidden={composition.onActivate == null ? 'true' : undefined}
            aria-label={
              composition.onActivate == null
                ? undefined
                : (composition.accessibleLabel ?? composition.label)
            }
            role={composition.onActivate == null ? undefined : 'button'}
            tabIndex={composition.onActivate == null ? undefined : 0}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              if (composition.onActivate == null) return;
              event.stopPropagation();
              composition.onActivate();
            }}
            onKeyDown={(event) => {
              if (composition.onActivate == null || (event.key !== 'Enter' && event.key !== ' ')) {
                return;
              }
              event.preventDefault();
              event.stopPropagation();
              composition.onActivate();
            }}
            className={`nodrag nopan absolute z-50 flex items-center justify-center rounded border bg-(--canvas-surface) text-[10px] font-semibold ${composition.onActivate == null ? 'pointer-events-none' : 'pointer-events-auto'}`}
            style={{
              width: badgeWidth,
              height: graphFlowPalette.relationalBadgeHeight,
              borderColor: graphFlowPalette.edgeStroke,
              borderStyle: composition.state === 'canonical' ? 'solid' : 'dashed',
              transform: `translate(-50%, -50%) translate(${junction.x}px, ${junction.y - 32}px)`,
            }}
          >
            {composition.label}
          </div>
        </EdgeLabelRenderer>
      )}
      {closed ? (
        <g
          data-slot="canvas-dependency-closed-gate"
          data-state="closed"
          aria-hidden="true"
          pointerEvents="none"
          transform={`translate(${labelX} ${labelY})`}
          stroke={
            typeof resolvedStyle.stroke === 'string'
              ? resolvedStyle.stroke
              : graphFlowPalette.edgeStroke
          }
          strokeWidth={graphFlowPalette.gateGlyphStrokeWidth}
        >
          <circle r={graphFlowPalette.gateGlyphRadius} fill="var(--canvas-surface)" />
          <line x1="-4" y1="-4" x2="4" y2="4" />
          <line x1="4" y1="-4" x2="-4" y2="4" />
        </g>
      ) : null}
      {composition == null || composition.role === 'trunk-owner' ? (
        <polygon
          data-slot="canvas-dependency-direction-cue"
          aria-hidden="true"
          pointerEvents="none"
          points={resolveCanvasDependencyArrowPoints(targetX, targetY, targetPosition)}
          style={{
            fill:
              typeof trunkStyle.stroke === 'string'
                ? trunkStyle.stroke
                : graphFlowPalette.edgeStroke,
          }}
        />
      ) : null}
    </>
  );
}
