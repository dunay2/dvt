/** Owned concern: adapt the scoped workspace-file query to the existing passive tree. */
import { useWorkspaceFileTreeQuery } from '../../../queries/workspaceQueries';
import { useApplicationLanguageStore } from '../../../stores/applicationLanguageStore';
import { routeWorkbenchMutedTextClassName } from '../../../components/workbench/RouteWorkbenchFrame';
import { cn } from '../../../components/ui/utils';
import FileTreePanel from '../../code/FileTreePanel';
import { resolveCodeViewCopy } from '../../code/codeViewCopy';
import { resolveCodeWorkbenchErrorPresentation } from '../../code/codeWorkbenchErrorModel';
import {
  hasCodeWorkspaceFiles,
  resolveProjectRootScopedCodeWorkspaceFileTree,
} from '../../code/codeViewFileSelection';

export function CanvasProjectFilesExplorer({
  projectRoot,
  onOpenFile,
}: Readonly<{
  projectRoot?: string;
  onOpenFile: (path: string) => void;
}>): JSX.Element {
  const query = useWorkspaceFileTreeQuery();
  const copy = resolveCodeViewCopy(useApplicationLanguageStore((state) => state.language));
  const stateClassName = cn('px-3 py-2 text-xs', routeWorkbenchMutedTextClassName);
  if (query.isPending)
    return (
      <p role="status" className={stateClassName}>
        {copy.routeLoadingMessage}
      </p>
    );
  if (query.isError) {
    const error = resolveCodeWorkbenchErrorPresentation({
      scope: 'file-tree',
      error: query.error,
      copy,
    });
    return (
      <p role="alert" className={stateClassName}>
        {error.title} {error.message}
      </p>
    );
  }
  const entries = query.data ?? [];
  const tree =
    projectRoot == null
      ? entries
      : resolveProjectRootScopedCodeWorkspaceFileTree(entries, projectRoot);
  if (!hasCodeWorkspaceFiles(tree))
    return (
      <p role="status" className={stateClassName}>
        {copy.routeEmptyMessage}
      </p>
    );
  return (
    <div className="min-h-0 flex-1 overflow-auto">
      <FileTreePanel
        title={copy.explorerTitle}
        tree={tree}
        onSelect={(entry) => onOpenFile(entry.path)}
      />
    </div>
  );
}
