/** Owned concern: compose scoped file inspection, references and accepted-file metadata. */
import { FileCode2, PanelRight } from 'lucide-react';
import type { DbtProjectGraphProjection } from '@dvt/contracts';
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';

import { usePublishedRouteBootstrap } from '../bootstrap/usePublishedRouteBootstrap';
import { ViewHeader } from '../components/domain';
import { NodePropertyFacts } from '../components/inspector/NodePropertyFacts';
import { Button } from '../components/ui/button';
import {
  RouteWorkbenchFrame,
  routeWorkbenchHeaderBandClassName,
  routeWorkbenchPanelHeaderClassName,
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
import { resolveCodeViewCopy, resolveCodeInlineReferenceCopy } from './code/codeViewCopy';
import { CodeReferenceDetails } from './code/CodeReferenceDetails';
import type { CodeInlineReferenceDetail } from './code/codeInlineReferences';
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

export type CodeViewFileScope =
  | Readonly<{ kind: 'workspace-files' }>
  | Readonly<{
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
  fileSelectionRequest?: Readonly<{ path: string }>;
  presentation?: 'default' | 'project-workspace';
  dbtProject?: DbtProjectGraphProjection;
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
    fileSelectionRequest,
    presentation = 'default',
    dbtProject,
    reconcilePersistedFile,
  }: CodeViewProps = {},
  ref
) {
  const applicationLanguage = useApplicationLanguageStore((state) => state.language);
  const copy = resolveCodeViewCopy(applicationLanguage);
  const inlineCopy = resolveCodeInlineReferenceCopy(applicationLanguage);
  const isProjectWorkspace = presentation === 'project-workspace';
  const [propertiesOpen, setPropertiesOpen] = useState(true);
  const [inspectedReference, setInspectedReference] = useState<CodeInlineReferenceDetail>();
  const referenceOpener = useRef<HTMLElement | null>(null);
  const inspectReference = useCallback((reference: CodeInlineReferenceDetail | undefined) => {
    if (reference != null) {
      referenceOpener.current =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
    }
    setInspectedReference(reference);
  }, []);
  const closeReference = useCallback(() => {
    setInspectedReference(undefined);
    if (referenceOpener.current?.isConnected) referenceOpener.current.focus();
  }, []);
  const propertiesId = useId();
  const isDbtProjectFiles = fileScope?.kind === 'dbt-project-files';
  const preferredPath =
    fileSelectionRequest?.path ??
    (isDbtProjectFiles ? (fileScope.initialPath ?? initialPath) : initialPath);
  const fileTreeQuery = useWorkspaceFileTreeQuery();
  const graphSnapshotQuery = useWorkspaceGraphForViewQuery(
    CODE_GRAPH_FILE_SCOPE_VIEW_ID,
    undefined,
    { enabled: !isDbtProjectFiles }
  );
  const [selectedPath, setSelectedPath] = useState<string | undefined>(() => preferredPath);
  const fileSelectionRequestIdRef = useRef(0);
  const workspaceFileEditorRef = useRef<WorkspaceFileCodeEditorHandle>(null);
  const pendingFileSelectionRef = useRef<Readonly<{
    requestId: number;
    path: string | undefined;
  }> | null>(null);
  const workspaceFileTree = fileTreeQuery.data ?? [];
  const scopedWorkspaceFileTree = useMemo(
    () =>
      isDbtProjectFiles
        ? resolveProjectRootScopedCodeWorkspaceFileTree(workspaceFileTree, fileScope.projectRoot)
        : fileScope?.kind === 'workspace-files'
          ? workspaceFileTree
          : resolveGraphScopedCodeWorkspaceFileTree({
              entries: workspaceFileTree,
              graph: graphSnapshotQuery.data,
            }),
    [fileScope, isDbtProjectFiles, graphSnapshotQuery.data, workspaceFileTree]
  );
  const resolvedPath = useMemo(
    () =>
      hasCodeWorkspaceFilePath(scopedWorkspaceFileTree, selectedPath)
        ? selectedPath
        : isDbtProjectFiles
          ? resolveInitialDbtProjectFilePath(scopedWorkspaceFileTree, {
              projectRoot: fileScope.projectRoot,
              preferredPath,
            })
          : resolveInitialCodeFilePath(scopedWorkspaceFileTree),
    [fileScope, isDbtProjectFiles, preferredPath, scopedWorkspaceFileTree, selectedPath]
  );
  const fileContentQuery = useWorkspaceFileContentQuery(resolvedPath);
  const graphOwnedPaths = useMemo(
    () => deriveCodeGraphFilePaths(graphSnapshotQuery.data),
    [graphSnapshotQuery.data]
  );
  const graphAuthority = graphSnapshotQuery.data?.authoringAuthority;
  const fileAuthority = isDbtProjectFiles
    ? 'dbt-project-files'
    : graphAuthority?.kind === 'resolved' && graphAuthority.binding.authority.kind === 'graph-draft'
      ? 'graph-draft'
      : graphAuthority?.kind === 'unresolved' && graphAuthority.reason === 'mixed_authority'
        ? 'mixed'
        : 'missing';
  const fileHistoryQuery = useWorkspaceFileHistoryQuery(
    isProjectWorkspace ? undefined : resolvedPath
  );
  const selectedFile =
    fileContentQuery.isSuccess && fileContentQuery.data.path === resolvedPath
      ? fileContentQuery.data
      : undefined;
  const loadedModifiedAt =
    selectedFile != null && !Number.isNaN(Date.parse(selectedFile.lastModified))
      ? new Date(selectedFile.lastModified)
      : null;
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
  const filePropertiesMessage = fileContentQuery.isPending
    ? { text: copy.previewLoadingMessage, error: false }
    : filePreviewErrorPresentation
      ? { text: filePreviewErrorPresentation.title, error: true }
      : selectedFile == null
        ? { text: copy.previewEmptyMessage, error: false }
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
      if (nextPath !== undefined && !hasCodeWorkspaceFilePath(scopedWorkspaceFileTree, nextPath)) {
        return;
      }
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
    [persistPendingFileSelection, resolvedPath, scopedWorkspaceFileTree, selectedPath]
  );
  const latestRequestFileSelectionRef = useRef(requestFileSelection);
  useEffect(() => {
    latestRequestFileSelectionRef.current = requestFileSelection;
  }, [requestFileSelection]);
  useEffect(() => {
    if (!fileTreeQuery.isSuccess || (!isDbtProjectFiles && graphSnapshotQuery.isPending)) return;
    void latestRequestFileSelectionRef.current(preferredPath);
  }, [
    fileSelectionRequest,
    preferredPath,
    fileTreeQuery.isSuccess,
    isDbtProjectFiles,
    graphSnapshotQuery.isPending,
  ]);
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
          (!isDbtProjectFiles && fileTreeQuery.isSuccess && graphSnapshotQuery.isPending),
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
    (!isDbtProjectFiles && fileTreeQuery.isSuccess && graphSnapshotQuery.isPending)
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
      bodyClassName="flex"
      bodyContainerClassName="flex"
      presentationMode={publishRouteBootstrap ? 'route' : 'embedded'}
      header={
        !isProjectWorkspace && publishRouteBootstrap ? (
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
        leftPanel: isProjectWorkspace ? undefined : (
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
        rightPanel: isProjectWorkspace ? (
          propertiesOpen ? (
            <section
              id={propertiesId}
              role="region"
              aria-label={copy.filePropertiesTitle}
              className="flex h-full flex-col border-l border-(--border-default)"
            >
              {inspectedReference != null ? (
                <CodeReferenceDetails
                  reference={inspectedReference}
                  copy={inlineCopy}
                  onClose={closeReference}
                />
              ) : (
                <>
                  <h2 className={routeWorkbenchPanelHeaderClassName}>{copy.filePropertiesTitle}</h2>
                  <div className="min-h-0 flex-1 overflow-auto p-3">
                    {filePropertiesMessage != null ? (
                      <p
                        role={filePropertiesMessage.error ? 'alert' : undefined}
                        className="text-xs text-(--text-muted)"
                      >
                        {filePropertiesMessage.text}
                      </p>
                    ) : selectedFile != null ? (
                      <NodePropertyFacts
                        rows={[
                          { label: copy.name, value: selectedFile.name },
                          { label: copy.path, value: selectedFile.path },
                          { label: copy.language, value: selectedFile.language },
                          ...(loadedModifiedAt == null
                            ? []
                            : [
                                {
                                  label: copy.loadedVersionModified,
                                  value: (
                                    <time dateTime={selectedFile.lastModified}>
                                      {loadedModifiedAt.toLocaleString(applicationLanguage)}
                                    </time>
                                  ),
                                },
                              ]),
                        ]}
                      />
                    ) : null}
                  </div>
                </>
              )}
            </section>
          ) : undefined
        ) : publishRouteBootstrap ? (
          <CodeFileHistoryPanel
            copy={copy}
            selectedPath={resolvedPath}
            entries={fileHistoryQuery.data ?? []}
            isLoading={fileHistoryQuery.isPending}
            error={fileHistoryQuery.error instanceof Error ? fileHistoryQuery.error : null}
          />
        ) : undefined,
        primarySurface: (
          <WorkspaceFileCodeEditor
            access="read-only"
            ref={workspaceFileEditorRef}
            fillAvailableSpace
            headerActions={
              isProjectWorkspace ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-6"
                  aria-label={copy.filePropertiesTitle}
                  title={copy.filePropertiesTitle}
                  aria-expanded={propertiesOpen}
                  aria-controls={propertiesId}
                  onClick={() => {
                    setInspectedReference(undefined);
                    setPropertiesOpen((current) => !current);
                  }}
                >
                  <PanelRight aria-hidden="true" />
                </Button>
              ) : undefined
            }
            authority={fileAuthority}
            graphOwnedPaths={graphOwnedPaths}
            path={resolvedPath}
            reconcilePersistedFile={reconcilePersistedFile}
            onPersistenceRecovered={persistPendingFileSelection}
            dbtProject={dbtProject}
            onInspectReference={isProjectWorkspace && propertiesOpen ? inspectReference : undefined}
          />
        ),
      }}
    />
  );
});

export default CodeView;
