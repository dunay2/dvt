/** Owned concern: render workspace file queries as the Code workbench local Monaco buffer. */
import { FileCode2 } from 'lucide-react';
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';

import { usePublishedRouteBootstrap } from '../bootstrap/usePublishedRouteBootstrap';
import { ViewHeader } from '../components/domain';
import {
  RouteWorkbenchFrame,
  routeWorkbenchHeaderBandClassName,
} from '../components/workbench/RouteWorkbenchFrame';
import {
  useWorkspaceFileContentQuery,
  useWorkspaceFileHistoryQuery,
  useWorkspaceGraphForViewQuery,
  useWorkspaceFileTreeQuery,
} from '../queries/workspaceQueries';
import { CANVAS_ROUTE_ID } from './canvas/canvasDraftPresentationStore';
import { deriveCodeRouteBootstrapPresentation } from './code/codeRouteBootstrap';
import {
  CodeRouteEmptyStateView,
  CodeRouteErrorStateView,
  CodeRouteLoadingStateView,
} from './code/CodeStateViews';
import { resolveCodeViewCopy } from './code/codeViewCopy';
import { CodeFileHistoryPanel } from './code/CodeFileHistoryPanel';
import {
  hasCodeWorkspaceFilePath,
  hasCodeWorkspaceFiles,
  deriveCodeGraphFilePaths,
  resolveGraphScopedCodeWorkspaceFileTree,
  resolveInitialCodeFilePath,
  resolveInitialDbtProjectFilePath,
  resolveProjectRootScopedCodeWorkspaceFileTree,
} from './code/codeViewFileSelection';
import { resolveCodeWorkbenchErrorPresentation } from './code/codeWorkbenchErrorModel';
import FileTreePanel from './code/FileTreePanel';
import type { WorkspaceFileSaveReceipt } from '../ports/workspace';
import { type CodeWorkingTreeReconciliationOutcome } from './code/codeWorkingTreeSyncModel';
import { useApplicationLanguageStore } from '../stores/applicationLanguageStore';
import {
  WorkspaceFileCodeEditor,
  type WorkspaceFileCodeEditorHandle,
} from './code/WorkspaceFileCodeEditor';

const CODE_GRAPH_FILE_SCOPE_VIEW_ID = 'canvas-code-file-scope';

export type CodeViewFileScope = Readonly<{
  kind: 'dbt-project-files';
  projectRoot: string;
  initialPath?: string;
}>;

export type CodeViewHandle = Readonly<{
  flush: () => Promise<boolean>;
}>;

export type CodeViewProps = Readonly<{
  publishRouteBootstrap?: boolean;
  routeBootstrapId?: string;
  fileScope?: CodeViewFileScope;
  initialPath?: string;
  reconcilePersistedFile?: (
    receipt: WorkspaceFileSaveReceipt
  ) => Promise<CodeWorkingTreeReconciliationOutcome>;
}>;

