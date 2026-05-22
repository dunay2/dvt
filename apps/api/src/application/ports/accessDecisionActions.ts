/**
 * Owned concern: define protected API authorization action names and command/query
 * action discriminants.
 */

export const AUTHORIZATION_ACTION_NAME = {
  runStart: 'run:start',
  runCancel: 'run:cancel',
  runRetry: 'run:retry',
  runSignal: 'run:signal',
  workspaceGraphDraftSave: 'workspace:graph-draft:save',
  adminRebuildSnapshot: 'admin:rebuild-snapshot',
  runView: 'run:view',
  runList: 'run:list',
  runLogsView: 'run:logs:view',
  workspaceGraphDraftView: 'workspace:graph-draft:view',
  workspaceFilesView: 'workspace:files:view',
  workspaceDiffView: 'workspace:diff:view',
} as const;

export type CommandAuthorizationActionName =
  | typeof AUTHORIZATION_ACTION_NAME.runStart
  | typeof AUTHORIZATION_ACTION_NAME.runCancel
  | typeof AUTHORIZATION_ACTION_NAME.runRetry
  | typeof AUTHORIZATION_ACTION_NAME.runSignal
  | typeof AUTHORIZATION_ACTION_NAME.workspaceGraphDraftSave
  | typeof AUTHORIZATION_ACTION_NAME.adminRebuildSnapshot;

export type QueryAuthorizationActionName =
  | typeof AUTHORIZATION_ACTION_NAME.runView
  | typeof AUTHORIZATION_ACTION_NAME.runList
  | typeof AUTHORIZATION_ACTION_NAME.runLogsView
  | typeof AUTHORIZATION_ACTION_NAME.workspaceGraphDraftView
  | typeof AUTHORIZATION_ACTION_NAME.workspaceFilesView
  | typeof AUTHORIZATION_ACTION_NAME.workspaceDiffView;

export type AuthorizationAction =
  | {
      readonly kind: 'command';
      readonly name: CommandAuthorizationActionName;
    }
  | {
      readonly kind: 'query';
      readonly name: QueryAuthorizationActionName;
    };

export type CommandAuthorizationAction = Extract<AuthorizationAction, { readonly kind: 'command' }>;

export type QueryAuthorizationAction = Extract<AuthorizationAction, { readonly kind: 'query' }>;

export const AUTHORIZATION_ACTION = {
  runStart: {
    kind: 'command',
    name: AUTHORIZATION_ACTION_NAME.runStart,
  },
  runCancel: {
    kind: 'command',
    name: AUTHORIZATION_ACTION_NAME.runCancel,
  },
  runRetry: {
    kind: 'command',
    name: AUTHORIZATION_ACTION_NAME.runRetry,
  },
  runSignal: {
    kind: 'command',
    name: AUTHORIZATION_ACTION_NAME.runSignal,
  },
  workspaceGraphDraftSave: {
    kind: 'command',
    name: AUTHORIZATION_ACTION_NAME.workspaceGraphDraftSave,
  },
  adminRebuildSnapshot: {
    kind: 'command',
    name: AUTHORIZATION_ACTION_NAME.adminRebuildSnapshot,
  },
  runView: {
    kind: 'query',
    name: AUTHORIZATION_ACTION_NAME.runView,
  },
  runList: {
    kind: 'query',
    name: AUTHORIZATION_ACTION_NAME.runList,
  },
  runLogsView: {
    kind: 'query',
    name: AUTHORIZATION_ACTION_NAME.runLogsView,
  },
  workspaceGraphDraftView: {
    kind: 'query',
    name: AUTHORIZATION_ACTION_NAME.workspaceGraphDraftView,
  },
  workspaceFilesView: {
    kind: 'query',
    name: AUTHORIZATION_ACTION_NAME.workspaceFilesView,
  },
  workspaceDiffView: {
    kind: 'query',
    name: AUTHORIZATION_ACTION_NAME.workspaceDiffView,
  },
} as const satisfies Readonly<Record<string, AuthorizationAction>>;
