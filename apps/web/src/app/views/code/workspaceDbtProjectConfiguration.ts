/**
 * Owned concern: locate the scoped dbt configuration and accept its correlated file authority.
 * @baseline ADR-0060 / ADR-0069: relocation cannot substitute a cached path for current authority.
 * @decision Require one configuration and its exact successful content receipt before binding a project.
 * @consequence Ambiguous, stale, foreign and graph-owned configurations cannot authorize a file producer.
 * @version 1.0.0
 */
import type { DbtProjectFilesAuthorityBinding } from '../../ports/dbtProjectGraph';
import type {
  useWorkspaceFileTreeQuery,
  useWorkspaceFileContentQuery,
} from '../../queries/workspaceQueries';
import {
  flattenCodeWorkspaceFiles,
  resolveProjectRootScopedCodeWorkspaceFileTree,
} from './codeViewFileSelection';

type FileTreeQuery = ReturnType<typeof useWorkspaceFileTreeQuery>;
type FileContentQuery = ReturnType<typeof useWorkspaceFileContentQuery>;
export type ConfigurationDiscovery = Readonly<{ path: string | undefined; count: number }>;

export function discoverProjectConfiguration(
  tree: FileTreeQuery,
  projectRoot: string | undefined,
  enabled: boolean
): ConfigurationDiscovery {
  const entries =
    projectRoot == null
      ? (tree.data ?? [])
      : resolveProjectRootScopedCodeWorkspaceFileTree(tree.data ?? [], projectRoot);
  const configurations = flattenCodeWorkspaceFiles(entries).filter(
    (entry) => entry.name === 'dbt_project.yml'
  );
  return {
    count: configurations.length,
    path:
      enabled && tree.isSuccess && configurations.length === 1
        ? configurations[0]?.path
        : undefined,
  };
}

function acceptedConfigurationAuthority(
  content: NonNullable<FileContentQuery['data']>,
  canvasId: string | undefined
): DbtProjectFilesAuthorityBinding | undefined {
  const resolution = content.authoringAuthority;
  if (resolution?.kind !== 'resolved') return undefined;
  const accepted = resolution.binding;
  if (accepted.authority.kind !== 'dbt-project-files') return undefined;
  if (canvasId != null && accepted.canvasId !== canvasId) return undefined;
  return { ...accepted, authority: accepted.authority };
}

export function projectConfigurationBinding(
  configPath: string | undefined,
  config: FileContentQuery,
  canvasId: string | undefined
): DbtProjectFilesAuthorityBinding | undefined {
  if (configPath == null) return undefined;
  if (config.status !== 'success') return undefined;
  if (config.data.path !== configPath) return undefined;
  return acceptedConfigurationAuthority(config.data, canvasId);
}
