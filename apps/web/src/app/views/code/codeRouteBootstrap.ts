/** Owned concern: publish Code workbench file-loading posture into the route bootstrap contract. */
import {
  createCompleteRouteBootstrapPresentation,
  createFailedRouteBootstrapPresentation,
  createPendingRouteBootstrapPresentation,
  type RouteBootstrapPresentation,
} from '../../bootstrap/routeBootstrapContract';

type CodeRouteBootstrapArgs = {
  isLoadingFileTree: boolean;
  fileTreeErrorMessage: string | null;
  hasWorkspaceFiles: boolean;
  isLoadingFilePreview: boolean;
  filePreviewErrorMessage: string | null;
};

export function deriveCodeRouteBootstrapPresentation({
  isLoadingFileTree,
  fileTreeErrorMessage,
  hasWorkspaceFiles,
  isLoadingFilePreview,
  filePreviewErrorMessage,
}: CodeRouteBootstrapArgs): RouteBootstrapPresentation {
  if (isLoadingFileTree) {
    return createPendingRouteBootstrapPresentation('Loading workspace files for the code route');
  }

  if (fileTreeErrorMessage) {
    return createFailedRouteBootstrapPresentation(fileTreeErrorMessage);
  }

  if (!hasWorkspaceFiles) {
    return createCompleteRouteBootstrapPresentation('Code route is ready with no workspace files');
  }

  if (isLoadingFilePreview) {
    return createPendingRouteBootstrapPresentation(
      'Loading the initial file preview for the code route'
    );
  }

  if (filePreviewErrorMessage) {
    return createFailedRouteBootstrapPresentation(filePreviewErrorMessage);
  }

  return createCompleteRouteBootstrapPresentation('Code route is ready');
}
