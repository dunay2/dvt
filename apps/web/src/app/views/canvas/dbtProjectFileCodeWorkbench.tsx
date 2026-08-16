/** Owned concern: adapt a DBT project-file code target to the Canvas shell workbench contract. */
import type { RefObject } from 'react';

import type { CanvasViewCopy } from './canvasCopy.types';
import type { CanvasShellContextualWorkbench } from './canvasShell.types';
import { SqlContextWorkbench, type SqlContextWorkbenchHandle } from './SqlContextWorkbench';
import type { CodeWorkingTreeReconciliationOutcome } from '../code/codeWorkingTreeSyncModel';
import type { WorkspaceFileSaveReceipt } from '../../ports/workspace';

type DbtProjectFileCodeWorkbenchCopy = Pick<
  CanvasViewCopy,
  'nodeWorkbenchCloseLabel' | 'sqlContextWorkbenchMoveLabel' | 'sqlContextWorkbenchProjectTitle'
>;

export function buildDbtProjectFileCodeWorkbench({
  copy,
  workbenchRef,
  onClose,
  reconcilePersistedFile,
  projectRoot,
  open,
}: Readonly<{
  copy: DbtProjectFileCodeWorkbenchCopy;
  workbenchRef: RefObject<SqlContextWorkbenchHandle>;
  onClose: () => void;
  reconcilePersistedFile: (
    receipt: WorkspaceFileSaveReceipt
  ) => Promise<CodeWorkingTreeReconciliationOutcome>;
  projectRoot: string;
  open: boolean;
}>): CanvasShellContextualWorkbench | undefined {
  if (!open) {
    return undefined;
  }

  return {
    id: 'project-code',
    closeLabel: copy.nodeWorkbenchCloseLabel,
    moveLabel: copy.sqlContextWorkbenchMoveLabel,
    title: copy.sqlContextWorkbenchProjectTitle,
    description: projectRoot,
    requestClose: async () => {
      const flushed = (await workbenchRef.current?.flush()) ?? true;
      if (flushed) {
        onClose();
      }
      return flushed;
    },
    panel: (
      <SqlContextWorkbench
        ref={workbenchRef}
        fileScope={{
          kind: 'dbt-project-files',
          projectRoot,
        }}
        reconcilePersistedFile={reconcilePersistedFile}
      />
    ),
  };
}
