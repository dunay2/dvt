/** Project Code editor contributions from its accepted session; acquire no ports or lifetime. */
import type { ComponentProps, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import type { CodeInlineReferenceDetail } from './codeInlineReferences';
import type { CodeInlineReferenceState, useCodeInlineReferences } from './useCodeInlineReferences';
import type { useWorkspaceFileEditorSession } from './useWorkspaceFileEditorSession';
import type { useCodeReferenceInspection } from './useCodeReferenceInspection';
import type { useOperationSqlCompilation } from './useOperationSqlCompilation';
import type { resolveCodeViewCopy, resolveCodeInlineReferenceCopy } from './codeViewCopy';
import {
  resolveCodeEditorStatusCopy,
  type resolveCodeInlineStatusMessage,
} from './codeEditorStatusPresentation';
import type { WorkspaceFileEditorPresentation } from './workspaceFileEditorPresentation';
import type { WorkspaceFileCodeEditorView } from './WorkspaceFileCodeEditorView';
import { CodeFileVersionHistory } from './CodeFileVersionHistory';
import { CodeModelCommands } from './CodeModelCommands';
import {
  OperationSqlCompileAction,
  OperationSqlCompileFeedback,
} from './OperationSqlCompileAction';

type EditorSession = ReturnType<typeof useWorkspaceFileEditorSession>;
type ViewProps = ComponentProps<typeof WorkspaceFileCodeEditorView>;

export type WorkspaceFileEditorContributionsInput = Readonly<{
  session: EditorSession;
  references: ReturnType<typeof useCodeInlineReferences>;
  inspection: ReturnType<typeof useCodeReferenceInspection>;
  operation: ReturnType<typeof useOperationSqlCompilation>;
  presentation: WorkspaceFileEditorPresentation;
  copy: ReturnType<typeof resolveCodeViewCopy>;
  inlineCopy: ReturnType<typeof resolveCodeInlineReferenceCopy>;
  inlineMessage: ReturnType<typeof resolveCodeInlineStatusMessage>;
  changeValue: (value: string) => void;
  fileHistoryHost: HTMLElement | null | undefined;
  headerActions: ReactNode;
  onInspectReference: ((reference: CodeInlineReferenceDetail | undefined) => void) | undefined;
}>;

export function projectWorkspaceInlineReferenceState(
  context: EditorSession['context'],
  state: CodeInlineReferenceState
): CodeInlineReferenceState {
  if (context.status === 'checking') return { kind: 'checking' };
  if (context.status === 'unavailable') return { kind: 'unavailable' };
  return state;
}

export function readOperationSqlFilePath(
  posture: EditorSession['posture'],
  surface: WorkspaceFileEditorPresentation['surface'],
  workingPath: string | undefined
): string | undefined {
  if (posture.kind !== 'editable') return undefined;
  if (surface.kind !== 'file') return undefined;
  if (surface.file.path !== workingPath) return undefined;
  return surface.file.path;
}

export function projectWorkspaceFileEditorContributions(
  input: WorkspaceFileEditorContributionsInput
): Pick<
  ViewProps,
  | 'headerActions'
  | 'editor'
  | 'analysisAction'
  | 'executionCommands'
  | 'message'
  | 'status'
  | 'details'
> {
  const { operation, copy, headerActions, presentation, inlineMessage } = input;
  return {
    headerActions: (
      <>
        {operation.available && (
          <OperationSqlCompileAction
            copy={copy}
            result={operation.result}
            onCompile={operation.compile}
          />
        )}
        {headerActions}
        {renderWorkspaceFileHistory(input)}
      </>
    ),
    editor: projectEditorContent(input),
    analysisAction: projectAnalysisAction(input),
    executionCommands: renderWorkspaceExecutionCommands(input),
    message: presentation.inlineMessagePlacement === 'status-band' ? undefined : inlineMessage,
    status: projectEditorStatus(input),
    details: projectReferenceDetail(input),
  };
}

function renderWorkspaceFileHistory({
  session,
  presentation,
  fileHistoryHost,
  copy,
  changeValue,
}: WorkspaceFileEditorContributionsInput): ReactNode {
  if (!fileHistoryHost) return null;
  if (session.posture.kind !== 'editable') return null;
  if (presentation.surface.kind !== 'file') return null;
  const file = presentation.surface.file;
  const { acceptedFile, workingTree } = session;
  return createPortal(
    <CodeFileVersionHistory
      key={file.path}
      copy={copy}
      path={file.path}
      language={file.language}
      value={workingTree.value}
      synchronized={
        acceptedFile !== undefined &&
        workingTree.filePath === file.path &&
        workingTree.phase === 'synchronized'
      }
      onRestore={changeValue}
    />,
    fileHistoryHost
  );
}

function projectEditorContent({
  session,
  inspection,
  operation,
  changeValue,
}: WorkspaceFileEditorContributionsInput): ViewProps['editor'] {
  return {
    posture: session.posture,
    value: session.workingTree.value,
    onChange: changeValue,
    inlineReferences: inspection.inlineReferences,
    diagnostics: operation.result?.kind === 'invalid' ? operation.result.diagnostics : undefined,
    onInspectReference: inspection.inspect,
  };
}

function projectAnalysisAction({
  session,
  references,
  inlineCopy,
}: WorkspaceFileEditorContributionsInput): ViewProps['analysisAction'] {
  if (session.context.status !== 'ready') return undefined;
  if (references.state.kind === 'inactive') return undefined;
  return {
    label: inlineCopy.analyzeLabel,
    enabled: references.canAnalyze,
    onAnalyze: references.analyze,
  };
}

function renderWorkspaceExecutionCommands({
  operation,
  session,
  copy,
}: WorkspaceFileEditorContributionsInput): ReactNode {
  if (operation.available)
    return <OperationSqlCompileFeedback copy={copy} result={operation.result} />;
  const { context, acceptedFile, workingTree } = session;
  if (context.project === undefined) return undefined;
  if (acceptedFile === undefined) return undefined;
  return (
    <CodeModelCommands
      file={acceptedFile}
      project={context.project}
      synchronized={
        workingTree.phase === 'synchronized' && workingTree.value === acceptedFile.content
      }
    />
  );
}

function projectEditorStatus({
  session,
  presentation,
  copy,
  inlineMessage,
}: WorkspaceFileEditorContributionsInput): ViewProps['status'] {
  if (presentation.statusPhase === undefined) return undefined;
  return {
    phase: presentation.statusPhase,
    copy: resolveCodeEditorStatusCopy(copy, session.posture, inlineMessage),
    onRetry: () => void session.retry(),
    onReload: session.reload,
  };
}

function projectReferenceDetail({
  onInspectReference,
  inspection,
  inlineCopy,
}: WorkspaceFileEditorContributionsInput): ViewProps['details'] {
  if (onInspectReference != null) return undefined;
  if (inspection.localReference == null) return undefined;
  return { reference: inspection.localReference, copy: inlineCopy, onClose: inspection.close };
}
