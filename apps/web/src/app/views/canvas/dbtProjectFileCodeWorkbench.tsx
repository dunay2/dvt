/** Owned concern: adapt a DBT project-file code target to the Canvas shell workbench contract. */
import type { RefObject } from 'react';

import type { CanvasViewCopy } from './canvasCopy.types';
import type { CanvasShellContextualWorkbench } from './canvasShell.types';
import { SqlContextWorkbench, type SqlContextWorkbenchHandle } from './SqlContextWorkbench';
import type { SqlContextWorkbenchTarget } from './sqlContextWorkbenchModel';
import type { CodeWorkingTreeReconciliationOutcome } from '../code/codeWorkingTreeSyncModel';
import type { WorkspaceFileSaveReceipt } from '../../ports/workspace';

type DbtProjectFileCodeWorkbenchCopy = Pick<
  CanvasViewCopy,
  | 'nodeWorkbenchCloseLabel'
  | 'sqlContextWorkbenchMoveLabel'
  | 'sqlContextWorkbenchNodeTitle'
  | 'sqlContextWorkbenchProjectTitle'
>;

export function buildDbtProjectFileCodeWorkbench({
  copy,
  workbenchRef,
  onClose,
  reconcilePersistedFile,
  projectRoot,
  target,
}: Readonly<{
  copy: DbtProjectFileCodeWorkbenchCopy;
  workbenchRef: RefObject<SqlContextWorkbenchHandle>;
  onClose: () => void;
  reconcilePersistedFile: (
    receipt: WorkspaceFileSaveReceipt
  ) => Promise<CodeWorkingTreeReconciliationOutcome>;
  projectRoot: string;
  target: SqlContextWorkbenchTarget | null;
}>): CanvasShellContextualWorkbench | undefined {
  if (target == null) {
    return undefined;
  }

  return {
    id: target.kind === 'node' ? 'node-code' : 'project-code',
    closeLabel: copy.nodeWorkbenchCloseLabel,
    moveLabel: copy.sqlContextWorkbenchMoveLabel,
    title:
      target.kind === 'node'
        ? copy.sqlContextWorkbenchNodeTitle
        : copy.sqlContextWorkbenchProjectTitle,
    description: target.kind === 'node' ? target.initialPath : projectRoot,
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
          ...(target.kind === 'node' ? { initialPath: target.initialPath } : {}),
        }}
        reconcilePersistedFile={reconcilePersistedFile}
      />
    ),
  };
}
