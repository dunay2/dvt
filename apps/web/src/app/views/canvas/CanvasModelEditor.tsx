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
import { useCanvasModelSqlLayout } from './model-sql/useCanvasModelSqlLayout';
import type { CanvasModelView } from './canvasWorkspaceMenuContributionStore';

type CanvasModelEditorProps = Readonly<{
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
}>;

export function CanvasModelEditor(props: CanvasModelEditorProps): JSX.Element {
  const language = useApplicationLanguageStore((state) => state.language);
  const copy = resolveCanvasSemanticEditorCopy(language);
  const treeCopy = resolveCanvasViewCopy(language);
  const sqlCopy = resolveModelSqlCopy(language);
  const sql = useCanvasModelSqlWorkspace(props);
  const [actionsHost, setActionsHost] = useState<HTMLDivElement | null>(null);
  const navigation = useCanvasModelWorkspaceNavigation(props, sql, copy);
  return (
    <CanvasModelEditorTemplate
      sqlPanelRef={sql.sqlPanelRef}
      label={`${props.transformNode.name} · ${copy.editor}`}
      semanticBlocked={sql.sqlApplying}
      footer={
        <CanvasModelEditorToolbar
          modelName={props.transformNode.name}
          draftStatus={props.draftStatus}
          sqlOpen={sql.sqlOpen}
          sqlPanelId={sql.sqlPanelId}
          copy={sqlCopy}
          onActionsHost={setActionsHost}
          onToggleSql={() => sql.setSqlOpen((open) => !open)}
        />
      }
      editor={
        <CanvasModelSemanticWorkspace
          canvasId={props.canvasId}
          transformNode={props.transformNode}
          nodes={props.nodes}
          edges={props.edges}
          authoring={props.authoring}
          active={props.active ?? true}
          copy={treeCopy}
          sqlApplying={sql.sqlApplying}
          sqlEditorAction={sql.sqlEditorAction}
          workbench={sql.workbench}
          codeProjection={sql.codeProjection}
          layoutKey={sql.layoutKey}
          layoutTransition={sql.modelLayout.transition}
          actionsHost={actionsHost}
          query={props.query}
          preparePreview={props.preparePreview}
          operationDataHost={sql.dataOwner === 'operation' ? props.operationDataHost : null}
          onExecuteSource={
            props.onExecuteSource == null
              ? undefined
              : (...args) => {
                  sql.setDataOwner('operation');
                  props.onExecuteSource!(...args);
                }
          }
          onOpenOperationData={() => {
            sql.setDataOwner('operation');
            props.onOpenOperationData?.();
          }}
        />
      }
      sqlOpen={sql.sqlOpen}
      sql={
        <CanvasModelSqlWorkspacePanel
          canvasId={props.canvasId}
          transformNode={props.transformNode}
          active={props.active ?? true}
          authoring={props.authoring}
          preparePreview={props.preparePreview}
          operationDataHost={props.operationDataHost}
          onOpenOperationData={props.onOpenOperationData}
          workspace={sql}
        />
      }
      guards={
        <>
          <CanvasModelNavigationGuard
            workbench={sql.combinedWorkbench}
            hasUnpersistedChanges={props.draftStatus.persistence !== 'durable'}
            onBlocked={navigation.onRouteBlocked}
          />
          <CanvasDraftDecisionDialog {...navigation.decision} />
        </>
      }
    />
  );
}

function useCanvasModelSqlWorkspace({
  canvasId,
  workspaceScope,
  transformNode,
  nodes,
  edges,
  initialView = 'semantic',
}: Pick<
  CanvasModelEditorProps,
  'canvasId' | 'workspaceScope' | 'transformNode' | 'nodes' | 'edges' | 'initialView'
>) {
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
  const layoutKey = canvasModelLayoutKey(workspaceScope, canvasId, transformNode.id);
  const modelLayout = useCanvasModelSqlLayout({
    layoutKey,
    node: transformNode,
    pending: sqlApplying,
  });
  const sqlPanelId = useId();
  const openSql = useCallback(() => setSqlOpen(true), []);
  const sqlEditorAction = useMemo(
    () => ({ open: openSql, panelId: sqlPanelId, expanded: sqlOpen }),
    [openSql, sqlPanelId, sqlOpen]
  );
  const [dataOwner, setDataOwner] = useState<'operation' | 'sql'>('operation');
  const sqlRevision = useMemo(
    () => modelSqlWorkspaceRevision({ scopeKey, canvasId, nodeId: transformNode.id, nodes, edges }),
    [scopeKey, canvasId, transformNode.id, nodes, edges]
  );
  return {
    scopeKey,
    codeProjection,
    workbench,
    sqlWorkbench,
    combinedWorkbench,
    sqlOpen,
    setSqlOpen,
    sqlPanelRef,
    sqlApplying,
    setSqlApplying,
    layoutKey,
    modelLayout,
    sqlPanelId,
    openSql,
    sqlEditorAction,
    dataOwner,
    setDataOwner,
    sqlRevision,
  };
}

function modelSqlWorkspaceRevision({
  scopeKey,
  canvasId,
  nodeId,
  nodes,
  edges,
}: Pick<CanvasModelEditorProps, 'canvasId' | 'nodes' | 'edges'> &
  Readonly<{ scopeKey: string | undefined; nodeId: string }>): string {
  return JSON.stringify([
    scopeKey,
    canvasId,
    nodeId,
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
  ]);
}

