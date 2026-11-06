/** Owned concern: adapt a file-backed dbt node to the shared Properties Code contribution port. */
import type { RefObject } from 'react';
import {
  readWorkspaceDbtModelReference,
  type DbtProjectGraphProjection,
  type WorkspaceDbtModelReference,
} from '@dvt/contracts';

import type { WorkspaceFileSaveReceipt } from '../../ports/workspace';
import type { CanonicalNode } from '../../types/canonical';
import type { CodeWorkingTreeReconciliationOutcome } from '../code/codeWorkingTreeSyncModel';
import {
  WorkspaceFileCodeEditor,
  type WorkspaceFileCodeEditorHandle,
} from '../code/WorkspaceFileCodeEditor';
import type { CanvasNodeWorkbenchContribution } from './canvasNodeWorkbenchContribution';
import { hasDbtCompatibilityMetadata } from './canvasDbtAuthoringModel';
import { resolveDbtProjectWorkspaceFilePath } from '../code/codeViewFileSelection';
import { useWorkspaceDbtProjectContext } from '../code/useWorkspaceDbtProjectContext';
import { resolveCodeViewCopy } from '../code/codeViewCopy';
import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';

function ReferencedModelCode({
  reference,
  graphOwnedPaths,
}: Readonly<{
  reference: WorkspaceDbtModelReference;
  graphOwnedPaths?: ReadonlySet<string>;
}>): JSX.Element {
  const { binding, projection, loading } = useWorkspaceDbtProjectContext({
    canvasId: reference.canvasId,
  });
  const copy = resolveCodeViewCopy(useApplicationLanguageStore((state) => state.language));
  const model = projection?.nodes.find(
    (candidate) => candidate.resourceType === 'model' && candidate.uniqueId === reference.uniqueId
  );
  const path =
    model?.originalFilePath == null || binding == null
      ? undefined
      : resolveDbtProjectWorkspaceFilePath(binding.authority.projectRoot, model.originalFilePath);
  if (loading || path == null)
    return (
      <p role={loading ? 'status' : 'alert'}>
        {loading ? copy.previewLoadingMessage : copy.previewErrorMessage}
      </p>
    );
  return (
    <WorkspaceFileCodeEditor
      access="read-only"
      authority="dbt-project-files"
      className="min-h-[30rem]"
      path={path}
      dbtProject={projection}
      graphOwnedPaths={graphOwnedPaths}
    />
  );
}

type BuildDbtWorkspaceFileCodeContributionsOptions = Readonly<{
  node: CanonicalNode | null;
  projectRoot?: string;
  dbtProject?: DbtProjectGraphProjection;
  editorRef?: RefObject<WorkspaceFileCodeEditorHandle>;
  graphOwnedPaths?: ReadonlySet<string>;
  reconcilePersistedFile?: (
    receipt: WorkspaceFileSaveReceipt
  ) => Promise<CodeWorkingTreeReconciliationOutcome>;
}>;

export function buildDbtWorkspaceFileCodeContributions({
  node,
  projectRoot,
  editorRef,
  reconcilePersistedFile,
  dbtProject,
  graphOwnedPaths,
}: BuildDbtWorkspaceFileCodeContributionsOptions): readonly CanvasNodeWorkbenchContribution[] {
  if (node == null) return [];
  const visualEditability = node?.metadata?.visualEditability;
  const isExternalPackage =
    typeof visualEditability === 'object' &&
    visualEditability !== null &&
    'reasons' in visualEditability &&
    Array.isArray(visualEditability.reasons) &&
    visualEditability.reasons.includes('external_package');
  const fileReference = readWorkspaceDbtModelReference(node);
  if (
    (!hasDbtCompatibilityMetadata(node) && fileReference == null) ||
    (fileReference == null && node.path == null) ||
    isExternalPackage
  ) {
    return [];
  }
  if (fileReference != null)
    return [
      {
        id: 'dbt-workspace-file-code-editor',
        nodeId: node.id,
        sectionId: 'code',
        placement: 'before-body',
        content: (
          <ReferencedModelCode
            key={`${node.id}:${fileReference.canvasId}:${fileReference.uniqueId}`}
            reference={fileReference}
            graphOwnedPaths={graphOwnedPaths}
          />
        ),
      },
    ];
  const workspaceFilePath =
    projectRoot == null || node.path == null
      ? undefined
      : resolveDbtProjectWorkspaceFilePath(projectRoot, node.path);
  if (workspaceFilePath == null) return [];

  return [
    {
      id: 'dbt-workspace-file-code-editor',
      nodeId: node.id,
      sectionId: 'code',
      placement: 'before-body',
      content: (
        <WorkspaceFileCodeEditor
          access="read-only"
          key={`${node.id}:${workspaceFilePath}`}
          ref={editorRef}
          authority="dbt-project-files"
          className="min-h-[30rem]"
          path={workspaceFilePath}
          reconcilePersistedFile={reconcilePersistedFile}
          dbtProject={dbtProject}
          graphOwnedPaths={graphOwnedPaths}
        />
      ),
    },
  ];
}
