/** Owned concern: compose the full-width Model workspace from existing semantic, SQL and data owners. */
import './canvasSemanticEditor.css';
import { useRef, useState } from 'react';
import { CanvasModelToolbar } from './CanvasModelToolbar';
import { useCanvasModelNavigation } from './useCanvasModelNavigation';
import { CanvasModelEditorTemplate } from './CanvasModelEditor.templates';
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
import type { CanvasModelPreviewPreparation } from './CanvasModelDataView';
import { CanvasModelNavigationGuard } from './CanvasModelNavigationGuard';

export function CanvasModelEditor({
  canvasId,
  transformNode,
  nodes,
  edges,
  authoring,
  outputs,
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
  transformNode: CanonicalNode;
  nodes: readonly CanonicalNode[];
  edges: readonly CanonicalEdge[];
  authoring?: CanvasRelationalTreeAuthoringContract;
  outputs?: Readonly<{ onOpenSql?: () => void; onOpenData?: () => void }>;
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
    workbench,
    onClose,
    preparePreview,
    draftStatus,
    copy,
  });
  const { onRouteBlocked } = navigation;
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
    <CanvasModelEditorTemplate
      label={`${transformNode.name} · ${copy.editor}`}
      toolbar={
        <CanvasModelToolbar
          data={{
            modelName: transformNode.name,
            draftStatus,
            sqlLabel: copy.sql,
            dataLabel: copy.viewData,
          }}
          actions={{ ...outputs, onActionsHost: setActionsHost }}
        />
      }
      editor={
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
            dataHost: operationDataHost,
            onOpenData: onOpenOperationData,
          }}
        />
      }
      guards={
        <>
          <CanvasModelNavigationGuard
            workbench={workbench}
            hasUnpersistedChanges={draftStatus.persistence !== 'durable'}
            onBlocked={onRouteBlocked}
          />
          <CanvasDraftDecisionDialog {...navigation.decision} />
        </>
      }
    />
  );
}
