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

type BuildDbtWorkspaceFileCodeContributionsOptions = Readonly<{
  node: CanonicalNode | null;
  editorRef: RefObject<WorkspaceFileCodeEditorHandle>;
  reconcilePersistedFile: (
    receipt: WorkspaceFileSaveReceipt
  ) => Promise<CodeWorkingTreeReconciliationOutcome>;
}>;

export function buildDbtWorkspaceFileCodeContributions({
  node,
  editorRef,
  reconcilePersistedFile,
}: BuildDbtWorkspaceFileCodeContributionsOptions): readonly CanvasNodeWorkbenchContribution[] {
  if (node == null || node.pluginId !== 'dbt' || node.path == null) {
    return [];
  }

  return [
    {
      id: 'dbt-workspace-file-code-editor',
      nodeId: node.id,
      sectionId: 'code',
      placement: 'before-body',
      content: (
        <WorkspaceFileCodeEditor
          key={`${node.id}:${node.path}`}
          ref={editorRef}
          authority="dbt-project-files"
          className="min-h-[30rem]"
          path={node.path}
          reconcilePersistedFile={reconcilePersistedFile}
        />
      ),
    },
  ];
}
