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
    dbtProjectGraph: (
      tenantId: string,
      projectId: string,
      environmentId: string,
      canvasId: string,
      projectRoot: string
    ) =>
      [
        'workspace',
        'dbt-project-graph',
        tenantId,
        projectId,
        environmentId,
        canvasId,
        projectRoot,
      ] as const,
    diffChanges: () => ['workspace', 'diff-changes'] as const,
    plugins: () => ['workspace', 'plugins'] as const,
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
    eventFeed: (runId: string | undefined) => ['runs', 'event-feed', runId] as const,
    list: (viewId: string) => ['runs', 'list', viewId] as const,
  },

  // -------------------------------------------------------------------------
  // Cost attribution
  // -------------------------------------------------------------------------
  cost: {
    attributionSummary: (
      tenantId: string,
      projectId: string | null,
      environmentId: string | null,
      limit: number
    ) => ['cost', 'attribution-summary', tenantId, projectId, environmentId, limit] as const,
  },
} as const;
