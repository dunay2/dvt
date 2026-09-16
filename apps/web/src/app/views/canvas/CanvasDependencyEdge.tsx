/** Owned concern: render one directed Canvas dependency without owning graph semantics. */
import { BaseEdge, getSmoothStepPath, Position, type Edge, type EdgeProps } from '@xyflow/react';
import { type ReactElement } from 'react';

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
  targetPosition: Position
): Readonly<{ x: number; y: number; trunkSourcePosition: Position }> {
  const direction = resolveIncomingDirection(targetPosition);
  return {
    x: targetX - direction.x * graphFlowPalette.relationalJunctionOffset,
    y: targetY - direction.y * graphFlowPalette.relationalJunctionOffset,
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
  const junction =
    composition == null ? null : resolveCanvasRelationalJunction(targetX, targetY, targetPosition);
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
  const badgeWidth =
    composition == null
      ? 0
      : Math.max(
          72,
          composition.label.length * graphFlowPalette.relationalBadgeCharacterWidth +
            graphFlowPalette.relationalBadgeHorizontalPadding
        );

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
          <g
            data-slot="canvas-relational-composition-badge"
            aria-hidden="true"
            pointerEvents="none"
            transform={`translate(${junction.x} ${junction.y - 18})`}
          >
            <rect
              x={-badgeWidth / 2}
              y={-graphFlowPalette.relationalBadgeHeight}
              width={badgeWidth}
              height={graphFlowPalette.relationalBadgeHeight}
              rx="4"
              fill="var(--canvas-surface)"
              stroke={graphFlowPalette.edgeStroke}
              strokeDasharray={composition.state === 'canonical' ? undefined : '4 3'}
            />
            <text
              x="0"
              y={-6}
              textAnchor="middle"
              fill="currentColor"
              fontSize="10"
              fontWeight="600"
            >
              {composition.label}
            </text>
          </g>
        </g>
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
