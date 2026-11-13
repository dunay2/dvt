/** Owned concern: adapt the scoped workspace-file query to the existing passive tree. */
import { useWorkspaceFileTreeQuery } from '../../../queries/workspaceQueries';
import { useApplicationLanguageStore } from '../../../stores/applicationLanguageStore';
import { FolderInput } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { resolveCanvasViewCopy } from '../canvasCopyCatalog';
import styles from '../CanvasWorkspaceMenuControls.module.css';
import { WorkspaceFileExplorer } from '../../code/WorkspaceFileExplorer';
import { resolveCodeViewCopy } from '../../code/codeViewCopy';
import { resolveCodeWorkbenchErrorPresentation } from '../../code/codeWorkbenchErrorModel';
import {
  hasCodeWorkspaceFiles,
  resolveProjectRootScopedCodeWorkspaceFileTree,
} from '../../code/codeViewFileSelection';

export function CanvasProjectFilesExplorer({
  projectRoot,
  onOpenFile,
  onImportDbtProject,
}: Readonly<{
  projectRoot?: string;
  onOpenFile: (path: string) => void;
  onImportDbtProject?: () => void;
}>): JSX.Element {
  const language = useApplicationLanguageStore((state) => state.language);
  return (
    <div className={styles.filesExplorer}>
      {onImportDbtProject == null ? null : (
        <div className={styles.fileActions}>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            data-slot="canvas-workspace-import-dbt-project-command"
            onClick={onImportDbtProject}
          >
            <FolderInput aria-hidden="true" />
            {resolveCanvasViewCopy(language).workspaceImportDbtProjectLabel}
          </Button>
        </div>
      )}
      <ProjectFileTree projectRoot={projectRoot} onOpenFile={onOpenFile} />
    </div>
  );
}

// Keep the action reachable even when the file query is empty, pending or unavailable.
function ProjectFileTree({
  projectRoot,
  onOpenFile,
}: Readonly<{
  projectRoot?: string;
  onOpenFile: (path: string) => void;
}>): JSX.Element {
  const query = useWorkspaceFileTreeQuery();
  const copy = resolveCodeViewCopy(useApplicationLanguageStore((state) => state.language));
  let stateMessage: JSX.Element | undefined;
  if (query.isPending)
    stateMessage = (
      <p role="status" className={styles.fileState}>
        {copy.routeLoadingMessage}
      </p>
    );
  if (query.isError) {
    const error = resolveCodeWorkbenchErrorPresentation({
      scope: 'file-tree',
      error: query.error,
      copy,
    });
    stateMessage = (
      <p role="alert" className={styles.fileState}>
        {error.title} {error.message}
      </p>
    );
  }
  const entries = query.data ?? [];
  const tree =
    projectRoot == null
      ? entries
      : resolveProjectRootScopedCodeWorkspaceFileTree(entries, projectRoot);
  if (query.isSuccess && !hasCodeWorkspaceFiles(tree))
    stateMessage = (
      <p role="status" className={styles.fileState}>
        {copy.routeEmptyMessage}
      </p>
    );
  return (
    <div className={styles.fileTree}>
      <WorkspaceFileExplorer
        title={copy.explorerTitle}
        tree={tree}
        rootPath={projectRoot ?? ''}
        stateMessage={stateMessage}
        disabled={!query.isSuccess}
        onOpenFile={onOpenFile}
      />
    </div>
  );
}
