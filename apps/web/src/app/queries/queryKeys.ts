/**
 * Typed query key registry for TanStack React Query.
 *
 * All query keys used in the application should be defined here so that
 * invalidation, prefetching, and cache management can be reasoned about
 * from a single location.
 */

import type { WorkspaceScope } from '../ports/sessionContext';

const bindWorkspaceQueryKeys = (workspaceLayoutKey: string) =>
  ({
    graphDraft: () => ['workspace', 'graph-draft', workspaceLayoutKey] as const,
    graphForView: (viewId: string) => ['workspace', 'graph', workspaceLayoutKey, viewId] as const,
    diffChanges: () => ['workspace', 'diff-changes', workspaceLayoutKey] as const,
    plugins: () => ['workspace', 'plugins', workspaceLayoutKey] as const,
    roles: () => ['workspace', 'roles', workspaceLayoutKey] as const,
    audit: () => ['workspace', 'audit', workspaceLayoutKey] as const,
    fileTree: () => ['workspace', 'file-tree', workspaceLayoutKey] as const,
    fileContentRoot: () => ['workspace', 'file-content', workspaceLayoutKey] as const,
    fileContent: (path: string) => ['workspace', 'file-content', workspaceLayoutKey, path] as const,
    fileHistory: (
      path: string,
      selection: readonly [] | readonly ['pages'] | readonly ['version', string | undefined] = []
    ) => ['workspace', 'file-history', workspaceLayoutKey, path, ...selection] as const,
    artifacts: () => ['workspace', 'artifacts', workspaceLayoutKey] as const,
  }) as const;

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
    worksheetSchemas: (scopeKey: string, connectionId: string | undefined) =>
      ['sql-worksheet-schemas', scopeKey, connectionId] as const,
    worksheetObjects: (
      scopeKey: string,
      connectionId: string | undefined,
      filter: Readonly<{
        schema: Readonly<{ catalog: string; schema: string }> | null;
        query: string;
      }>
    ) =>
      [
        'sql-worksheet-objects',
        scopeKey,
        connectionId,
        filter.schema?.catalog,
        filter.schema?.schema,
        filter.query,
      ] as const,
    warehouseConnections: (
      scope: Pick<WorkspaceScope, 'tenantId' | 'projectId' | 'environmentId'>
    ) =>
      [
        'workspace',
        'warehouse-connections',
        scope.tenantId,
        scope.projectId,
        scope.environmentId,
      ] as const,
    graphDraftRoot: () => ['workspace', 'graph-draft'] as const,
    forLayout: bindWorkspaceQueryKeys,

    dbtProjectGraph: (context: DbtProjectQueryContext) =>
      [
        'workspace',
        'dbt-project-graph',
        context.tenantId,
        context.projectId,
        context.environmentId,
        context.canvasId,
        context.projectRoot,
        context.revisionToken,
      ] as const,
    dbtProjectGraphRoot: () => ['workspace', 'dbt-project-graph'] as const,
    dbtSelectedModelAnalysis: (
      context: DbtProjectQueryContext & Readonly<{ selectedUniqueId: string | undefined }>
    ) =>
      [
        'workspace',
        'dbt-selected-model-analysis',
        context.tenantId,
        context.projectId,
        context.environmentId,
        context.canvasId,
        context.projectRoot,
        context.selectedUniqueId,
        context.revisionToken,
      ] as const,

    directory: (
      context: Pick<WorkspaceScope, 'tenantId' | 'projectId' | 'environmentId'> &
        Readonly<{ directory: string }>
    ) =>
      [
        'workspace',
        'file-directory',
        context.tenantId,
        context.projectId,
        context.environmentId,
        context.directory,
      ] as const,
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
      context: Readonly<{
        tenantId: string;
        projectId: string | null;
        environmentId: string | null;
        limit: number;
      }>
    ) =>
      [
        'cost',
        'attribution-summary',
        context.tenantId,
        context.projectId,
        context.environmentId,
        context.limit,
      ] as const,
  },
} as const;

export type DbtProjectQueryContext = Readonly<{
  tenantId: string;
  projectId: string;
  environmentId: string;
  canvasId: string | undefined;
  projectRoot: string | undefined;
  revisionToken?: string;
}>;

export function hasDbtProjectQueryContext(context: DbtProjectQueryContext): boolean {
  return [
    context.tenantId,
    context.projectId,
    context.environmentId,
    context.canvasId,
    context.projectRoot,
  ].every((value) => Boolean(value?.trim()));
}
