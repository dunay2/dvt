/** Owned concern: adapt one graph-owned generated file to the shared read-only Code surface. */
import type { CanonicalNode } from '../../types/canonical';
import { WorkspaceFileCodeEditor } from '../code/WorkspaceFileCodeEditor';
import type { CanvasNodeWorkbenchContribution } from './canvasNodeWorkbenchContribution';

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
