/**
 * Owned concern: translate typed Code file failures into safe localized presentation.
 * @decision Classify stable error types once; never interpret provider diagnostic prose.
 * @consequence Missing and changed files retain actionable messages without leaking details.
 */
import { codeViewCopy, type CodeViewCopy } from './codeViewCopy';
import { classifyHttpError } from '../../services/api/classifyHttpError';
import type { FileCreationError } from './workspaceFileCreationModel';
import {
  WorkspaceFileLoadError,
  WorkspaceFileRevisionConflictError,
} from '../../services/workspace/workspaceErrors';

/** Map command failures to safe presentation reasons through the shared transport classifier. */
export function resolveCodeFileCreationFailure(
  error: unknown
): Extract<FileCreationError, 'conflict' | 'forbidden' | 'unavailable'> {
  if (error instanceof WorkspaceFileRevisionConflictError) return 'conflict';
  const kind = classifyHttpError(error);
  return kind === 'auth-required' || kind === 'access-denied' ? 'forbidden' : 'unavailable';
}

export type CodeWorkbenchErrorKind =
  | 'workspace-tree-unavailable'
  | 'file-preview-unavailable'
  | 'file-missing'
  | 'file-revision-conflict';

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

  if (error instanceof WorkspaceFileRevisionConflictError) {
    return {
      kind: 'file-revision-conflict',
      title: copy.workingTreeConflictLabel,
      message: copy.workingTreeConflictMessage,
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
