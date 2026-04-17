import {
  createCompleteRouteBootstrapPresentation,
  createErrorRouteBootstrapPresentation,
  createPendingRouteBootstrapPresentation,
  createPublishedRouteBootstrapHandle,
  type RouteBootstrapPresentation,
} from '../../bootstrap/routeBootstrapPresentation';

export const CODE_ROUTE_BOOTSTRAP_HANDLE = createPublishedRouteBootstrapHandle({
  pendingDetail: 'Preparing Code route',
});

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
    return createPendingRouteBootstrapPresentation(
      'Loading workspace files for the code route'
    );
  }

  if (fileTreeErrorMessage) {
    return createErrorRouteBootstrapPresentation(fileTreeErrorMessage);
  }

  if (!hasWorkspaceFiles) {
    return createCompleteRouteBootstrapPresentation(
      'Code route is ready with no workspace files'
    );
  }

  if (isLoadingFilePreview) {
    return createPendingRouteBootstrapPresentation(
      'Loading the initial file preview for the code route'
    );
  }

  if (filePreviewErrorMessage) {
    return createErrorRouteBootstrapPresentation(filePreviewErrorMessage);
  }

  return createCompleteRouteBootstrapPresentation('Code route is ready');
}