function CanvasModelEditorToolbar({
  modelName,
  draftStatus,
  sqlOpen,
  sqlPanelId,
  copy,
  onActionsHost,
  onToggleSql,
}: Readonly<{
  modelName: string;
  draftStatus: CanvasDraftStatusState;
  sqlOpen: boolean;
  sqlPanelId: string;
  copy: ReturnType<typeof resolveModelSqlCopy>;
  onActionsHost: (host: HTMLDivElement | null) => void;
  onToggleSql: () => void;
}>): JSX.Element {
  return (
    <CanvasModelToolbar
      data={{
        modelName: modelName,
        draftStatus,
        sqlOpen,
        sqlPanelId,
        sqlLabel: sqlOpen ? copy.close : copy.open,
      }}
      actions={{
        onActionsHost: onActionsHost,
        onToggleSql,
      }}
    />
  );
}

function CanvasModelSemanticWorkspace({
  canvasId,
  transformNode,
  nodes,
  edges,
  authoring,
  active,
  copy: treeCopy,
  sqlApplying,
  sqlEditorAction,
  workbench,
  codeProjection,
  layoutKey,
  layoutTransition,
  actionsHost,
  query,
  preparePreview,
  operationDataHost,
  onExecuteSource,
  onOpenOperationData,
}: Pick<
  CanvasModelEditorProps,
  | 'canvasId'
  | 'transformNode'
  | 'nodes'
  | 'edges'
  | 'authoring'
  | 'query'
  | 'preparePreview'
  | 'operationDataHost'
  | 'onExecuteSource'
  | 'onOpenOperationData'
> &
  Readonly<{
    active: boolean;
    copy: ReturnType<typeof resolveCanvasViewCopy>;
    sqlApplying: boolean;
    sqlEditorAction: React.ContextType<typeof CanvasModelSqlEditorAction>;
    workbench: React.RefObject<CanvasRelationalTreeWorkbenchHandle>;
    codeProjection: React.ComponentProps<typeof CanvasRelationalTreeWorkbench>['codeProjection'];
    layoutKey?: string;
    layoutTransition: React.ComponentProps<
      typeof CanvasRelationalTreeWorkbench
    >['layoutTransition'];
    actionsHost: HTMLDivElement | null;
  }>): JSX.Element {
  return (
    <CanvasModelSqlEditorAction.Provider value={sqlEditorAction}>
      <CanvasRelationalTreeWorkbench
        ref={workbench}
        active={active && !sqlApplying}
        codeProjection={codeProjection}
        layoutKey={layoutKey}
        layoutTransition={layoutTransition}
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
          onExecuteSource,
          preparePreview,
          dataHost: operationDataHost,
          onOpenData: onOpenOperationData,
        }}
      />
    </CanvasModelSqlEditorAction.Provider>
  );
}

type CanvasModelSqlWorkspace = ReturnType<typeof useCanvasModelSqlWorkspace>;

function useCanvasModelWorkspaceNavigation(
  props: Pick<
    CanvasModelEditorProps,
    | 'canvasId'
    | 'transformNode'
    | 'draftStatus'
    | 'preparePreview'
    | 'onClose'
    | 'onSelect'
    | 'onShowCanvas'
    | 'active'
  >,
  sql: Pick<
    CanvasModelSqlWorkspace,
    'combinedWorkbench' | 'sqlOpen' | 'setSqlOpen' | 'sqlPanelId' | 'sqlApplying' | 'openSql'
  >,
  copy: ReturnType<typeof resolveCanvasSemanticEditorCopy>
) {
  const navigation = useCanvasModelNavigation({
    workbench: sql.combinedWorkbench,
    onClose: props.onClose,
    preparePreview: props.preparePreview,
    draftStatus: props.draftStatus,
    copy,
  });
  useCanvasModelWorkspaceTab({
    canvasId: props.canvasId,
    nodeId: props.transformNode.id,
    label: props.transformNode.name,
    active: props.active ?? true,
    onSelect: props.onSelect,
    onCanvas: props.onShowCanvas,
    views: {
      active: sql.sqlOpen ? 'sql' : 'semantic',
      sqlPanelId: sql.sqlPanelId,
      disabled: sql.sqlApplying,
      semantic: () => sql.setSqlOpen(false),
      sql: sql.openSql,
    },
    onClose: (continuation) => {
      props.onSelect();
      navigation.requestClose(continuation);
    },
  });
  return navigation;
}

function CanvasModelSqlWorkspacePanel({
  canvasId,
  transformNode,
  active,
  authoring,
  preparePreview,
  operationDataHost,
  onOpenOperationData,
  workspace,
}: Pick<
  CanvasModelEditorProps,
  | 'canvasId'
  | 'transformNode'
  | 'authoring'
  | 'preparePreview'
  | 'operationDataHost'
  | 'onOpenOperationData'
> &
  Readonly<{
    active: boolean;
    workspace: Pick<
      CanvasModelSqlWorkspace,
      | 'sqlWorkbench'
      | 'sqlPanelId'
      | 'scopeKey'
      | 'sqlRevision'
      | 'sqlOpen'
      | 'workbench'
      | 'setSqlOpen'
      | 'setSqlApplying'
      | 'modelLayout'
      | 'dataOwner'
      | 'setDataOwner'
    >;
  }>): JSX.Element {
  return (
    <CanvasModelSqlPanel
      ref={workspace.sqlWorkbench}
      panelId={workspace.sqlPanelId}
      canvasId={canvasId}
      node={transformNode}
      scopeKey={workspace.scopeKey}
      revision={workspace.sqlRevision}
      open={workspace.sqlOpen}
      active={active}
      visual={workspace.workbench}
      authoring={authoring}
      preparePreview={preparePreview}
      onClose={() => workspace.setSqlOpen(false)}
      onApplyingChange={workspace.setSqlApplying}
      captureGeneratedLayout={workspace.modelLayout.capture}
      dataHost={operationDataHost}
      ownsData={workspace.dataOwner === 'sql'}
      onOpenData={() => {
        workspace.setDataOwner('sql');
        onOpenOperationData?.();
      }}
    />
  );
}
