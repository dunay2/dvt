/** Owned concern: adapt a DBT project-file code target to the Canvas shell workbench contract. */
import type { RefObject } from 'react';

import type { CanvasViewCopy } from './canvasCopy.types';
import type { CanvasShellContextualWorkbench } from './canvasShell.types';
import { SqlContextWorkbench, type SqlContextWorkbenchHandle } from './SqlContextWorkbench';
import type { SqlContextWorkbenchTarget } from './sqlContextWorkbenchModel';

type DbtProjectFileCodeWorkbenchCopy = Pick<
  CanvasViewCopy,
  | 'nodeWorkbenchCloseLabel'
  | 'sqlContextWorkbenchLoadingMessage'
  | 'sqlContextWorkbenchNodeTitle'
  | 'sqlContextWorkbenchProjectTitle'
>;

export function buildDbtProjectFileCodeWorkbench({
  copy,
  workbenchRef,
  onClose,
  onProjectChanged,
  projectRoot,
  target,
}: Readonly<{
  copy: DbtProjectFileCodeWorkbenchCopy;
  workbenchRef: RefObject<SqlContextWorkbenchHandle>;
  onClose: () => void;
  onProjectChanged: () => Promise<void>;
  projectRoot: string;
  target: SqlContextWorkbenchTarget | null;
}>): CanvasShellContextualWorkbench | undefined {
  if (target == null) {
    return undefined;
  }

  return {
    id: target.kind === 'node' ? 'node-code' : 'project-code',
    closeLabel: copy.nodeWorkbenchCloseLabel,
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
    },
    panel: (
      <SqlContextWorkbench
        ref={workbenchRef}
        loadingMessage={copy.sqlContextWorkbenchLoadingMessage}
        fileScope={{
          kind: 'dbt-project-files',
          projectRoot,
          ...(target.kind === 'node' ? { initialPath: target.initialPath } : {}),
        }}
        onFileSynchronized={onProjectChanged}
      />
    ),
  };
}
