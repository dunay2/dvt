import { forwardRef, useEffect, useState } from 'react';
import { RelationalLayoutSession } from './relational-layout/RelationalLayoutSession';
import { CanvasRelationAnalysisContext } from './CanvasRelationAnalysisContext';
import type { CanvasRelationalTreeWorkbenchProps } from './canvasRelationalTreeWorkbench.types';
import { CanvasRelationalTreeSessionActions } from './CanvasRelationalTreeSessionActions';
import { CanvasRelationalRemovalConfirmation } from './CanvasRelationalRemovalConfirmation';
import { CanvasRelationalTreeContent } from './CanvasRelationalTreeContent';
import { CanvasRelationalTreeSourceCatalogue } from './CanvasRelationalTreeSourceCatalogue';
import { useCanvasRelationEditNavigation } from './useCanvasRelationEditNavigation';
import { useCanvasRelationalTreeWorkbenchModel } from './useCanvasRelationalTreeWorkbenchModel';
import { useCanvasWorkbenchFocusRecovery } from './useCanvasWorkbenchFocus';
import { CanvasOperationPreviewProvider } from './CanvasOperationDataPreview';
import {
  useCanvasRelationalTreeWorkbenchHandle,
  type CanvasRelationalTreeWorkbenchHandle,
} from './useCanvasRelationalTreeWorkbenchHandle';
export type { CanvasRelationalTreeWorkbenchHandle } from './useCanvasRelationalTreeWorkbenchHandle';
export const CanvasRelationalTreeWorkbench = forwardRef<
  CanvasRelationalTreeWorkbenchHandle,
  CanvasRelationalTreeWorkbenchProps
>(function CanvasRelationalTreeWorkbench(
  { transformNode, nodes, edges, copy, authoring, actionsHost, preview },
  ref
) {
  const focus = useCanvasWorkbenchFocusRecovery();
  const model = useCanvasRelationalTreeWorkbenchModel({
    transformNode,
    nodes,
    edges,
    copy,
    authoring,
  });
  const [pendingCondition, setPendingCondition] = useState(false);
  const [pendingCompositionOutput, setPendingCompositionOutput] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [sourcesCollapsed, setSourcesCollapsed] = useState(false);
  const [modelOutputOpen, setModelOutputOpen] = useState(false);
  useEffect(() => {
    if (model.session.active) setModelOutputOpen(false);
    else setPendingCondition(false);
  }, [model.session.active]);
  const sessionHandle = useCanvasRelationalTreeWorkbenchHandle(ref, model, pendingCondition, {
    pending: pendingCompositionOutput,
    discard: () => setModelOutputOpen(false),
  });
  const navigation = useCanvasRelationEditNavigation({
    editing: model.session.active,
    selectedRelationId: model.selectedRelationId,
    session: sessionHandle,
    onSelect: model.selectRelation,
  });
  return (
    <CanvasOperationPreviewProvider
      ports={preview}
      scope={{
        sourceOutputFieldsByRelationId: model.sourceOutputFieldsByRelationId,
        inputRevision: model.inputRevision,
        unavailableRelationIds: model.unavailableRelationIds,
      }}
      nodeId={transformNode.id}
      semanticDigest={model.projection?.semanticDigest ?? null}
      outputPlanRelationIds={model.outputPlanRelationIds}
      canEditModel={model.authoringAvailable}
      unapplied={sessionHandle.hasUnappliedChanges}
    >
      <RelationalLayoutSession
        initialPositions={model.session.positions}
        onPositionsChange={model.session.setPositions}
      >
        <div
          {...focus}
          tabIndex={-1}
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
            <CanvasRelationalTreeContent
              model={model}
              authoring={authoring}
              transformNode={transformNode}
              nodes={nodes}
              edges={edges}
              copy={copy}
              expanded={expanded}
              onExpandedChange={setExpanded}
              onPendingConditionChange={setPendingCondition}
              pendingCondition={pendingCondition || pendingCompositionOutput}
              onSelectRelation={navigation.select}
              modelOutput={{
                open: modelOutputOpen,
                setOpen: setModelOutputOpen,
                setPending: setPendingCompositionOutput,
              }}
            />
          </CanvasRelationAnalysisContext.Provider>
        </div>
      </RelationalLayoutSession>
    </CanvasOperationPreviewProvider>
  );
});
