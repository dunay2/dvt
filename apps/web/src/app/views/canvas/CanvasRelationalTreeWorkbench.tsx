/** Owned concern: compose the source catalogue and central block Workbench for one Transform. */
import { forwardRef, useEffect, useState } from 'react';
import { RelationalLayoutSession } from './relational-layout/RelationalLayoutSession';
import { CanvasRelationAnalysisContext } from './CanvasRelationAnalysisContext';
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import type {
  CanvasRelationalTreeAuthoringContract,
  CanvasRelationalTreeWorkbenchCopy,
} from './canvasRelationalTreeWorkbench.types';
import { CanvasRelationalTreeSessionActions } from './CanvasRelationalTreeSessionActions';
import { CanvasRelationalRemovalConfirmation } from './CanvasRelationalRemovalConfirmation';
import { CanvasRelationalTreeContent } from './CanvasRelationalTreeContent';
import { CanvasRelationalTreeSourceCatalogue } from './CanvasRelationalTreeSourceCatalogue';
import { useCanvasRelationEditNavigation } from './useCanvasRelationEditNavigation';
import { useCanvasRelationalTreeWorkbenchModel } from './useCanvasRelationalTreeWorkbenchModel';
import { CanvasModelCompositionPanel } from './CanvasModelCompositionPanel';
import {
  CanvasOperationPreviewProvider,
  type CanvasOperationPreviewPorts,
} from './CanvasOperationDataPreview';
import {
  useCanvasRelationalTreeWorkbenchHandle,
  type CanvasRelationalTreeWorkbenchHandle,
} from './useCanvasRelationalTreeWorkbenchHandle';
export type { CanvasRelationalTreeWorkbenchHandle } from './useCanvasRelationalTreeWorkbenchHandle';

export { canOpenCanvasRelationalTreeWorkbench } from './useCanvasRelationalTreeWorkbenchModel';

export const CanvasRelationalTreeWorkbench = forwardRef<
  CanvasRelationalTreeWorkbenchHandle,
  Readonly<{
    transformNode: CanonicalNode;
    nodes: readonly CanonicalNode[];
    edges: readonly CanonicalEdge[];
    copy: CanvasRelationalTreeWorkbenchCopy;
    authoring?: CanvasRelationalTreeAuthoringContract;
    actionsHost?: HTMLElement | null;
    preview?: CanvasOperationPreviewPorts;
  }>
>(function CanvasRelationalTreeWorkbench(
  { transformNode, nodes, edges, copy, authoring, actionsHost, preview },
  ref
): JSX.Element {
  const model = useCanvasRelationalTreeWorkbenchModel({
    transformNode,
    nodes,
    edges,
    copy,
    authoring,
  });
  const [pendingCondition, setPendingCondition] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [sourcesCollapsed, setSourcesCollapsed] = useState(false);
  const [compositionOpen, setCompositionOpen] = useState(false);
  useEffect(() => {
    if (!model.session.active) setPendingCondition(false);
  }, [model.session.active]);
  const sessionHandle = useCanvasRelationalTreeWorkbenchHandle(ref, model, pendingCondition);
  const navigation = useCanvasRelationEditNavigation({
    editing: model.session.active,
    selectedRelationId: model.selectedRelationId,
    session: sessionHandle,
    onSelect: model.selectRelation,
  });

  return (
    <CanvasOperationPreviewProvider
      ports={preview}
      nodeId={transformNode.id}
      semanticDigest={model.projection?.semanticDigest ?? null}
      canEditModel={model.authoringAvailable}
      unapplied={sessionHandle.hasUnappliedChanges}
    >
      <RelationalLayoutSession key={transformNode.id}>
        <div
          data-slot="canvas-relational-tree-workbench"
          onContextMenu={(event) => {
            event.preventDefault();
            event.stopPropagation();
          }}
          className={`relative grid h-full min-h-0 min-w-0 w-full grid-cols-1 grid-rows-[auto_minmax(0,1fr)] overflow-hidden bg-(--surface-panel) md:grid-rows-1 ${sourcesCollapsed ? 'md:grid-cols-[3rem_minmax(0,1fr)]' : 'md:grid-cols-[12rem_minmax(0,1fr)]'}`}
        >
          <CanvasRelationalTreeSessionActions
            active={model.session.active}
            session={sessionHandle}
            copy={copy}
            host={actionsHost}
            navigation={navigation}
          />
          <CanvasRelationalRemovalConfirmation
            operations={model.session.removal.pending?.result.operations ?? null}
            onConfirm={model.session.removal.confirm}
            onCancel={model.session.removal.cancel}
            error={model.session.removal.error}
            clearError={model.session.removal.clearError}
          />
          <CanvasRelationalTreeSourceCatalogue
            items={model.catalogue}
            collapsed={sourcesCollapsed}
            onToggle={() => setSourcesCollapsed((current) => !current)}
            copy={copy}
            draggable={model.authoringAvailable}
            onSelect={model.selectCatalogueItem}
            occurrences={model.authoringAvailable ? model.session.occurrences : undefined}
          />
          <CanvasRelationAnalysisContext.Provider value={model.session.analysis}>
            <div
              data-slot="canvas-relational-tree-surface"
              className="relative h-full min-h-0 w-full min-w-0 overflow-hidden"
            >
              <CanvasRelationalTreeContent
                model={model}
                transformNode={transformNode}
                nodes={nodes}
                edges={edges}
                copy={copy}
                expanded={expanded}
                onExpandedChange={setExpanded}
                onPendingConditionChange={setPendingCondition}
                onSelectRelation={navigation.select}
                onOpenModelComposition={() => setCompositionOpen(true)}
              />
              {compositionOpen && model.projection != null ? (
                <CanvasModelCompositionPanel
                  modelName={transformNode.name}
                  root={model.projection.root}
                  copy={copy}
                  editable={model.authoringAvailable && !model.session.active}
                  onOutputChange={model.session.applyOutputOrder}
                  onClose={() => setCompositionOpen(false)}
                />
              ) : null}
            </div>
          </CanvasRelationAnalysisContext.Provider>
        </div>
      </RelationalLayoutSession>
    </CanvasOperationPreviewProvider>
  );
});
