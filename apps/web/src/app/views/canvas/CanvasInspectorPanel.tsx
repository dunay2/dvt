/** Owned concern: compose the passive Inspector view with the route-owned Inspector authoring surface. */
import InspectorPanel from '../../components/InspectorPanel';
import type { CanonicalNode } from '../../types/canonical';
import { CanvasInspectorAuthoringSection } from './CanvasInspectorAuthoringSection';
import type { CanvasInspectorAuthoringContract } from './canvasInspectorAuthoring.types';

type CanvasInspectorPanelProps = Readonly<{
  node: CanonicalNode | null;
  activeRunId: string | null;
  registeredPlugins?: ReadonlySet<string>;
  onHide: () => void;
  authoring: CanvasInspectorAuthoringContract;
}>;

export function CanvasInspectorPanel({
  node,
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
        node ? <CanvasInspectorAuthoringSection node={node} authoring={authoring} /> : null
      }
    />
  );
}
