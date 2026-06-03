import { codeViewCopy, type CodeViewCopy } from './codeViewCopy';
import { WorkspaceFileLoadError } from '../../services/workspace/workspaceErrors';

export type CodeWorkbenchErrorKind =
  | 'workspace-tree-unavailable'
  | 'file-preview-unavailable'
  | 'file-missing';

export type CodeWorkbenchErrorPresentation = {
  kind: CodeWorkbenchErrorKind;
  title: string;
  message: string;
  selectedPath?: string;
};

type ResolveCodeWorkbenchErrorArgs = {
  scope: 'file-tree' | 'file-preview';
  error: unknown;
  copy?: CodeViewCopy;
  selectedPath?: string;
};

export function resolveCodeWorkbenchErrorPresentation({
  scope,
  error,
  copy = codeViewCopy,
  selectedPath,
}: ResolveCodeWorkbenchErrorArgs): CodeWorkbenchErrorPresentation {
  if (scope === 'file-tree') {
    return {
      kind: 'workspace-tree-unavailable',
      title: copy.routeErrorTitle,
      message: copy.routeErrorMessage,
    };
  }

  if (error instanceof WorkspaceFileLoadError && error.kind === 'not_found') {
    return {
      kind: 'file-missing',
      title: copy.previewMissingTitle,
      message: copy.previewMissingMessagePrefix,
      selectedPath: error.path,
    };
  }

  return {
    kind: 'file-preview-unavailable',
    title: copy.previewErrorTitle,
    message: copy.previewErrorMessage,
    ...(selectedPath ? { selectedPath } : {}),
  };
}
