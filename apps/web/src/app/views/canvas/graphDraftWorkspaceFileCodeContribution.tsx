/** Owned concern: adapt one graph-owned generated file to the shared read-only Code surface. */
import type { CanonicalNode } from '../../types/canonical';
import { WorkspaceFileCodeEditor } from '../code/WorkspaceFileCodeEditor';
import type { CanvasNodeWorkbenchContribution } from './canvasNodeWorkbenchContribution';
import type { CanvasShellGraph, CanvasShellPanels } from './canvasShell.types';
import type { DbtNodeData } from '../../components/canvas/DbtNodeComponent';
import { resolveWorkspaceFilePath } from './canvasWorkspaceFilePath';

export function buildCanvasInspectorCodeContributions(
  {
    inspectorNode,
    inspectorWorkbenchContributions,
  }: Pick<CanvasShellPanels, 'inspectorNode' | 'inspectorWorkbenchContributions'>,
  nodes: CanvasShellGraph['nodesWithImpact']
): readonly CanvasNodeWorkbenchContribution[] {
  if (
    inspectorWorkbenchContributions.some(
      (item) => item.nodeId === inspectorNode?.id && item.sectionId === 'code'
    )
  ) {
    return inspectorWorkbenchContributions;
  }
  const path = inspectorNode == null ? null : resolveWorkspaceFilePath(inspectorNode);
  if (path == null) return inspectorWorkbenchContributions;
  const graphOwnedPaths = new Set(
    nodes.flatMap((node) => {
      const file = resolveWorkspaceFilePath(node.data as DbtNodeData);
      return file == null ? [] : [file];
    })
  );
  return [
    ...inspectorWorkbenchContributions,
    ...buildGraphDraftWorkspaceFileCodeContributions({
      node: inspectorNode,
      path,
      graphOwnedPaths,
    }),
  ];
}

type BuildGraphDraftWorkspaceFileCodeContributionsOptions = Readonly<{
  node: CanonicalNode | null;
  path: string | null;
  graphOwnedPaths: ReadonlySet<string>;
}>;

export function buildGraphDraftWorkspaceFileCodeContributions({
  node,
  path,
  graphOwnedPaths,
}: BuildGraphDraftWorkspaceFileCodeContributionsOptions): readonly CanvasNodeWorkbenchContribution[] {
  if (node == null || path == null) {
    return [];
  }

  return [
    {
      id: 'graph-draft-workspace-file-code-editor',
      nodeId: node.id,
      sectionId: 'code',
      placement: 'before-body',
      content: (
        <WorkspaceFileCodeEditor
          key={`${node.id}:${path}`}
          authority="graph-draft"
          className="min-h-[30rem]"
          graphOwnedPaths={graphOwnedPaths}
          path={path}
        />
      ),
    },
  ];
}
