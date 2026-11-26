/**
 * Owned concern: resolve current file-owned project context through existing scoped queries.
 * @baseline ADR-0060: Project files retain their accepted authoring authority after relocation.
 * @decision Share scoped configuration and fresh graph discovery between Elements and Code.
 * @consequence A captured model path cannot substitute for current project identity.
 * @version 1.0.0
 */
import type { DbtProjectFilesAuthorityBinding } from '../../ports/dbtProjectGraph';
import type { DbtProjectGraphProjection } from '@dvt/contracts';
import { useCallback, useMemo } from 'react';
import { ApiError } from '../../services/api/createApiClient';
import { useDbtProjectGraphQuery } from '../../queries/dbtProjectQueries';
import {
  useWorkspaceFileContentQuery,
  useWorkspaceFileTreeQuery,
} from '../../queries/workspaceQueries';
import {
  discoverProjectConfiguration,
  projectConfigurationBinding,
  type ConfigurationDiscovery,
} from './workspaceDbtProjectConfiguration';

function currentProjectPublication(
  binding: DbtProjectFilesAuthorityBinding | undefined,
  data: DbtProjectGraphProjection | undefined
): DbtProjectGraphProjection | undefined {
  if (binding == null || data?.freshness !== 'fresh') return undefined;
  if (data.authorityBinding.canvasId !== binding.canvasId) return undefined;
  const authority = data.authorityBinding.authority;
  return authority.kind === 'dbt-project-files' &&
    authority.projectRoot === binding.authority.projectRoot
    ? data
    : undefined;
}

type FileTreeQuery = ReturnType<typeof useWorkspaceFileTreeQuery>;
type FileContentQuery = ReturnType<typeof useWorkspaceFileContentQuery>;
type ProjectGraphQuery = ReturnType<typeof useDbtProjectGraphQuery>;
type ContextStatus = 'ready' | 'loading' | 'unavailable';
type ConfigurationSnapshot = Readonly<{
  discovery: ConfigurationDiscovery;
  query: FileContentQuery;
  binding: DbtProjectFilesAuthorityBinding | undefined;
}>;

function transientProjectRefreshFailure(error: unknown): boolean {
  return (
    error instanceof ApiError && (error.category === 'network' || (error.statusCode ?? 0) >= 500)
  );
}

function projectPublicationSnapshot(
  binding: DbtProjectFilesAuthorityBinding | undefined,
  query: Pick<ProjectGraphQuery, 'data' | 'isSuccess' | 'error'>
) {
  const publication = currentProjectPublication(binding, query.data);
  return {
    projection: query.isSuccess ? publication : undefined,
    displayProjection:
      query.isSuccess || transientProjectRefreshFailure(query.error) ? publication : undefined,
  };
}

function acceptedQueryStatus(
  required: boolean,
  query: Pick<FileTreeQuery, 'status' | 'fetchStatus'>,
  accepted: boolean
): ContextStatus {
  if (!required) return 'ready';
  switch (query.status) {
    case 'error':
      return 'unavailable';
    case 'pending':
      return 'loading';
    case 'success':
      if (!accepted) return 'unavailable';
  }
  return query.fetchStatus === 'fetching' ? 'loading' : 'ready';
}

function projectContextStatuses(
  tree: FileTreeQuery,
  configuration: ConfigurationSnapshot,
  graph: ProjectGraphQuery,
  projection: DbtProjectGraphProjection | undefined
): ContextStatus[] {
  return [
    configuration.discovery.count > 1 ? 'unavailable' : acceptedQueryStatus(true, tree, true),
    acceptedQueryStatus(
      configuration.discovery.path != null,
      configuration.query,
      configuration.binding != null
    ),
    acceptedQueryStatus(configuration.binding != null, graph, projection != null),
  ];
}

export function useWorkspaceDbtProjectContext({
  enabled = true,
  projectRoot,
  canvasId,
}: Readonly<{ enabled?: boolean; projectRoot?: string; canvasId?: string }> = {}) {
  const tree = useWorkspaceFileTreeQuery({ enabled });
  const discovery = discoverProjectConfiguration(tree, projectRoot, enabled);
  const configPath = discovery.path;
  const config = useWorkspaceFileContentQuery(configPath);
  const binding = useMemo(
    () => projectConfigurationBinding(configPath, config, canvasId),
    [configPath, config.isSuccess, config.data, canvasId]
  );
  const graph = useDbtProjectGraphQuery(binding, { enabled });
  const { projection, displayProjection } = projectPublicationSnapshot(binding, graph);
  const statuses = projectContextStatuses(
    tree,
    { discovery, query: config, binding },
    graph,
    projection
  );
  const unavailable = enabled && statuses.includes('unavailable');
  const loading = enabled && !unavailable && statuses.includes('loading');
  const { refetch } = graph;
  const refresh = useCallback(async (): Promise<DbtProjectGraphProjection | undefined> => {
    if (binding == null) return undefined;
    const current = await refetch();
    return current.isSuccess ? currentProjectPublication(binding, current.data) : undefined;
  }, [binding, refetch]);
  return { binding, projection, displayProjection, unavailable, loading, refresh };
}
