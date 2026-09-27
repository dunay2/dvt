/** Owned concern: render connections and operand roles from projected geometry. */
import type { CanvasRelationalTreeChildRole } from '../canvasRelationalTreeProjection';
import type {
  CanvasRelationalTreeLayout,
  CanvasRelationalTreePlacedEdge,
} from '../canvasRelationalTreeGeometry';
import type { CanvasStagedOperation } from '../canvasStagedOperation';
import {
  indexPlacedRelations,
  projectStagedRelationEdges,
  relationalEdgePath,
} from './relationalTreeEdgeProjection';
import { RelationalEdgeAction } from './RelationalEdgeAction';

function childRoleBadge(role: CanvasRelationalTreeChildRole, ordinal: number): string | null {
  if (role === 'left') return 'L';
  if (role === 'right') return 'R';
  if (role === 'primary') return '1';
  if (role === 'secondary') return String(ordinal + 1);
  return null;
}

function EdgeRoleBadge({ edge }: Readonly<{ edge: CanvasRelationalTreePlacedEdge }>) {
  const badge = childRoleBadge(edge.role, edge.ordinal);
  return badge == null ? null : (
    <g
      data-slot="canvas-relational-tree-input-label"
      data-role={edge.role}
      transform={`translate(${edge.toX - 24} ${edge.toY - 10})`}
    >
      <rect width="20" height="20" rx="4" fill="var(--surface-panel)" stroke="var(--status-info)" />
      <text
        x="10"
        y="14"
        fill="var(--text-strong)"
        fontSize="12"
        fontWeight="500"
        textAnchor="middle"
      >
        {badge}
      </text>
    </g>
  );
}

export function RelationalTreeEdges({
  layout,
  stagedOperations = [],
  disconnectLabel,
  onDisconnectStagedOperation,
  outputRelationId,
  onDisconnectOutput,
}: Readonly<{
  layout: CanvasRelationalTreeLayout;
  stagedOperations?: readonly CanvasStagedOperation[];
  disconnectLabel: string;
  onDisconnectStagedOperation?: (id: string, port: number) => void;
  outputRelationId: string | null;
  onDisconnectOutput?: () => void;
}>) {
  const placedByRelationId = indexPlacedRelations(layout);
  const outputProducer =
    outputRelationId == null ? undefined : placedByRelationId.get(outputRelationId);
  const stagedEdges = projectStagedRelationEdges(placedByRelationId, stagedOperations);
  return (
    <svg
      className="pointer-events-none absolute inset-0 overflow-visible"
      width={layout.width}
      height={layout.height}
    >
      {layout.output == null || outputProducer == null ? null : (
        <g>
          <path
            data-slot="canvas-relational-output-edge"
            d={`M ${outputProducer.x + outputProducer.width} ${outputProducer.y + outputProducer.height / 2} H ${layout.output.x}`}
            fill="none"
            stroke="var(--status-info)"
            strokeWidth="1.5"
          />
          {onDisconnectOutput == null ? null : (
            <RelationalEdgeAction
              slot="canvas-relational-output-edge-action"
              path={`M ${outputProducer.x + outputProducer.width} ${outputProducer.y + outputProducer.height / 2} H ${layout.output.x}`}
              label={disconnectLabel}
              onDisconnect={onDisconnectOutput}
            />
          )}
        </g>
      )}
      {stagedEdges.map((edge) => (
        <g key={edge.key}>
          <path
            data-slot="canvas-relational-pending-edge"
            data-port={edge.ordinal}
            d={relationalEdgePath(edge)}
            fill="none"
            stroke="var(--status-info)"
            strokeDasharray="4 4"
            strokeWidth="1.5"
          />
          {onDisconnectStagedOperation == null ? null : (
            <RelationalEdgeAction
              slot="canvas-relational-pending-edge-action"
              port={edge.ordinal}
              path={relationalEdgePath(edge)}
              label={disconnectLabel}
              onDisconnect={() => onDisconnectStagedOperation(edge.parentLocator, edge.ordinal)}
            />
          )}
        </g>
      ))}
      {layout.nodes
        .filter((parent) => parent.node.children.length > 0)
        .map((parent) => (
          <g
            key={parent.node.locator}
            data-slot="canvas-relational-tree-children"
            data-parent-locator={parent.node.locator}
            data-child-count={parent.node.children.length}
          >
            {layout.edges
              .filter((edge) => edge.parentLocator === parent.node.locator)
              .map((edge) => (
                <g key={edge.key}>
                  <path
                    d={relationalEdgePath(edge)}
                    fill="none"
                    stroke="var(--status-info)"
                    strokeOpacity="0.8"
                    strokeWidth="1.5"
                  />
                  <EdgeRoleBadge edge={edge} />
                </g>
              ))}
          </g>
        ))}
    </svg>
  );
}
