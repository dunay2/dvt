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
    graphDraft: (workspaceLayoutKey: string) =>
      ['workspace', 'graph-draft', workspaceLayoutKey] as const,
    graphForView: (workspaceLayoutKey: string, viewId: string) =>
      ['workspace', 'graph', workspaceLayoutKey, viewId] as const,
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
    diffChanges: (workspaceLayoutKey: string) =>
      ['workspace', 'diff-changes', workspaceLayoutKey] as const,
    plugins: (workspaceLayoutKey: string) => ['workspace', 'plugins', workspaceLayoutKey] as const,
    roles: (workspaceLayoutKey: string) => ['workspace', 'roles', workspaceLayoutKey] as const,
    audit: (workspaceLayoutKey: string) => ['workspace', 'audit', workspaceLayoutKey] as const,
    fileTree: (workspaceLayoutKey: string) =>
      ['workspace', 'file-tree', workspaceLayoutKey] as const,
    fileContent: (workspaceLayoutKey: string, path: string) =>
      ['workspace', 'file-content', workspaceLayoutKey, path] as const,
    fileHistory: (workspaceLayoutKey: string, path: string) =>
      ['workspace', 'file-history', workspaceLayoutKey, path] as const,
    artifacts: (workspaceLayoutKey: string) =>
      ['workspace', 'artifacts', workspaceLayoutKey] as const,
  },

  // -------------------------------------------------------------------------
  // Runs
  // -------------------------------------------------------------------------
  runs: {
    root: () => ['runs'] as const,
    summaries: (workspaceLayoutKey: string) => ['runs', 'summaries', workspaceLayoutKey] as const,
    snapshot: (workspaceLayoutKey: string, runId: string | undefined) =>
      ['runs', 'snapshot', workspaceLayoutKey, runId] as const,
    eventFeed: (workspaceLayoutKey: string, runId: string | undefined) =>
      ['runs', 'event-feed', workspaceLayoutKey, runId] as const,
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
