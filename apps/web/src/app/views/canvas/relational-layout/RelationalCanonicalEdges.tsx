/** Render grouped canonical Input edges with the shared disconnect gesture. */
import type { CanvasRelationalTreeChildRole } from '../canvasRelationalTreeProjection';
import type {
  CanvasRelationalTreeLayout,
  CanvasRelationalTreePlacedEdge,
} from '../canvasRelationalTreeGeometry';
import { relationalEdgePath } from './relationalTreeEdgeProjection';
import { RelationalEdgeAction } from './RelationalEdgeAction';

function childRoleBadge(role: CanvasRelationalTreeChildRole, ordinal: number): string | null {
  if (role === 'left') return 'L';
  if (role === 'right') return 'R';
  if (role === 'primary') return '1';
  if (role === 'secondary') return String(ordinal + 1);
  return null;
}

function EdgeRoleBadge({
  edge,
}: Readonly<{ edge: CanvasRelationalTreePlacedEdge }>): JSX.Element | null {
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

export function RelationalCanonicalEdges({
  layout,
  removeLabel,
  onDisconnect,
}: Readonly<{
  layout: CanvasRelationalTreeLayout;
  removeLabel: string;
  onDisconnect?: (id: string, port: number) => void;
}>): JSX.Element {
  return (
    <>
      {layout.nodes
        .filter((parent) => parent.node.children.length > 0)
        .map(({ node: parent }) => (
          <g
            key={parent.locator}
            data-slot="canvas-relational-tree-children"
            data-parent-locator={parent.locator}
            data-child-count={parent.children.length}
          >
            {layout.edges
              .filter((edge) => edge.parentLocator === parent.locator)
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
                  {onDisconnect == null || parent.relationId == null ? null : (
                    <RelationalEdgeAction
                      slot="canvas-relational-edge-action"
                      port={edge.ordinal}
                      path={relationalEdgePath(edge)}
                      removeLabel={removeLabel}
                      onDisconnect={() => onDisconnect(parent.relationId!, edge.ordinal)}
                    />
                  )}
                </g>
              ))}
          </g>
        ))}
    </>
  );
}
