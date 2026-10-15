/**
 * Owned concern: compose Model editing and retain inspector visibility across accepted saves.
 * @baseline ADR-0064: the accepted relation keeps its authoring identity.
 * @decision Transfer staged inspector selection on Apply without prolonging the draft transaction.
 * @consequence Properties stay open; explicit Close, Cancel and rejected writes keep their intent.
 * @version 1.1.0
 */
import { forwardRef, useEffect, useState } from 'react';
import { RelationalLayoutSession } from './relational-layout/RelationalLayoutSession';
import { CanvasRelationAnalysisContext } from './CanvasRelationAnalysisContext';
import type { CanvasRelationalTreeWorkbenchProps } from './canvasRelationalTreeWorkbench.types';
import { CanvasRelationalTreeSessionActions } from './CanvasRelationalTreeSessionActions';
import { CanvasCardRemovalContext } from './CanvasCardRemovalContext';
import { CanvasRelationalTreeContent } from './CanvasRelationalTreeContent';
import { CanvasRelationalExplorer } from './explorer/CanvasRelationalExplorer';
import { useCanvasRelationEditNavigation } from './useCanvasRelationEditNavigation';
import { useCanvasRelationalTreeWorkbenchModel } from './useCanvasRelationalTreeWorkbenchModel';
import { useCanvasWorkbenchFocusRecovery } from './useCanvasWorkbenchFocus';
import { useCanvasRelationalTreeSessionActions } from './useCanvasRelationalTreeSessionActions';
import { CanvasOperationPreviewProvider } from './CanvasOperationDataPreview';
import { CanvasOperationInspectorTabs } from './CanvasRelationalTreeEditorFrame';
import styles from './CanvasRelationalTreeWorkbench.module.css';
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
  const [modelOutputOpen, setModelOutputOpen] = useState(false);
  useEffect(() => {
    if (model.session.active) setModelOutputOpen(false);
    else setPendingCondition(false);
  }, [model.session.active]);
  const sessionHandle = useCanvasRelationalTreeWorkbenchHandle(
    ref,
    model,
    pendingCondition,
    { pending: pendingCompositionOutput, discard: () => setModelOutputOpen(false) },
    (relationId) => {
      model.retainAppliedSelection(relationId);
      setExpanded(true);
    }
  );
  const navigation = useCanvasRelationEditNavigation({
    modelId: transformNode.id,
    editing: model.session.active,
    selectedRelationId: model.selectedRelationId,
    session: sessionHandle,
    onSelect: model.selectRelation,
  });
  const sessionActions = useCanvasRelationalTreeSessionActions({
    active: model.session.active,
    session: sessionHandle,
    navigation,
    copy,
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
          className={styles.workbench}
        >
          <CanvasRelationalTreeSessionActions {...sessionActions} host={actionsHost} />
          <CanvasRelationalExplorer
            model={model}
            copy={copy}
            pending={pendingCondition || pendingCompositionOutput}
          >
            <CanvasCardRemovalContext.Provider value={model.session.removal}>
              <CanvasRelationAnalysisContext.Provider value={model.session.analysis}>
                <CanvasOperationInspectorTabs>
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
                </CanvasOperationInspectorTabs>
              </CanvasRelationAnalysisContext.Provider>
            </CanvasCardRemovalContext.Provider>
          </CanvasRelationalExplorer>
        </div>
      </RelationalLayoutSession>
    </CanvasOperationPreviewProvider>
  );
});
