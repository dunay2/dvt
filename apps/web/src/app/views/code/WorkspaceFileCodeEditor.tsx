/**
 * Owned concern: compose accepted file and reference lifetimes into the Code editor boundary.
 * @baseline ADR-0060: authority and persisted revision precede edit or execution admission.
 * @decision Delegate visible-state projection and passive DOM; retain the existing session owners.
 * @consequence Layout changes do not alter file recovery, reference queries or execution authority.
 */
import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import { useSessionContext } from '../../services/AppServicesContext';
import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';
import { resolveCodeViewCopy, resolveCodeInlineReferenceCopy } from './codeViewCopy';
import { resolveCodeWorkbenchErrorPresentation } from './codeWorkbenchErrorModel';
import { useCodeInlineReferences } from './useCodeInlineReferences';
import type { CodeInlineReferenceDetail } from './codeInlineReferences';
import {
  useWorkspaceFileEditorSession,
  type WorkspaceFileSessionInput,
} from './useWorkspaceFileEditorSession';
import { useCodeReferenceInspection } from './useCodeReferenceInspection';
import { resolveCodeInlineStatusMessage } from './codeEditorStatusPresentation';
import { resolveWorkspaceFileEditorPresentation } from './workspaceFileEditorPresentation';
import { WorkspaceFileCodeEditorView } from './WorkspaceFileCodeEditorView';
import { useOperationSqlCompilation } from './useOperationSqlCompilation';
import {
  projectWorkspaceInlineReferenceState,
  readOperationSqlFilePath,
  projectWorkspaceFileEditorContributions,
} from './workspaceFileEditorContributions';

export type WorkspaceFileCodeEditorHandle = Readonly<{ flush: () => Promise<boolean> }>;
export type WorkspaceFileCodeEditorProps = WorkspaceFileSessionInput &
  Readonly<{
    className?: string;
    fillAvailableSpace?: boolean;
    headerActions?: ReactNode;
    fileHistoryHost?: HTMLElement | null;
    onInspectReference?: (reference: CodeInlineReferenceDetail | undefined) => void;
  }>;

export const WorkspaceFileCodeEditor = forwardRef<
  WorkspaceFileCodeEditorHandle,
  WorkspaceFileCodeEditorProps
>(function WorkspaceFileCodeEditor(props, ref) {
  const session = useSessionContext();
  const scope = useSyncExternalStore(
    session.subscribeWorkspaceScope,
    session.getWorkspaceScopeSnapshot
  );
  const identity = JSON.stringify([
    scope.tenantId,
    scope.projectId,
    scope.environmentId,
    scope.targetAdapter,
  ]);
  return <WorkspaceFileCodeEditorSession key={identity} {...props} ref={ref} />;
});

const WorkspaceFileCodeEditorSession = forwardRef<
  WorkspaceFileCodeEditorHandle,
  WorkspaceFileCodeEditorProps
>(function WorkspaceFileCodeEditorSession(props, ref) {
  const { path, fillAvailableSpace = false, onInspectReference } = props;
  const language = useApplicationLanguageStore((state) => state.language);
  const copy = useMemo(() => resolveCodeViewCopy(language), [language]);
  const inlineCopy = useMemo(() => resolveCodeInlineReferenceCopy(language), [language]);
  const fileSession = useWorkspaceFileEditorSession(props);
  const { fileQuery, posture, acceptedFile, context, workingTree } = fileSession;
  const references = useCodeInlineReferences({
    project: context.project,
    file: acceptedFile,
    value: workingTree.value,
    enabled: workingTree.phase === 'synchronized',
  });
  const inlineState = projectWorkspaceInlineReferenceState(context, references.state);
  const inspection = useCodeReferenceInspection(inlineState, inlineCopy, onInspectReference);
  const changeValue = useCallback(
    (value: string) => {
      if (posture.kind !== 'editable') return;
      inspection.clear();
      workingTree.updateValue(value);
    },
    [inspection.clear, posture.kind, workingTree.updateValue]
  );
  useImperativeHandle(ref, () => ({ flush: workingTree.flush }), [workingTree.flush]);
  const presentation = resolveWorkspaceFileEditorPresentation({
    path,
    file: fileQuery.data,
    isPending: fileQuery.isPending,
    posture,
    phase: workingTree.phase,
    navigationBlocked: workingTree.navigationBlocked,
    error: fileQuery.isError
      ? resolveCodeWorkbenchErrorPresentation({
          scope: 'file-preview',
          error: fileQuery.error,
          copy,
          selectedPath: path,
        })
      : null,
  });
  const inlineMessage = resolveCodeInlineStatusMessage(
    inlineState,
    inlineCopy,
    context.status === 'checking',
    references.isReanalyzing
  );
  const operation = useOperationSqlCompilation(
    readOperationSqlFilePath(posture, presentation.surface, workingTree.filePath),
    workingTree.value
  );
  const contributions = projectWorkspaceFileEditorContributions({
    session: fileSession,
    references,
    inspection,
    operation,
    presentation,
    copy,
    inlineCopy,
    inlineMessage,
    changeValue,
    fileHistoryHost: props.fileHistoryHost,
    headerActions: props.headerActions,
    onInspectReference,
  });
  return (
    <WorkspaceFileCodeEditorView
      path={path}
      className={props.className}
      fillAvailableSpace={fillAvailableSpace}
      copy={copy}
      surface={presentation.surface}
      navigation={{ blocked: workingTree.navigationBlocked, flush: workingTree.flush }}
      {...contributions}
    />
  );
});