const CodeView = forwardRef<CodeViewHandle, CodeViewProps>(function CodeView(
  {
    publishRouteBootstrap = true,
    routeBootstrapId = CANVAS_ROUTE_ID,
    fileScope,
    initialPath,
    reconcilePersistedFile,
  }: CodeViewProps = {},
  ref
) {
  const applicationLanguage = useApplicationLanguageStore((state) => state.language);
  const copy = resolveCodeViewCopy(applicationLanguage);
  const fileTreeQuery = useWorkspaceFileTreeQuery();
  const graphSnapshotQuery = useWorkspaceGraphForViewQuery(
    CODE_GRAPH_FILE_SCOPE_VIEW_ID,
    undefined,
    { enabled: fileScope === undefined }
  );
  const [selectedPath, setSelectedPath] = useState<string | undefined>(
    () => fileScope?.initialPath ?? initialPath
  );
  const fileSelectionRequestIdRef = useRef(0);
  const workspaceFileEditorRef = useRef<WorkspaceFileCodeEditorHandle>(null);
  const pendingFileSelectionRef = useRef<Readonly<{
    requestId: number;
    path: string | undefined;
  }> | null>(null);
  const workspaceFileTree = fileTreeQuery.data ?? [];
  const scopedWorkspaceFileTree = useMemo(
    () =>
      fileScope
        ? resolveProjectRootScopedCodeWorkspaceFileTree(workspaceFileTree, fileScope.projectRoot)
        : resolveGraphScopedCodeWorkspaceFileTree({
            entries: workspaceFileTree,
            graph: graphSnapshotQuery.data,
          }),
    [fileScope, graphSnapshotQuery.data, workspaceFileTree]
  );
  const resolvedPath = useMemo(
    () =>
      hasCodeWorkspaceFilePath(scopedWorkspaceFileTree, selectedPath)
        ? selectedPath
        : fileScope
          ? resolveInitialDbtProjectFilePath(scopedWorkspaceFileTree, {
              projectRoot: fileScope.projectRoot,
              preferredPath: fileScope.initialPath,
            })
          : resolveInitialCodeFilePath(scopedWorkspaceFileTree),
    [fileScope, scopedWorkspaceFileTree, selectedPath]
  );
  const fileContentQuery = useWorkspaceFileContentQuery(resolvedPath);
  const graphOwnedPaths = useMemo(
    () => deriveCodeGraphFilePaths(graphSnapshotQuery.data),
    [graphSnapshotQuery.data]
  );
  const graphAuthority = graphSnapshotQuery.data?.authoringAuthority;
  const fileAuthority = fileScope
    ? 'dbt-project-files'
    : graphAuthority?.kind === 'resolved' && graphAuthority.binding.authority.kind === 'graph-draft'
      ? 'graph-draft'
      : graphAuthority?.kind === 'unresolved' && graphAuthority.reason === 'mixed_authority'
        ? 'mixed'
        : 'missing';
  const fileHistoryQuery = useWorkspaceFileHistoryQuery(resolvedPath);
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
  const persistPendingFileSelection = useCallback(async (): Promise<void> => {
    const pendingSelection = pendingFileSelectionRef.current;
    if (!pendingSelection) {
      return;
    }
    const persisted = (await workspaceFileEditorRef.current?.flush()) ?? true;
    if (persisted && pendingFileSelectionRef.current?.requestId === pendingSelection.requestId) {
      pendingFileSelectionRef.current = null;
      setSelectedPath(pendingSelection.path);
    }
  }, []);
  const requestFileSelection = useCallback(
    async (nextPath: string | undefined): Promise<void> => {
      if (nextPath === selectedPath || nextPath === resolvedPath) {
        fileSelectionRequestIdRef.current += 1;
        pendingFileSelectionRef.current = null;
        return;
      }
      pendingFileSelectionRef.current = {
        requestId: ++fileSelectionRequestIdRef.current,
        path: nextPath,
      };
      await persistPendingFileSelection();
    },
    [persistPendingFileSelection, resolvedPath, selectedPath]
  );
  const latestRequestFileSelectionRef = useRef(requestFileSelection);
  useEffect(() => {
    latestRequestFileSelectionRef.current = requestFileSelection;
  }, [requestFileSelection]);
  useEffect(() => {
    void latestRequestFileSelectionRef.current(fileScope?.initialPath ?? initialPath);
  }, [fileScope?.initialPath, initialPath]);
  useImperativeHandle(
    ref,
    () => ({ flush: async () => (await workspaceFileEditorRef.current?.flush()) ?? true }),
    []
  );

  usePublishedRouteBootstrap(
    routeBootstrapId,
    deriveCodeRouteBootstrapPresentation(
      {
        isLoadingFileTree:
          fileTreeQuery.isPending ||
          (fileScope === undefined && fileTreeQuery.isSuccess && graphSnapshotQuery.isPending),
        fileTreeErrorMessage: fileTreeErrorPresentation?.message ?? null,
        hasWorkspaceFiles: hasCodeWorkspaceFiles(scopedWorkspaceFileTree),
        isLoadingFilePreview: resolvedPath !== undefined && fileContentQuery.isPending,
        filePreviewErrorMessage: filePreviewErrorPresentation?.message ?? null,
      },
      copy
    ),
    { enabled: publishRouteBootstrap }
  );

  if (
    fileTreeQuery.isPending ||
    (fileScope === undefined && fileTreeQuery.isSuccess && graphSnapshotQuery.isPending)
  ) {
    return <CodeRouteLoadingStateView />;
  }

  if (fileTreeQuery.isError) {
    return <CodeRouteErrorStateView error={fileTreeErrorPresentation!} />;
  }

  if (!hasCodeWorkspaceFiles(scopedWorkspaceFileTree)) {
    return <CodeRouteEmptyStateView />;
  }

  return (
    <RouteWorkbenchFrame
      scroll={false}
      bodyClassName="flex min-h-0 flex-1"
      presentationMode={publishRouteBootstrap ? 'route' : 'embedded'}
      header={
        publishRouteBootstrap ? (
          <div className={routeWorkbenchHeaderBandClassName}>
            <ViewHeader
              className="border-0 bg-transparent px-0 py-0"
              title={copy.title}
              icon={<FileCode2 className="size-6 text-(--status-info)" />}
              subtitle={copy.subtitle}
            />
          </div>
        ) : undefined
      }
      slots={{
        leftPanel: (
          <FileTreePanel
            title={copy.explorerTitle}
            tree={scopedWorkspaceFileTree}
            selectedPath={resolvedPath}
            onSelect={(entry) => {
              if (entry.kind === 'file' && entry.path !== resolvedPath) {
                void requestFileSelection(entry.path);
              }
            }}
          />
        ),
        rightPanel: publishRouteBootstrap ? (
          <CodeFileHistoryPanel
            copy={copy}
            selectedPath={resolvedPath}
            entries={fileHistoryQuery.data ?? []}
            isLoading={fileHistoryQuery.isPending}
            error={fileHistoryQuery.error instanceof Error ? fileHistoryQuery.error : null}
          />
        ) : undefined,
        primarySurface: (
          <div className="min-w-0 flex h-full flex-1 p-4">
            <WorkspaceFileCodeEditor
              ref={workspaceFileEditorRef}
              authority={fileAuthority}
              graphOwnedPaths={graphOwnedPaths}
              path={resolvedPath}
              reconcilePersistedFile={reconcilePersistedFile}
              onPersistenceRecovered={persistPendingFileSelection}
            />
          </div>
        ),
      }}
    />
  );
});

export default CodeView;
