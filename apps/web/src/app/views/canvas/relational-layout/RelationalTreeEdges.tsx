/** Owned concern: render connections and operand roles from projected geometry. */
import type { CanvasRelationalTreeChildRole } from '../canvasRelationalTreeProjection';
import type {
  CanvasRelationalTreeLayout,
  CanvasRelationalTreePlacedEdge,
} from '../canvasRelationalTreeGeometry';

function childRoleBadge(role: CanvasRelationalTreeChildRole, ordinal: number): string | null {
  if (role === 'left') return 'L';
  if (role === 'right') return 'R';
  if (role === 'primary') return '1';
  if (role === 'secondary') return String(ordinal + 1);
  return null;
}

function edgePath(edge: CanvasRelationalTreePlacedEdge): string {
  const offset = Math.max(32, (edge.toX - edge.fromX) * 0.45);
  return `M ${edge.fromX} ${edge.fromY} C ${edge.fromX + offset} ${edge.fromY}, ${edge.toX - offset} ${edge.toY}, ${edge.toX} ${edge.toY}`;
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

export function RelationalTreeEdges({ layout }: Readonly<{ layout: CanvasRelationalTreeLayout }>) {
  const root = layout.nodes[0]!;
  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-visible"
      width={layout.width}
      height={layout.height}
    >
      <path
        d={`M ${root.x + root.width} ${layout.output.y + layout.output.height / 2} H ${layout.output.x}`}
        fill="none"
        stroke="var(--status-info)"
        strokeWidth="1.5"
      />
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
                    d={edgePath(edge)}
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
