/** Owned concern: render workspace file queries as the Code workbench local Monaco buffer. */
import { FileCode2 } from 'lucide-react';
import { useMemo, useState } from 'react';

import { usePublishedRouteBootstrap } from '../bootstrap/usePublishedRouteBootstrap';
import { ViewHeader } from '../components/domain';
import { WorkbenchDegradedState } from '../components/workbench/state/WorkbenchStates';
import {
  RouteWorkbenchFrame,
  routeWorkbenchHeaderBandClassName,
} from '../components/workbench/RouteWorkbenchFrame';
import { MonacoCodeEditor } from '../components/monaco/MonacoCodeEditor';
import {
  useWorkspaceFileContentQuery,
  useWorkspaceFileTreeQuery,
} from '../queries/workspaceQueries';
import type { WorkspaceFileEntry } from '../ports/workspace';
import {
  CodePreviewEmptyStateView,
  CodePreviewErrorStateView,
  CodeRouteEmptyStateView,
  CodeRouteErrorStateView,
  CodeRouteLoadingStateView,
} from './code/CodeStateViews';
import { resolveCodeWorkbenchErrorPresentation } from './code/codeWorkbenchErrorModel';
import { deriveCodeRouteBootstrapPresentation } from './code/codeRouteBootstrap';
import { codeViewCopy as copy } from './code/codeViewCopy';
import FileTreePanel from './code/FileTreePanel';
import { CANVAS_WORKBENCH_ROUTE_ID } from './canvas/canvasDraftPresentationStore';

function flattenFiles(entries: WorkspaceFileEntry[]): WorkspaceFileEntry[] {
  return entries.flatMap((entry) =>
    entry.kind === 'file' ? [entry] : entry.children ? flattenFiles(entry.children) : []
  );
}

function firstFilePath(entries: WorkspaceFileEntry[]): string | undefined {
  return flattenFiles(entries)[0]?.path;
}

function hasWorkspaceFiles(entries: WorkspaceFileEntry[]): boolean {
  return firstFilePath(entries) !== undefined;
}

export default function CodeView() {
  const fileTreeQuery = useWorkspaceFileTreeQuery();
  const [selectedPath, setSelectedPath] = useState<string | undefined>(undefined);
  const [localBuffers, setLocalBuffers] = useState<Record<string, string>>({});
  const workspaceFileTree = fileTreeQuery.data ?? [];
  const resolvedPath = useMemo(
    () => selectedPath ?? firstFilePath(workspaceFileTree),
    [workspaceFileTree, selectedPath]
  );
  const fileContentQuery = useWorkspaceFileContentQuery(resolvedPath);
  const fileTreeErrorPresentation = fileTreeQuery.isError
    ? resolveCodeWorkbenchErrorPresentation({
        scope: 'file-tree',
        error: fileTreeQuery.error,
      })
    : null;
  const filePreviewErrorPresentation = fileContentQuery.isError
    ? resolveCodeWorkbenchErrorPresentation({
        scope: 'file-preview',
        error: fileContentQuery.error,
        selectedPath: resolvedPath,
      })
    : null;

  usePublishedRouteBootstrap(
    CANVAS_WORKBENCH_ROUTE_ID,
    deriveCodeRouteBootstrapPresentation({
      isLoadingFileTree: fileTreeQuery.isPending,
      fileTreeErrorMessage: fileTreeErrorPresentation?.message ?? null,
      hasWorkspaceFiles: hasWorkspaceFiles(workspaceFileTree),
      isLoadingFilePreview: resolvedPath !== undefined && fileContentQuery.isPending,
      filePreviewErrorMessage: filePreviewErrorPresentation?.message ?? null,
    })
  );

  if (fileTreeQuery.isPending) {
    return <CodeRouteLoadingStateView />;
  }

  if (fileTreeQuery.isError) {
    return <CodeRouteErrorStateView error={fileTreeErrorPresentation!} />;
  }

  if (!hasWorkspaceFiles(workspaceFileTree)) {
    return <CodeRouteEmptyStateView />;
  }

  const editorValue = fileContentQuery.data
    ? (localBuffers[fileContentQuery.data.path] ?? fileContentQuery.data.content)
    : '';

  const previewPane = fileContentQuery.isPending ? (
    <div className="flex h-full items-center justify-center text-sm text-[var(--text-muted)]">
      {copy.previewLoadingMessage}
    </div>
  ) : fileContentQuery.isError ? (
    <CodePreviewErrorStateView error={filePreviewErrorPresentation!} />
  ) : !fileContentQuery.data ? (
    <CodePreviewEmptyStateView />
  ) : (
    <MonacoCodeEditor
      ariaLabel={`Editing ${fileContentQuery.data.name}`}
      language={fileContentQuery.data.language}
      onChange={(value) => {
        setLocalBuffers((currentBuffers) => ({
          ...currentBuffers,
          [fileContentQuery.data.path]: value,
        }));
      }}
      path={fileContentQuery.data.path}
      value={editorValue}
    />
  );

  return (
    <RouteWorkbenchFrame
      scroll={false}
      bodyClassName="flex min-h-0 flex-1"
      header={
        <div className={routeWorkbenchHeaderBandClassName}>
          <ViewHeader
            className="border-0 bg-transparent px-0 py-0"
            title={copy.title}
            icon={<FileCode2 className="size-6 text-[var(--status-info)]" />}
            subtitle={copy.subtitle}
          />
        </div>
      }
    >
      <div className="w-80 shrink-0">
        <FileTreePanel
          tree={workspaceFileTree}
          selectedPath={resolvedPath}
          onSelect={(entry) => {
            if (entry.kind === 'file') {
              setSelectedPath(entry.path);
            }
          }}
        />
      </div>

      <div className="min-w-0 flex flex-1 flex-col">
        <div className="shrink-0 p-4 pb-0">
          <WorkbenchDegradedState
            dataSlot="code-local-buffer-state"
            title={copy.localBufferTitle}
            message={copy.localBufferMessage}
            note={copy.localBufferNote}
          />
        </div>
        <div className="min-h-0 flex-1 p-4">{previewPane}</div>
      </div>
    </RouteWorkbenchFrame>
  );
}
