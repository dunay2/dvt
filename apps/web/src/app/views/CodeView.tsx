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
  type RefObject,
} from 'react';

import { usePublishedRouteBootstrap } from '../bootstrap/usePublishedRouteBootstrap';
import { ViewHeader } from '../components/domain';
import { Button } from '../components/ui/button';
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
import { resolveCodeViewCopy, resolveCodeInlineReferenceCopy } from './code/codeViewCopy';
import { CodeReferenceDetails } from './code/CodeReferenceDetails';
import type { CodeInlineReferenceDetail } from './code/codeInlineReferences';
import { CodeFileHistoryPanel } from './code/CodeFileHistoryPanel';
import { CodeWorkspaceFileProperties } from './code/CodeWorkspaceFileProperties';
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
import type { FileContent, WorkspaceFileSaveReceipt } from '../ports/workspace';
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
  const [fileHistoryHost, setFileHistoryHost] = useState<HTMLDivElement | null>(null);
  const [inspectedReference, setInspectedReference] = useState<CodeInlineReferenceDetail>();
  const referenceOpener = useRef<HTMLElement | null>(null);
  const inspectReference = useCallback(function inspectCodeReference(
    reference: CodeInlineReferenceDetail | undefined
  ) {
    if (reference != null) {
      referenceOpener.current =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
    }
    setInspectedReference(reference);
  }, []);
  const closeReference = useCallback(function closeCodeReference() {
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
    function projectCodeFileTree() {
      return resolveCodeViewFileTree({
        entries: workspaceFileTree,
        fileScope,
        graph: graphSnapshotQuery.data,
      });
    },
    [fileScope, graphSnapshotQuery.data, workspaceFileTree]
  );
  const resolvedPath = useMemo(
    function resolveSelectedCodePath() {
      return resolveCodeViewPath({
        entries: scopedWorkspaceFileTree,
        selectedPath,
        fileScope,
        preferredPath,
      });
    },
    [fileScope, preferredPath, scopedWorkspaceFileTree, selectedPath]
  );
  const fileContentQuery = useWorkspaceFileContentQuery(resolvedPath);
  const graphOwnedPaths = useMemo(
    () => deriveCodeGraphFilePaths(graphSnapshotQuery.data),
    [graphSnapshotQuery.data]
  );
  const graphAuthority = graphSnapshotQuery.data?.authoringAuthority;
  const fileAuthority = resolveCodeFileAuthority(isDbtProjectFiles, graphAuthority);
  const fileHistoryQuery = useWorkspaceFileHistoryQuery(
    isProjectWorkspace ? undefined : resolvedPath
  );
  const selectedFile =
    fileContentQuery.isSuccess && fileContentQuery.data.path === resolvedPath
      ? fileContentQuery.data
      : undefined;
  const fileScopePending =
    !isDbtProjectFiles && fileTreeQuery.isSuccess && graphSnapshotQuery.isPending;
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
  const filePropertiesMessage = resolveCodeFilePropertiesMessage({
    pending: fileContentQuery.isPending,
    errorTitle: filePreviewErrorPresentation?.title,
    selectedFile,
    copy,
  });
  const persistPendingFileSelection = useCallback(
    async function persistFileSelection(): Promise<void> {
      const pendingSelection = pendingFileSelectionRef.current;
      if (!pendingSelection) {
        return;
      }
      const persisted = (await workspaceFileEditorRef.current?.flush()) ?? true;
      if (persisted && pendingFileSelectionRef.current?.requestId === pendingSelection.requestId) {
        pendingFileSelectionRef.current = null;
        setSelectedPath(pendingSelection.path);
      }
    },
    []
  );
  const requestFileSelection = useCallback(
    async function selectCodeFile(nextPath: string | undefined): Promise<void> {
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
    if (!fileTreeQuery.isSuccess) return;
    if (!isDbtProjectFiles && graphSnapshotQuery.isPending) return;
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
        isLoadingFileTree: fileTreeQuery.isPending || fileScopePending,
        fileTreeErrorMessage: fileTreeErrorPresentation?.message ?? null,
        hasWorkspaceFiles: hasCodeWorkspaceFiles(scopedWorkspaceFileTree),
        isLoadingFilePreview: resolvedPath !== undefined && fileContentQuery.isPending,
        filePreviewErrorMessage: filePreviewErrorPresentation?.message ?? null,
      },
      copy
    ),
    { enabled: publishRouteBootstrap }
  );

  if (fileTreeQuery.isPending || fileScopePending) {
    return <CodeRouteLoadingStateView />;
  }

  if (fileTreeQuery.isError) {
    return <CodeRouteErrorStateView error={fileTreeErrorPresentation!} />;
  }

  if (!hasCodeWorkspaceFiles(scopedWorkspaceFileTree)) {
    return <CodeRouteEmptyStateView />;
  }

  return (
    <CodeViewWorkbench
      copy={copy}
      inlineCopy={inlineCopy}
      applicationLanguage={applicationLanguage}
      isProjectWorkspace={isProjectWorkspace}
      publishRouteBootstrap={publishRouteBootstrap}
      propertiesOpen={propertiesOpen}
      propertiesId={propertiesId}
      inspectedReference={inspectedReference}
      closeReference={closeReference}
      selectedFile={selectedFile}
      filePropertiesMessage={filePropertiesMessage}
      setFileHistoryHost={setFileHistoryHost}
      fileHistoryQuery={fileHistoryQuery}
      resolvedPath={resolvedPath}
      scopedWorkspaceFileTree={scopedWorkspaceFileTree}
      requestFileSelection={requestFileSelection}
      fileHistoryHost={fileHistoryHost}
      workspaceFileEditorRef={workspaceFileEditorRef}
      setInspectedReference={setInspectedReference}
      setPropertiesOpen={setPropertiesOpen}
      fileAuthority={fileAuthority}
      graphOwnedPaths={graphOwnedPaths}
      reconcilePersistedFile={reconcilePersistedFile}
      persistPendingFileSelection={persistPendingFileSelection}
      dbtProject={dbtProject}
      inspectReference={inspectReference}
    />
  );
});

