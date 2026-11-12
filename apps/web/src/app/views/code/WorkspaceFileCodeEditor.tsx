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
import { useCodeInlineReferences, type CodeInlineReferenceState } from './useCodeInlineReferences';
import type { CodeInlineReferenceDetail } from './codeInlineReferences';
import { CodeModelCommands } from './CodeModelCommands';
import {
  useWorkspaceFileEditorSession,
  type WorkspaceFileSessionInput,
} from './useWorkspaceFileEditorSession';
import { useCodeReferenceInspection } from './useCodeReferenceInspection';
import {
  resolveCodeEditorStatusCopy,
  resolveCodeInlineStatusMessage,
} from './codeEditorStatusPresentation';
import { resolveWorkspaceFileEditorPresentation } from './workspaceFileEditorPresentation';
import { WorkspaceFileCodeEditorView } from './WorkspaceFileCodeEditorView';

export type WorkspaceFileCodeEditorHandle = Readonly<{ flush: () => Promise<boolean> }>;
export type WorkspaceFileCodeEditorProps = WorkspaceFileSessionInput &
  Readonly<{
    className?: string;
    fillAvailableSpace?: boolean;
    headerActions?: ReactNode;
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
  const { fileQuery, posture, acceptedFile, context, workingTree, retry, reload } =
    useWorkspaceFileEditorSession(props);
  const references = useCodeInlineReferences({
    project: context.project,
    file: acceptedFile,
    value: workingTree.value,
    enabled: workingTree.phase === 'synchronized',
  });
  const inlineState: CodeInlineReferenceState =
    context.status === 'checking' || context.status === 'unavailable'
      ? { kind: context.status }
      : references.state;
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
  return (
    <WorkspaceFileCodeEditorView
      path={path}
      className={props.className}
      fillAvailableSpace={fillAvailableSpace}
      headerActions={props.headerActions}
      copy={copy}
      surface={presentation.surface}
      navigation={{ blocked: workingTree.navigationBlocked, flush: workingTree.flush }}
      editor={{
        posture,
        value: workingTree.value,
        onChange: changeValue,
        inlineReferences: inspection.inlineReferences,
        onInspectReference: inspection.inspect,
      }}
      analysisAction={
        context.status === 'ready' && references.state.kind !== 'inactive'
          ? {
              label: inlineCopy.analyzeLabel,
              enabled: references.canAnalyze,
              onAnalyze: references.analyze,
            }
          : undefined
      }
      executionCommands={
        context.project !== undefined && acceptedFile !== undefined ? (
          <CodeModelCommands
            file={acceptedFile}
            project={context.project}
            synchronized={
              workingTree.phase === 'synchronized' && workingTree.value === acceptedFile.content
            }
          />
        ) : undefined
      }
      message={presentation.inlineMessagePlacement === 'status-band' ? undefined : inlineMessage}
      status={
        presentation.statusPhase === undefined
          ? undefined
          : {
              phase: presentation.statusPhase,
              copy: resolveCodeEditorStatusCopy(copy, posture, inlineMessage),
              onRetry: () => void retry(),
              onReload: reload,
            }
      }
      details={
        onInspectReference == null && inspection.localReference != null
          ? { reference: inspection.localReference, copy: inlineCopy, onClose: inspection.close }
          : undefined
      }
    />
  );
});
