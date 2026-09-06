/**
 * Owned concern: define protected API authorization action names and command/query
 * action discriminants.
 */

export const AUTHORIZATION_ACTION_NAME = {
  projectCreate: 'project:create',
  runStart: 'run:start',
  runCancel: 'run:cancel',
  runRetry: 'run:retry',
  runSignal: 'run:signal',
  workspaceGraphDraftSave: 'workspace:graph-draft:save',
  workspaceFilesSave: 'workspace:files:save',
  workspaceSourceConnectionCreate: 'workspace:source-connection:create',
  workspaceSourceConnectionRename: 'workspace:source-connection:rename',
  workspaceSourceConnectionTest: 'workspace:source-connection:test',
  workspaceSourceImportImport: 'workspace:source-import:import',
  workspaceSourceImportRebind: 'workspace:source-import:rebind',
  adminRebuildSnapshot: 'admin:rebuild-snapshot',
  runView: 'run:view',
  runList: 'run:list',
  runLogsView: 'run:logs:view',
  workspaceGraphDraftView: 'workspace:graph-draft:view',
  workspaceFilesView: 'workspace:files:view',
  workspaceDiffView: 'workspace:diff:view',
  workspaceSourceImportView: 'workspace:source-import:view',
  workspacePluginsView: 'workspace:plugins:view',
} as const;

export type CommandAuthorizationActionName =
  | typeof AUTHORIZATION_ACTION_NAME.projectCreate
  | typeof AUTHORIZATION_ACTION_NAME.runStart
  | typeof AUTHORIZATION_ACTION_NAME.runCancel
  | typeof AUTHORIZATION_ACTION_NAME.runRetry
  | typeof AUTHORIZATION_ACTION_NAME.runSignal
  | typeof AUTHORIZATION_ACTION_NAME.workspaceGraphDraftSave
  | typeof AUTHORIZATION_ACTION_NAME.workspaceFilesSave
  | typeof AUTHORIZATION_ACTION_NAME.workspaceSourceConnectionCreate
  | typeof AUTHORIZATION_ACTION_NAME.workspaceSourceConnectionRename
  | typeof AUTHORIZATION_ACTION_NAME.workspaceSourceConnectionTest
  | typeof AUTHORIZATION_ACTION_NAME.workspaceSourceImportImport
  | typeof AUTHORIZATION_ACTION_NAME.workspaceSourceImportRebind
  | typeof AUTHORIZATION_ACTION_NAME.adminRebuildSnapshot;

export type QueryAuthorizationActionName =
  | typeof AUTHORIZATION_ACTION_NAME.runView
  | typeof AUTHORIZATION_ACTION_NAME.runList
  | typeof AUTHORIZATION_ACTION_NAME.runLogsView
  | typeof AUTHORIZATION_ACTION_NAME.workspaceGraphDraftView
  | typeof AUTHORIZATION_ACTION_NAME.workspaceFilesView
  | typeof AUTHORIZATION_ACTION_NAME.workspaceDiffView
  | typeof AUTHORIZATION_ACTION_NAME.workspaceSourceImportView
  | typeof AUTHORIZATION_ACTION_NAME.workspacePluginsView;

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
  projectCreate: {
    kind: 'command',
    name: AUTHORIZATION_ACTION_NAME.projectCreate,
  },
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
  workspaceFilesSave: {
    kind: 'command',
    name: AUTHORIZATION_ACTION_NAME.workspaceFilesSave,
  },
  workspaceSourceConnectionCreate: {
    kind: 'command',
    name: AUTHORIZATION_ACTION_NAME.workspaceSourceConnectionCreate,
  },
  workspaceSourceConnectionRename: {
    kind: 'command',
    name: AUTHORIZATION_ACTION_NAME.workspaceSourceConnectionRename,
  },
  workspaceSourceConnectionTest: {
    kind: 'command',
    name: AUTHORIZATION_ACTION_NAME.workspaceSourceConnectionTest,
  },
  workspaceSourceImportImport: {
    kind: 'command',
    name: AUTHORIZATION_ACTION_NAME.workspaceSourceImportImport,
  },
  workspaceSourceImportRebind: {
    kind: 'command',
    name: AUTHORIZATION_ACTION_NAME.workspaceSourceImportRebind,
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
  workspaceSourceImportView: {
    kind: 'query',
    name: AUTHORIZATION_ACTION_NAME.workspaceSourceImportView,
  },
  workspacePluginsView: {
    kind: 'query',
    name: AUTHORIZATION_ACTION_NAME.workspacePluginsView,
  },
} as const satisfies Readonly<Record<string, AuthorizationAction>>;
