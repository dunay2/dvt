/** Owned concern: publish Code workbench file-loading posture into the route bootstrap contract. */
import {
  createCompleteRouteBootstrapPresentation,
  createFailedRouteBootstrapPresentation,
  createPendingRouteBootstrapPresentation,
  type RouteBootstrapPresentation,
} from '../../bootstrap/routeBootstrapContract';
import { codeViewCopy, type CodeViewCopy } from './codeViewCopy';

type CodeRouteBootstrapArgs = {
  isLoadingFileTree: boolean;
  fileTreeErrorMessage: string | null;
  hasWorkspaceFiles: boolean;
  isLoadingFilePreview: boolean;
  filePreviewErrorMessage: string | null;
};

export function deriveCodeRouteBootstrapPresentation(
  {
    isLoadingFileTree,
    fileTreeErrorMessage,
    hasWorkspaceFiles,
    isLoadingFilePreview,
    filePreviewErrorMessage,
  }: CodeRouteBootstrapArgs,
  copy: CodeViewCopy = codeViewCopy
): RouteBootstrapPresentation {
  if (isLoadingFileTree) {
    return createPendingRouteBootstrapPresentation(copy.bootstrapLoadingFilesDetail);
  }

  if (fileTreeErrorMessage) {
    return createFailedRouteBootstrapPresentation(fileTreeErrorMessage);
  }

  if (!hasWorkspaceFiles) {
    return createCompleteRouteBootstrapPresentation(copy.bootstrapNoWorkspaceFilesDetail);
  }

  if (isLoadingFilePreview) {
    return createPendingRouteBootstrapPresentation(copy.bootstrapLoadingPreviewDetail);
  }

  if (filePreviewErrorMessage) {
    return createFailedRouteBootstrapPresentation(filePreviewErrorMessage);
  }

  return createCompleteRouteBootstrapPresentation(copy.bootstrapReadyDetail);
}
