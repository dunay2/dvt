/**
 * Owned concern: bind Code execution lifetime to its accepted file and complete workspace identity.
 * @baseline ADR-0060: a file model cannot borrow a Canvas instance's execution readiness.
 * @decision React keys retire compilation state when authority, scope, target or bytes change.
 * @consequence Late responses for a retired editor session cannot authorize the next session.
 * @version 1.0.0
 */
import type { DbtProjectGraphProjection } from '@dvt/contracts';
import { useRef, useSyncExternalStore } from 'react';

import type { FileContent } from '../../ports/workspace';
import { useSessionContext } from '../../services/AppServicesContext';
import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';
import { useAuthorizationStore } from '../../stores/authorizationStore';
import { resolveCodeSelectedModel } from './codeInlineReferences';
import { CodeModelCommandBar } from './CodeModelCommandBar';
import { useCodeModelExecution } from './useCodeModelExecution';
import { CodeRunParametersDialog } from './CodeRunParametersDialog';
import { resolveCodeModelCommandCopy } from './codeViewCopy';

export function CodeModelCommands({
  file,
  project,
  synchronized,
}: Readonly<{
  file: FileContent;
  project: DbtProjectGraphProjection;
  synchronized: boolean;
}>) {
  const session = useSessionContext();
  const scope = useSyncExternalStore(
    session.subscribeWorkspaceScope,
    session.getWorkspaceScopeSnapshot
  );
  const permissions = useAuthorizationStore((state) => state.userPermissions);
  const modelId = resolveCodeSelectedModel(project, file.path);
  if (file.language.toLowerCase() !== 'sql' || modelId === undefined) return null;
  const identity = JSON.stringify([
    scope.tenantId,
    scope.projectId,
    scope.environmentId,
    scope.targetAdapter,
    project.authorityBinding,
    project.projectRevision.contentSetSha256,
    project.analysisSha256,
    project.executionTarget,
    file.path,
    file.contentSha256,
    modelId,
    synchronized,
    permissions.canPlan,
    permissions.canRun,
  ]);
  return (
    <CodeModelCommandSession
      key={identity}
      file={file}
      project={project}
      modelId={modelId}
      synchronized={synchronized}
    />
  );
}

function CodeModelCommandSession(
  props: Readonly<{
    file: FileContent;
    project: DbtProjectGraphProjection;
    modelId: string;
    synchronized: boolean;
  }>
) {
  const execution = useCodeModelExecution(props);
  const language = useApplicationLanguageStore((state) => state.language);
  const compileButton = useRef<HTMLButtonElement>(null);
  const executeButton = useRef<HTMLButtonElement>(null);
  const parametersButton = useRef<HTMLButtonElement>(null);
  const modelName =
    props.project.nodes.find((node) => node.uniqueId === props.modelId)?.name ?? props.modelId;
  return (
    <>
      <CodeModelCommandBar
        {...execution}
        compileRef={compileButton}
        executeRef={executeButton}
        parametersRef={parametersButton}
        language={language}
        modelName={modelName}
        synchronized={props.synchronized}
      />
      {execution.dialog && execution.parameters && (
        <CodeRunParametersDialog
          command={execution.dialog}
          definitions={execution.parameters}
          modelName={modelName}
          environmentId={execution.environmentId}
          copy={resolveCodeModelCommandCopy(language)}
          overrides={execution.overrides}
          busy={execution.phase !== 'idle'}
          onCancel={execution.cancel}
          onConfirm={execution.confirm}
          returnFocus={() => {
            const triggers = {
              compile: compileButton,
              execute: executeButton,
              parameters: parametersButton,
            };
            if (execution.dialog) triggers[execution.dialog].current?.focus();
          }}
        />
      )}
    </>
  );
}