export default CodeView;

function CodeViewWorkbench(
  props: Readonly<{
    copy: ReturnType<typeof resolveCodeViewCopy>;
    inlineCopy: ReturnType<typeof resolveCodeInlineReferenceCopy>;
    applicationLanguage: string;
    isProjectWorkspace: boolean;
    publishRouteBootstrap: boolean;
    propertiesOpen: boolean;
    propertiesId: string;
    inspectedReference: CodeInlineReferenceDetail | undefined;
    closeReference: () => void;
    selectedFile: FileContent | undefined;
    filePropertiesMessage: { text: string; error: boolean } | null;
    setFileHistoryHost: (host: HTMLDivElement | null) => void;
    fileHistoryQuery: ReturnType<typeof useWorkspaceFileHistoryQuery>;
    resolvedPath: string | undefined;
    scopedWorkspaceFileTree: NonNullable<ReturnType<typeof useWorkspaceFileTreeQuery>['data']>;
    requestFileSelection: (path: string | undefined) => Promise<void>;
    fileHistoryHost: HTMLDivElement | null;
    workspaceFileEditorRef: RefObject<WorkspaceFileCodeEditorHandle>;
    setInspectedReference: (reference: CodeInlineReferenceDetail | undefined) => void;
    setPropertiesOpen: (value: boolean | ((current: boolean) => boolean)) => void;
    fileAuthority: ReturnType<typeof resolveCodeFileAuthority>;
    graphOwnedPaths: ReturnType<typeof deriveCodeGraphFilePaths>;
    reconcilePersistedFile: CodeViewProps['reconcilePersistedFile'];
    persistPendingFileSelection: () => Promise<void>;
    dbtProject: CodeViewProps['dbtProject'];
    inspectReference: (reference: CodeInlineReferenceDetail | undefined) => void;
  }>
) {
  const {
    copy,
    isProjectWorkspace,
    publishRouteBootstrap,
    propertiesOpen,
    resolvedPath,
    scopedWorkspaceFileTree,
    requestFileSelection,
    fileHistoryHost,
    workspaceFileEditorRef,
    fileAuthority,
    graphOwnedPaths,
    reconcilePersistedFile,
    persistPendingFileSelection,
    dbtProject,
    inspectReference,
  } = props;
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
        rightPanel: (isProjectWorkspace ? propertiesOpen : publishRouteBootstrap) ? (
          <CodeViewAuxiliaryPanel {...props} />
        ) : undefined,
        primarySurface: (
          <WorkspaceFileCodeEditor
            access={isProjectWorkspace ? 'operation-sql' : 'read-only'}
            fileHistoryHost={fileHistoryHost}
            ref={workspaceFileEditorRef}
            fillAvailableSpace
            headerActions={isProjectWorkspace ? <CodePropertiesToggle {...props} /> : undefined}
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
}

function CodeViewAuxiliaryPanel(props: Parameters<typeof CodeViewWorkbench>[0]) {
  const {
    isProjectWorkspace,
    propertiesOpen,
    propertiesId,
    copy,
    inspectedReference,
    inlineCopy,
    closeReference,
    selectedFile,
    filePropertiesMessage,
    applicationLanguage,
    setFileHistoryHost,
    publishRouteBootstrap,
    resolvedPath,
    fileHistoryQuery,
  } = props;
  return isProjectWorkspace ? (
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
          <CodeWorkspaceFileProperties
            copy={copy}
            file={selectedFile}
            message={filePropertiesMessage}
            locale={applicationLanguage}
            historyHost={setFileHistoryHost}
          />
        )}
      </section>
    ) : null
  ) : publishRouteBootstrap ? (
    <CodeFileHistoryPanel
      copy={copy}
      selectedPath={resolvedPath}
      entries={fileHistoryQuery.data ?? []}
      isLoading={fileHistoryQuery.isPending}
      error={fileHistoryQuery.error instanceof Error ? fileHistoryQuery.error : null}
    />
  ) : null;
}

