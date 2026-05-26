/** Owned concern: compose the passive Inspector view with the route-owned Inspector authoring surface. */
import InspectorPanel from '../../components/InspectorPanel';
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import { CanvasInspectorAuthoringSection } from './CanvasInspectorAuthoringSection';
import type { CanvasInspectorAuthoringContract } from './canvasInspectorAuthoring.types';

type CanvasInspectorPanelProps = Readonly<{
  node: CanonicalNode | null;
  nodes: readonly CanonicalNode[];
  edges: readonly CanonicalEdge[];
  activeRunId: string | null;
  registeredPlugins?: ReadonlySet<string>;
  onHide: () => void;
  authoring: CanvasInspectorAuthoringContract;
}>;

export function CanvasInspectorPanel({
  node,
  nodes,
  edges,
  activeRunId,
  registeredPlugins,
  onHide,
  authoring,
}: CanvasInspectorPanelProps) {
  return (
    <InspectorPanel
      node={node}
      activeRunId={activeRunId}
      registeredPlugins={registeredPlugins}
      onHide={onHide}
      beforePanels={
        node ? (
          <CanvasInspectorAuthoringSection
            node={node}
            nodes={nodes}
            edges={edges}
            authoring={authoring}
          />
        ) : null
      }
    />
  );
}
