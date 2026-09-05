/** Owned concern: adapt a file-backed dbt node to the shared Properties Code contribution port. */
import type { RefObject } from 'react';

import type { WorkspaceFileSaveReceipt } from '../../ports/workspace';
import type { CanonicalNode } from '../../types/canonical';
import type { CodeWorkingTreeReconciliationOutcome } from '../code/codeWorkingTreeSyncModel';
import {
  WorkspaceFileCodeEditor,
  type WorkspaceFileCodeEditorHandle,
} from '../code/WorkspaceFileCodeEditor';
import type { CanvasNodeWorkbenchContribution } from './canvasNodeWorkbenchContribution';
import { hasDbtCompatibilityMetadata } from './canvasDbtAuthoringModel';

type BuildDbtWorkspaceFileCodeContributionsOptions = Readonly<{
  node: CanonicalNode | null;
  projectRoot: string;
  editorRef: RefObject<WorkspaceFileCodeEditorHandle>;
  reconcilePersistedFile: (
    receipt: WorkspaceFileSaveReceipt
  ) => Promise<CodeWorkingTreeReconciliationOutcome>;
}>;

export function buildDbtWorkspaceFileCodeContributions({
  node,
  projectRoot,
  editorRef,
  reconcilePersistedFile,
}: BuildDbtWorkspaceFileCodeContributionsOptions): readonly CanvasNodeWorkbenchContribution[] {
  const visualEditability = node?.metadata?.visualEditability;
  const isExternalPackage =
    typeof visualEditability === 'object' &&
    visualEditability !== null &&
    'reasons' in visualEditability &&
    Array.isArray(visualEditability.reasons) &&
    visualEditability.reasons.includes('external_package');
  if (
    node == null ||
    !hasDbtCompatibilityMetadata(node) ||
    node.path == null ||
    isExternalPackage
  ) {
    return [];
  }
  const normalizedProjectRoot = projectRoot
    .replaceAll('\\', '/')
    .replace(/^\.\//, '')
    .replace(/\/+$/, '');
  const normalizedNodePath = node.path.replaceAll('\\', '/').replace(/^\.\//, '');
  const workspaceFilePath =
    normalizedProjectRoot.length === 0 || normalizedProjectRoot === '.'
      ? normalizedNodePath
      : `${normalizedProjectRoot}/${normalizedNodePath}`;

  return [
    {
      id: 'dbt-workspace-file-code-editor',
      nodeId: node.id,
      sectionId: 'code',
      placement: 'before-body',
      content: (
        <WorkspaceFileCodeEditor
          key={`${node.id}:${workspaceFilePath}`}
          ref={editorRef}
          authority="dbt-project-files"
          className="min-h-[30rem]"
          path={workspaceFilePath}
          reconcilePersistedFile={reconcilePersistedFile}
        />
      ),
    },
  ];
}