function CodePropertiesToggle(props: Parameters<typeof CodeViewWorkbench>[0]) {
  const {
    isProjectWorkspace,
    copy,
    propertiesOpen,
    propertiesId,
    setInspectedReference,
    setPropertiesOpen,
  } = props;
  return isProjectWorkspace ? (
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
  ) : null;
}

function resolveCodeFileAuthority(
  isDbtProjectFiles: boolean,
  graphAuthority:
    | NonNullable<ReturnType<typeof useWorkspaceGraphForViewQuery>['data']>['authoringAuthority']
    | undefined
) {
  if (isDbtProjectFiles) return 'dbt-project-files' as const;
  if (graphAuthority?.kind === 'resolved')
    return graphAuthority.binding.authority.kind === 'graph-draft'
      ? ('graph-draft' as const)
      : ('missing' as const);
  if (graphAuthority?.kind === 'unresolved' && graphAuthority.reason === 'mixed_authority')
    return 'mixed' as const;
  return 'missing' as const;
}

function resolveCodeFilePropertiesMessage({
  pending,
  errorTitle,
  selectedFile,
  copy,
}: Readonly<{
  pending: boolean;
  errorTitle: string | undefined;
  selectedFile: FileContent | undefined;
  copy: ReturnType<typeof resolveCodeViewCopy>;
}>) {
  if (pending) return { text: copy.previewLoadingMessage, error: false };
  if (errorTitle !== undefined) return { text: errorTitle, error: true };
  return selectedFile == null ? { text: copy.previewEmptyMessage, error: false } : null;
}

function resolveCodeViewFileTree({
  entries,
  fileScope,
  graph,
}: Readonly<{
  entries: NonNullable<ReturnType<typeof useWorkspaceFileTreeQuery>['data']>;
  fileScope: CodeViewFileScope | undefined;
  graph: Parameters<typeof resolveGraphScopedCodeWorkspaceFileTree>[0]['graph'];
}>) {
  if (fileScope?.kind === 'dbt-project-files')
    return resolveProjectRootScopedCodeWorkspaceFileTree(entries, fileScope.projectRoot);
  if (fileScope?.kind === 'workspace-files') return entries;
  return resolveGraphScopedCodeWorkspaceFileTree({ entries, graph });
}

function resolveCodeViewPath({
  entries,
  selectedPath,
  fileScope,
  preferredPath,
}: Readonly<{
  entries: Parameters<typeof hasCodeWorkspaceFilePath>[0];
  selectedPath: string | undefined;
  fileScope: CodeViewFileScope | undefined;
  preferredPath: string | undefined;
}>) {
  if (hasCodeWorkspaceFilePath(entries, selectedPath)) return selectedPath;
  if (fileScope?.kind === 'dbt-project-files')
    return resolveInitialDbtProjectFilePath(entries, {
      projectRoot: fileScope.projectRoot,
      preferredPath,
    });
  return resolveInitialCodeFilePath(entries);
}
