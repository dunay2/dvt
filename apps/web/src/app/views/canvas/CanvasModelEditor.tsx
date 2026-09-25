/** Owned concern: compose the full-width Model workspace from existing semantic, SQL and data owners. */
import './canvasSemanticEditor.css';
import { useMemo, useRef, useState } from 'react';
import { CanvasModelToolbar } from './CanvasModelToolbar';
import { useCanvasModelNavigation, type CanvasModelView } from './useCanvasModelNavigation';
import { useCanvasModelWorkspaceTab } from './useCanvasModelWorkspaceTab';
import { CanvasDraftDecisionDialog } from './CanvasDraftDecisionDialog';
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import type { ICanvasTransformDataSampleQueryPort } from '../../ports/canvasDataSample';
import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';
import { resolveCanvasViewCopy } from './canvasCopyCatalog';
import { resolveCanvasSemanticEditorCopy } from './canvasSemanticEditorCopy';
import {
  CanvasRelationalTreeWorkbench,
  type CanvasRelationalTreeWorkbenchHandle,
} from './CanvasRelationalTreeWorkbench';
import type { CanvasRelationalTreeAuthoringContract } from './canvasRelationalTreeWorkbench.types';
import type { CanvasDraftStatusState } from './canvasDraftStatusState';
import type { CanvasOperationPreviewPorts } from './CanvasOperationDataPreview';
import { projectCanvasRelationalTree } from './canvasRelationalTreeProjection';
import { projectCanvasRelationalTreeCatalogue } from './canvasRelationalTreeWorkbenchModel';
import { CanvasModelSqlView } from './CanvasModelSqlView';
import { CanvasModelDataView, type CanvasModelPreviewPreparation } from './CanvasModelDataView';
import { CanvasModelNavigationGuard } from './CanvasModelNavigationGuard';

export type { CanvasModelView } from './useCanvasModelNavigation';

export function CanvasModelEditor({
  canvasId,
  canvasName,
  transformNode,
  nodes,
  edges,
  authoring,
  initialView,
  viewRequestId,
  draftStatus,
  query,
  preparePreview,
  operationDataHost,
  onOpenOperationData,
  onExecuteSource,
  onClose,
  active = true,
  onSelect,
  onShowCanvas,
}: Readonly<{
  canvasId: string;
  canvasName: string;
  transformNode: CanonicalNode;
  nodes: readonly CanonicalNode[];
  edges: readonly CanonicalEdge[];
  authoring?: CanvasRelationalTreeAuthoringContract;
  initialView: CanvasModelView;
  viewRequestId: number;
  draftStatus: CanvasDraftStatusState;
  query?: ICanvasTransformDataSampleQueryPort;
  preparePreview?: CanvasModelPreviewPreparation;
  operationDataHost?: HTMLDivElement | null;
  onOpenOperationData?: () => void;
  onExecuteSource?: CanvasOperationPreviewPorts['onExecuteSource'];
  onClose: () => void;
  active?: boolean;
  onSelect: () => void;
  onShowCanvas: () => void;
}>): JSX.Element {
  const language = useApplicationLanguageStore((state) => state.language);
  const copy = resolveCanvasSemanticEditorCopy(language);
  const treeCopy = resolveCanvasViewCopy(language);
  const workbench = useRef<CanvasRelationalTreeWorkbenchHandle>(null);
  const [actionsHost, setActionsHost] = useState<HTMLDivElement | null>(null);
  const navigation = useCanvasModelNavigation({
    initialView,
    viewRequestId,
    workbench,
    onClose,
    preparePreview,
    draftStatus,
    copy,
  });
  const { view, requestNavigation, onRouteBlocked } = navigation;
  const projection = useMemo(
    () => projectCanvasRelationalTree({ node: transformNode, nodes, edges }),
    [transformNode, nodes, edges]
  );
  const digest = projection.ok ? projection.projection.semanticDigest : null;
  const unresolvedInputs = projection.ok
    ? projectCanvasRelationalTreeCatalogue({ ...projection.projection, nodes }).flatMap((input) =>
        input.state === 'participating' ? [] : [{ label: input.label, state: input.state }]
      )
    : [];
  useCanvasModelWorkspaceTab({
    canvasId,
    nodeId: transformNode.id,
    label: transformNode.name,
    active,
    onSelect,
    onCanvas: onShowCanvas,
    onClose: (continuation) => {
      onSelect();
      navigation.requestClose(continuation);
    },
  });
  return (
    <section
      data-slot="canvas-model-editor"
      aria-label={`${transformNode.name} · ${copy.editor}`}
      className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-(--surface-app) text-(--text-default)"
    >
      <CanvasModelNavigationGuard
        workbench={workbench}
        hasUnpersistedChanges={draftStatus.persistence !== 'durable'}
        onBlocked={onRouteBlocked}
      />
      <CanvasModelToolbar
        canvasName={canvasName}
        modelName={transformNode.name}
        view={view}
        draftStatus={draftStatus}
        onViewChange={requestNavigation}
        onActionsHost={setActionsHost}
      />
      <div
        id="model-panel-editor"
        role="tabpanel"
        aria-labelledby="model-tab-editor"
        className={view === 'editor' ? 'flex min-h-0 min-w-0 flex-1 overflow-hidden' : 'hidden'}
      >
        <CanvasRelationalTreeWorkbench
          ref={workbench}
          transformNode={transformNode}
          nodes={nodes}
          edges={edges}
          copy={treeCopy}
          authoring={authoring}
          actionsHost={actionsHost}
          preview={{
            canvasId,
            query,
            onExecuteSource,
            preparePreview,
            dataHost: active && view === 'editor' ? operationDataHost : null,
            onOpenData: active && view === 'editor' ? onOpenOperationData : undefined,
          }}
        />
      </div>
      {view === 'sql' ? (
        <div
          id="model-panel-sql"
          role="tabpanel"
          aria-labelledby="model-tab-sql"
          className="min-h-0 flex-1"
        >
          <CanvasModelSqlView
            transformNode={transformNode}
            nodes={nodes}
            edges={edges}
            copy={copy}
          />
        </div>
      ) : null}
      <div
        id="model-panel-data"
        role="tabpanel"
        aria-labelledby="model-tab-data"
        className={view === 'data' ? 'min-h-0 flex-1' : 'hidden'}
      >
        <CanvasModelDataView
          canvasId={canvasId}
          nodeId={transformNode.id}
          nodeName={transformNode.name}
          semanticDigest={digest}
          canEditModel={authoring?.canEditNode === true}
          query={query}
          preparePreview={preparePreview}
          copy={copy}
          unresolvedInputs={unresolvedInputs}
          onReviewInputs={() => requestNavigation('editor')}
        />
      </div>
      <CanvasDraftDecisionDialog {...navigation.decision} />
    </section>
  );
}
