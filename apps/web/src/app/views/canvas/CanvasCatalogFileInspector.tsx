/** Owned concern: resolve a catalogue file target against the current authorized file project for the existing Inspector. */
import { useMemo, useSyncExternalStore, type ReactNode } from 'react';
import {
  isCanvasInspectorScopeCurrent,
  type CanvasInspectorTarget,
  type CanvasInspectorWorkspaceScope,
} from '../../stores/canvasInspectorTarget';
import type { CanonicalNode, CanonicalEdge } from '../../types/canonical';
import { useSessionContext } from '../../services/AppServicesContext';
import { useWorkspaceDbtProjectContext } from '../code/useWorkspaceDbtProjectContext';
import { resolveCodeViewCopy } from '../code/codeViewCopy';
import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';
import { projectDbtProjectGraphToCanonicalCanvas } from './dbtProjectFileProjection';
import { buildDbtWorkspaceFileCodeContributions } from './dbtWorkspaceFileCodeContribution';
import type { CanvasNodeWorkbenchContribution } from './canvasNodeWorkbenchContribution';
import { useDbtProjectFileInspector } from './useDbtProjectFileInspector';

type FileTarget = Extract<CanvasInspectorTarget, { kind: 'dbt-file-model' }>;
type FileInspection = Readonly<{
  node: CanonicalNode;
  nodes: readonly CanonicalNode[];
  edges: readonly CanonicalEdge[];
  contributions: readonly CanvasNodeWorkbenchContribution[];
}>;
const EMPTY_NODES: CanonicalNode[] = [];
const EMPTY_EDGES: CanonicalEdge[] = [];

export function CanvasCatalogFileInspector({
  target,
  workspaceScope,
  currentProjectRoot,
  visible,
  children,
}: Readonly<{
  target: FileTarget;
  workspaceScope?: CanvasInspectorWorkspaceScope;
  currentProjectRoot?: string;
  visible: boolean;
  children: (inspection: FileInspection) => ReactNode;
}>): JSX.Element {
  const session = useSessionContext();
  const currentScope = useSyncExternalStore(
    session.subscribeWorkspaceScope,
    session.getWorkspaceScopeSnapshot,
    session.getWorkspaceScopeSnapshot
  );
  const scopeCurrent =
    isCanvasInspectorScopeCurrent(target.workspaceScope, currentScope) &&
    isCanvasInspectorScopeCurrent(workspaceScope, currentScope);
  // Resolve the independently current project, never a root/Canvas chosen by the captured request.
  const context = useWorkspaceDbtProjectContext({
    projectRoot: currentProjectRoot,
    enabled: visible && scopeCurrent,
  });
  const bindingCurrent =
    scopeCurrent &&
    context.binding?.canvasId === target.binding.canvasId &&
    context.binding.authority.kind === target.binding.authority.kind &&
    context.binding.authority.projectRoot === target.binding.authority.projectRoot;
  const projection = useMemo(
    () =>
      context.projection == null
        ? null
        : projectDbtProjectGraphToCanonicalCanvas(context.projection),
    [context.projection]
  );
  const nodes = projection?.nodes ?? EMPTY_NODES;
  const nodesById = useMemo(() => new Map(nodes.map((node) => [node.id, node])), [nodes]);
  const authorityKey = JSON.stringify([
    currentScope.tenantId,
    currentScope.projectId,
    currentScope.environmentId,
    currentProjectRoot,
    context.binding?.canvasId,
    context.binding?.authority.projectRoot,
  ]);
  const node = useDbtProjectFileInspector({
    authorityKey,
    inspectorNodeId: target.uniqueId,
    inspectorVisible: visible && bindingCurrent,
    analysisFresh: context.projection != null,
    nodesById,
  });
  const contributions = useMemo(
    () =>
      buildDbtWorkspaceFileCodeContributions({
        node,
        projectRoot: context.binding?.authority.projectRoot,
        dbtProject: context.projection,
      }),
    [node, context.binding?.authority.projectRoot, context.projection]
  );
  const copy = resolveCodeViewCopy(useApplicationLanguageStore((state) => state.language));
  if (!bindingCurrent || node == null || node.metadata?.resourceType !== 'model') {
    const loading = scopeCurrent && context.loading;
    return (
      <p role={loading ? 'status' : 'alert'}>
        {loading ? copy.previewLoadingMessage : copy.previewErrorMessage}
      </p>
    );
  }
  return <>{children({ node, nodes, edges: projection?.edges ?? EMPTY_EDGES, contributions })}</>;
}
