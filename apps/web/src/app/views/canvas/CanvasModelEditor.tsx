/** Owned concern: compose the semantic Model workspace and its draft lifecycle. */
import './canvasSemanticEditor.css';
import { useCallback, useId, useMemo, useRef, useState } from 'react';
import { useOptionalCanvasTransformSqlQueryPort } from '../../services/AppServicesContext';
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
import type { CanvasModelPreviewPreparation } from './canvasDraftLifecycle.types';
import { CanvasModelNavigationGuard } from './CanvasModelNavigationGuard';
import type { WorkspaceScope } from '../../ports/sessionContext';
import { canvasModelLayoutKey } from './CanvasModelLayoutSession';
import { CanvasModelSqlPanel } from './model-sql/CanvasModelSqlPanel';
import { CanvasModelSqlEditorAction } from './model-sql/CanvasModelSqlEditorAction';
import { resolveModelSqlCopy } from './model-sql/modelSqlCopy';
import { useCanvasModelDraftHandle } from './model-sql/useCanvasModelDraftHandle';
import { useCanvasModelSqlPanelLayout } from './model-sql/useCanvasModelSqlPanelLayout';
import type { CanvasModelView } from './canvasWorkspaceMenuContributionStore';

export function CanvasModelEditor({
  canvasId,
  workspaceScope,
  transformNode,
  nodes,
  edges,
  authoring,
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
  initialView = 'semantic',
}: Readonly<{
  canvasId: string;
  workspaceScope?: WorkspaceScope;
  transformNode: CanonicalNode;
  nodes: readonly CanonicalNode[];
  edges: readonly CanonicalEdge[];
  authoring?: CanvasRelationalTreeAuthoringContract;
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
  initialView?: CanvasModelView;
}>): JSX.Element {
  const language = useApplicationLanguageStore((state) => state.language);
  const copy = resolveCanvasSemanticEditorCopy(language);
  const treeCopy = resolveCanvasViewCopy(language);
  const sqlQuery = useOptionalCanvasTransformSqlQueryPort();
  const scopeKey =
    workspaceScope == null
      ? undefined
      : `${workspaceScope.tenantId}::${workspaceScope.projectId}::${workspaceScope.environmentId}`;
  const codeProjection = useMemo(
    () => (sqlQuery == null ? undefined : { canvasId, query: sqlQuery, scopeKey }),
    [canvasId, sqlQuery, scopeKey]
  );
  const workbench = useRef<CanvasRelationalTreeWorkbenchHandle>(null);
  const sqlWorkbench = useRef<CanvasRelationalTreeWorkbenchHandle>(null);
  const combinedWorkbench = useCanvasModelDraftHandle(workbench, sqlWorkbench);
  const [sqlOpen, setSqlOpen] = useState(initialView === 'sql');
  const sqlPanelRef = useCanvasModelSqlPanelLayout(sqlOpen);
  const [sqlApplying, setSqlApplying] = useState(false);
  const sqlPanelId = useId();
  const openSql = useCallback(() => setSqlOpen(true), []);
  const sqlEditorAction = useMemo(
    () => ({ open: openSql, panelId: sqlPanelId, expanded: sqlOpen }),
    [openSql, sqlPanelId, sqlOpen]
  );
  const [dataOwner, setDataOwner] = useState<'operation' | 'sql'>('operation');
  const sqlCopy = resolveModelSqlCopy(language);
  const sqlRevision = useMemo(
    () =>
      JSON.stringify([
        scopeKey,
        canvasId,
        transformNode.id,
        nodes.map((node) => [
          node.id,
          node.name,
          node.kind,
          node.pluginId,
          node.role,
          node.definitionId,
          node.sourceDefinitionId,
          node.path,
          node.metadata,
        ]),
        edges,
      ]),
    [scopeKey, canvasId, transformNode.id, nodes, edges]
  );
  const [actionsHost, setActionsHost] = useState<HTMLDivElement | null>(null);
  const navigation = useCanvasModelNavigation({
    workbench: combinedWorkbench,
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
    views: {
      active: sqlOpen ? 'sql' : 'semantic',
      sqlPanelId,
      disabled: sqlApplying,
      semantic: () => setSqlOpen(false),
      sql: openSql,
    },
    onClose: (continuation) => {
      onSelect();
      navigation.requestClose(continuation);
    },
  });
  return (
    <CanvasModelEditorTemplate
      sqlPanelRef={sqlPanelRef}
      label={`${transformNode.name} · ${copy.editor}`}
      semanticBlocked={sqlApplying}
      footer={
        <CanvasModelToolbar
          data={{
            modelName: transformNode.name,
            draftStatus,
            sqlOpen,
            sqlPanelId,
            sqlLabel: sqlOpen ? sqlCopy.close : sqlCopy.open,
          }}
          actions={{
            onActionsHost: setActionsHost,
            onToggleSql: () => setSqlOpen((open) => !open),
          }}
        />
      }
      editor={
        <CanvasModelSqlEditorAction.Provider value={sqlEditorAction}>
          <CanvasRelationalTreeWorkbench
            ref={workbench}
            active={active && !sqlApplying}
            codeProjection={codeProjection}
            layoutKey={canvasModelLayoutKey(workspaceScope, canvasId, transformNode.id)}
            transformNode={transformNode}
            nodes={nodes}
            edges={edges}
            copy={treeCopy}
            authoring={
              sqlApplying && authoring != null ? { ...authoring, canEditNode: false } : authoring
            }
            actionsHost={actionsHost}
            preview={{
              canvasId,
              query,
              onExecuteSource:
                onExecuteSource == null
                  ? undefined
                  : (...args) => {
                      setDataOwner('operation');
                      onExecuteSource(...args);
                    },
              preparePreview,
              dataHost: dataOwner === 'operation' ? operationDataHost : null,
              onOpenData: () => {
                setDataOwner('operation');
                onOpenOperationData?.();
              },
            }}
          />
        </CanvasModelSqlEditorAction.Provider>
      }
      sqlOpen={sqlOpen}
      sql={
        <CanvasModelSqlPanel
          ref={sqlWorkbench}
          panelId={sqlPanelId}
          canvasId={canvasId}
          node={transformNode}
          scopeKey={scopeKey}
          revision={sqlRevision}
          open={sqlOpen}
          active={active}
          visual={workbench}
          authoring={authoring}
          preparePreview={preparePreview}
          onClose={() => setSqlOpen(false)}
          onApplyingChange={setSqlApplying}
          dataHost={operationDataHost}
          ownsData={dataOwner === 'sql'}
          onOpenData={() => {
            setDataOwner('sql');
            onOpenOperationData?.();
          }}
        />
      }
      guards={
        <>
          <CanvasModelNavigationGuard
            workbench={combinedWorkbench}
            hasUnpersistedChanges={draftStatus.persistence !== 'durable'}
            onBlocked={onRouteBlocked}
          />
          <CanvasDraftDecisionDialog {...navigation.decision} />
        </>
      }
    />
  );
}
