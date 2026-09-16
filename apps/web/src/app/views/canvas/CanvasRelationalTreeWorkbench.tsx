/** Owned concern: compose the three-region contextual Workbench for one Transform relational tree. */
import { useEffect, useMemo, useState, type ReactNode } from 'react';

import type { CanvasRelationalCompositionTruth } from '../../components/canvas/canvasNodePresentationTruth.contract';
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import { resolveCanvasDvtCompositionInputs } from './canvasDvtCompositionInputCatalog';
import { projectCanvasRelationalTree } from './canvasRelationalTreeProjection';
import {
  flattenCanvasRelationalTree,
  projectCanvasRelationalTreeCatalogue,
  projectPendingCanvasRelationalTreeCatalogue,
} from './canvasRelationalTreeWorkbenchModel';
import type { CanvasRelationalTreeWorkbenchCopy } from './canvasRelationalTreeWorkbench.types';
import { CanvasRelationalTreeNodeDetail } from './CanvasRelationalTreeNodeDetail';
import { CanvasRelationalTreeSourceCatalogue } from './CanvasRelationalTreeSourceCatalogue';
import { CanvasRelationalTreeView } from './CanvasRelationalTreeView';

export function CanvasRelationalTreeWorkbench({
  transformNode,
  nodes,
  edges,
  relationalComposition,
  pendingCompositionAuthoring,
  copy,
}: Readonly<{
  transformNode: CanonicalNode;
  nodes: readonly CanonicalNode[];
  edges: readonly CanonicalEdge[];
  relationalComposition?: CanvasRelationalCompositionTruth;
  pendingCompositionAuthoring: ReactNode;
  copy: CanvasRelationalTreeWorkbenchCopy;
}>): JSX.Element {
  const result = useMemo(
    () => projectCanvasRelationalTree({ node: transformNode, nodes, edges }),
    [edges, nodes, transformNode]
  );
  const projection = result.ok ? result.projection : null;
  const [selectedLocator, setSelectedLocator] = useState(projection?.root.locator ?? '');

  useEffect(() => {
    setSelectedLocator(projection?.root.locator ?? '');
  }, [projection?.root.locator]);

  const catalogue = useMemo(() => {
    if (projection != null) {
      return projectCanvasRelationalTreeCatalogue({
        inputs: projection.inputs,
        nodes,
        root: projection.root,
      });
    }
    if (relationalComposition?.state !== 'pending') return [];
    return projectPendingCanvasRelationalTreeCatalogue(
      resolveCanvasDvtCompositionInputs({ targetNodeId: transformNode.id, nodes, edges }),
      nodes
    );
  }, [edges, nodes, projection, relationalComposition?.state, transformNode.id]);
  const selectedNode =
    projection == null
      ? null
      : (flattenCanvasRelationalTree(projection.root).find(
          (node) => node.locator === selectedLocator
        ) ?? projection.root);
  const unavailableMessage = result.ok
    ? null
    : result.failure.code === 'invalid-semantic-authority'
      ? copy.relationalTreeInvalidMessage
      : result.failure.code === 'input-identity-unavailable'
        ? copy.relationalTreeInputIdentityUnavailableMessage
        : copy.relationalTreeUnavailableMessage;

  return (
    <div
      data-slot="canvas-relational-tree-workbench"
      className="grid min-h-0 grid-cols-1 overflow-auto rounded border border-(--border-subtle) bg-(--surface-panel) lg:h-full lg:grid-cols-[12rem_minmax(18rem,1fr)_minmax(15rem,20rem)] lg:overflow-hidden"
    >
      <CanvasRelationalTreeSourceCatalogue
        items={catalogue}
        copy={copy}
        onSelect={setSelectedLocator}
      />
      {projection == null ? (
        <section
          data-slot="canvas-relational-tree-unavailable"
          className="grid min-h-64 place-items-center p-6 text-center text-sm text-(--text-muted)"
        >
          {unavailableMessage}
        </section>
      ) : (
        <CanvasRelationalTreeView
          root={projection.root}
          selectedLocator={selectedLocator}
          copy={copy}
          onSelect={setSelectedLocator}
        />
      )}
      <CanvasRelationalTreeNodeDetail
        node={selectedNode}
        copy={copy}
        pendingAuthoring={
          relationalComposition?.state === 'pending' ? pendingCompositionAuthoring : null
        }
      />
    </div>
  );
}
