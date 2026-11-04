/** Owned concern: adapt a file-backed dbt node to the shared Properties Code contribution port. */
import type { RefObject } from 'react';
import { readWorkspaceDbtModelReference, type DbtProjectGraphProjection } from '@dvt/contracts';

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
    node.path == null ||
    isExternalPackage
  ) {
    return [];
  }
  const workspaceFilePath =
    fileReference != null
      ? node.path
      : projectRoot == null
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
