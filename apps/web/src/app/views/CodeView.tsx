/** Owned concern: render workspace file queries as the Code workbench local Monaco buffer. */
import { FileCode2 } from 'lucide-react';
import { useMemo, useState } from 'react';

import { usePublishedRouteBootstrap } from '../bootstrap/usePublishedRouteBootstrap';
import { ViewHeader } from '../components/domain';
import { MonacoCodeEditor } from '../components/monaco/MonacoCodeEditor';
import {
  RouteWorkbenchFrame,
  routeWorkbenchHeaderBandClassName,
} from '../components/workbench/RouteWorkbenchFrame';
import { WorkbenchDegradedState } from '../components/workbench/state/WorkbenchStates';
import {
  useWorkspaceFileContentQuery,
  useWorkspaceFileTreeQuery,
} from '../queries/workspaceQueries';
import { CANVAS_WORKBENCH_ROUTE_ID } from './canvas/canvasDraftPresentationStore';
import { deriveCodeRouteBootstrapPresentation } from './code/codeRouteBootstrap';
import {
  CodePreviewEmptyStateView,
  CodePreviewErrorStateView,
  CodeRouteEmptyStateView,
  CodeRouteErrorStateView,
  CodeRouteLoadingStateView,
} from './code/CodeStateViews';
import { resolveCodeViewCopy } from './code/codeViewCopy';
import { hasCodeWorkspaceFiles, resolveInitialCodeFilePath } from './code/codeViewFileSelection';
import { resolveCodeWorkbenchErrorPresentation } from './code/codeWorkbenchErrorModel';
import FileTreePanel from './code/FileTreePanel';
import { useCodeEditableBuffer } from './code/useCodeEditableBuffer';

export default function CodeView() {
  const copy = resolveCodeViewCopy();
  const fileTreeQuery = useWorkspaceFileTreeQuery();
  const [selectedPath, setSelectedPath] = useState<string | undefined>(undefined);
  const workspaceFileTree = fileTreeQuery.data ?? [];
  const resolvedPath = useMemo(
    () => selectedPath ?? resolveInitialCodeFilePath(workspaceFileTree),
    [workspaceFileTree, selectedPath]
  );
  const fileContentQuery = useWorkspaceFileContentQuery(resolvedPath);
  const fileTreeErrorPresentation = fileTreeQuery.isError
    ? resolveCodeWorkbenchErrorPresentation({
        scope: 'file-tree',
        error: fileTreeQuery.error,
        copy,
      })
    : null;
  const filePreviewErrorPresentation = fileContentQuery.isError
    ? resolveCodeWorkbenchErrorPresentation({
        scope: 'file-preview',
        error: fileContentQuery.error,
        copy,
        selectedPath: resolvedPath,
      })
    : null;
  const editableBuffer = useCodeEditableBuffer(fileContentQuery.data);

  usePublishedRouteBootstrap(
    CANVAS_WORKBENCH_ROUTE_ID,
    deriveCodeRouteBootstrapPresentation(
      {
        isLoadingFileTree: fileTreeQuery.isPending,
        fileTreeErrorMessage: fileTreeErrorPresentation?.message ?? null,
        hasWorkspaceFiles: hasCodeWorkspaceFiles(workspaceFileTree),
        isLoadingFilePreview: resolvedPath !== undefined && fileContentQuery.isPending,
        filePreviewErrorMessage: filePreviewErrorPresentation?.message ?? null,
      },
      copy
    )
  );

  if (fileTreeQuery.isPending) {
    return <CodeRouteLoadingStateView />;
  }

  if (fileTreeQuery.isError) {
    return <CodeRouteErrorStateView error={fileTreeErrorPresentation!} />;
  }

  if (!hasCodeWorkspaceFiles(workspaceFileTree)) {
    return <CodeRouteEmptyStateView />;
  }

  const previewPane = fileContentQuery.isPending ? (
    <div className="flex h-full items-center justify-center text-sm text-(--text-muted)">
      {copy.previewLoadingMessage}
    </div>
  ) : fileContentQuery.isError ? (
    <CodePreviewErrorStateView error={filePreviewErrorPresentation!} />
  ) : !fileContentQuery.data ? (
    <CodePreviewEmptyStateView />
  ) : (
    <MonacoCodeEditor
      ariaLabel={`${copy.editorAriaLabelPrefix} ${fileContentQuery.data.name}`}
      language={fileContentQuery.data.language}
      loadingLabel={copy.editorLoadingMessage}
      onChange={editableBuffer.updateValue}
      path={fileContentQuery.data.path}
      value={editableBuffer.value}
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
            icon={<FileCode2 className="size-6 text-(--status-info)" />}
            subtitle={copy.subtitle}
          />
        </div>
      }
    >
      <div className="w-80 shrink-0">
        <FileTreePanel
          title={copy.explorerTitle}
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
