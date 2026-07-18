/** Owned concern: adapt a DBT project-file code target to the Canvas shell workbench contract. */
import type { CanvasViewCopy } from './canvasCopy.types';
import type { CanvasShellContextualWorkbench } from './canvasShell.types';
import { SqlContextWorkbench } from './SqlContextWorkbench';
import type { SqlContextWorkbenchTarget } from './sqlContextWorkbenchModel';

type DbtProjectFileCodeWorkbenchCopy = Pick<
  CanvasViewCopy,
  | 'sqlContextWorkbenchLoadingMessage'
  | 'sqlContextWorkbenchNodeTitle'
  | 'sqlContextWorkbenchProjectTitle'
>;

export function buildDbtProjectFileCodeWorkbench({
  copy,
  onClose,
  projectRoot,
  target,
}: Readonly<{
  copy: DbtProjectFileCodeWorkbenchCopy;
  onClose: () => void;
  projectRoot: string;
  target: SqlContextWorkbenchTarget | null;
}>): CanvasShellContextualWorkbench | undefined {
  if (target == null) {
    return undefined;
  }

  return {
    id: target.kind === 'node' ? 'node-code' : 'project-code',
    title:
      target.kind === 'node'
        ? copy.sqlContextWorkbenchNodeTitle
        : copy.sqlContextWorkbenchProjectTitle,
    description: target.kind === 'node' ? target.initialPath : projectRoot,
    onClose,
    panel: (
      <SqlContextWorkbench
        loadingMessage={copy.sqlContextWorkbenchLoadingMessage}
        fileScope={{
          kind: 'dbt-project-files',
          projectRoot,
          ...(target.kind === 'node' ? { initialPath: target.initialPath } : {}),
        }}
      />
    ),
  };
}
