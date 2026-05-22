/**
 * Typed query key registry for TanStack React Query.
 *
 * All query keys used in the application should be defined here so that
 * invalidation, prefetching, and cache management can be reasoned about
 * from a single location.
 */

export const queryKeys = {
  // -------------------------------------------------------------------------
  // Shell
  // -------------------------------------------------------------------------
  shell: {
    platformHealthSnapshot: () => ['shell', 'platform-health', 'snapshot'] as const,
    capabilities: () => ['shell', 'capabilities'] as const,
  },

  // -------------------------------------------------------------------------
  // Workspace
  // -------------------------------------------------------------------------
  workspace: {
    graph: (workspaceLayoutKey: string) => ['workspace', 'graph', workspaceLayoutKey] as const,
    graphDraft: (workspaceLayoutKey: string) =>
      ['workspace', 'graph-draft', workspaceLayoutKey] as const,
    graphDraftTransport: (workspaceLayoutKey: string) =>
      ['workspace', 'graph-draft-transport', workspaceLayoutKey] as const,
    graphForView: (viewId: string) => ['workspace', 'graph', viewId] as const,
    diffChanges: () => ['workspace', 'diff-changes'] as const,
    roles: () => ['workspace', 'roles'] as const,
    audit: () => ['workspace', 'audit'] as const,
    fileTree: () => ['workspace', 'file-tree'] as const,
    fileContent: (path: string) => ['workspace', 'file-content', path] as const,
    fileHistory: (path: string) => ['workspace', 'file-history', path] as const,
    artifacts: () => ['workspace', 'artifacts'] as const,
  },

  // -------------------------------------------------------------------------
  // Runs
  // -------------------------------------------------------------------------
  runs: {
    summaries: (workspaceLayoutKey: string) => ['runs', 'summaries', workspaceLayoutKey] as const,
    workspace: (workspaceLayoutKey: string, runId: string | undefined) =>
      ['runs', 'workspace', workspaceLayoutKey, runId] as const,
    snapshot: (workspaceLayoutKey: string, runId: string | undefined) =>
      ['runs', 'snapshot', workspaceLayoutKey, runId] as const,
    list: (viewId: string) => ['runs', 'list', viewId] as const,
    consoleLogStream: (runId: string | undefined) => ['runs', 'console-log-stream', runId] as const,
  },
} as const;
