import { PROJECT_ONBOARDING_DEFAULT_ENVIRONMENT_ID } from '@dvt/contracts';

import { AUTHORIZATION_ACTION, AUTHORIZATION_ACTION_NAME } from '../ports/accessDecision.js';

export const PROJECT_ONBOARDING_POLICY = Object.freeze({
  createAction: AUTHORIZATION_ACTION.projectCreate,
  defaultEnvironmentId: PROJECT_ONBOARDING_DEFAULT_ENVIRONMENT_ID,
  creatorWorkspaceActions: Object.freeze([
    AUTHORIZATION_ACTION_NAME.workspaceGraphDraftView,
    AUTHORIZATION_ACTION_NAME.workspaceGraphDraftSave,
    AUTHORIZATION_ACTION_NAME.workspaceFilesView,
    AUTHORIZATION_ACTION_NAME.workspaceFilesSave,
    AUTHORIZATION_ACTION_NAME.workspaceSourceImportView,
    AUTHORIZATION_ACTION_NAME.workspaceSourceConnectionCreate,
    AUTHORIZATION_ACTION_NAME.workspaceSourceConnectionRename,
    AUTHORIZATION_ACTION_NAME.workspaceSourceConnectionTest,
    AUTHORIZATION_ACTION_NAME.workspaceSourceImportImport,
    AUTHORIZATION_ACTION_NAME.workspaceSourceImportRebind,
    AUTHORIZATION_ACTION_NAME.workspacePluginsView,
  ]),
});

export function isCreatorWorkspaceActionGranted(
  allowedActions: readonly string[],
  actionName: string
): boolean {
  if (allowedActions.includes(actionName)) {
    return true;
  }

  return (
    actionName === AUTHORIZATION_ACTION_NAME.workspaceSourceConnectionRename &&
    PROJECT_ONBOARDING_POLICY.creatorWorkspaceActions
      .filter(
        (requiredAction) =>
          requiredAction !== AUTHORIZATION_ACTION_NAME.workspaceSourceConnectionRename
      )
      .every((requiredAction) => allowedActions.includes(requiredAction))
  );
}
