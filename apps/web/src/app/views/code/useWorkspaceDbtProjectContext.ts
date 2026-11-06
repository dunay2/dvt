/**
 * Owned concern: resolve current file-owned project context through existing scoped queries.
 * @baseline ADR-0060: Project files retain their accepted authoring authority after relocation.
 * @decision Share scoped configuration and fresh graph discovery between Elements and Code.
 * @consequence A captured model path cannot substitute for current project identity.
 * @version 1.0.0
 */
import type { DbtProjectFilesAuthorityBinding } from '../../ports/dbtProjectGraph';
import { useDbtProjectGraphQuery } from '../../queries/dbtProjectQueries';
import {
  useWorkspaceFileContentQuery,
  useWorkspaceFileTreeQuery,
} from '../../queries/workspaceQueries';
import {
  flattenCodeWorkspaceFiles,
  resolveProjectRootScopedCodeWorkspaceFileTree,
} from './codeViewFileSelection';

export function useWorkspaceDbtProjectContext({
  enabled = true,
  projectRoot,
  canvasId,
}: Readonly<{ enabled?: boolean; projectRoot?: string; canvasId?: string }> = {}) {
  const tree = useWorkspaceFileTreeQuery({ enabled });
  const entries =
    projectRoot == null
      ? (tree.data ?? [])
      : resolveProjectRootScopedCodeWorkspaceFileTree(tree.data ?? [], projectRoot);
  const configurations = flattenCodeWorkspaceFiles(entries).filter(
    (entry) => entry.name === 'dbt_project.yml'
  );
  const configPath =
    enabled && tree.isSuccess && configurations.length === 1 ? configurations[0]?.path : undefined;
  const config = useWorkspaceFileContentQuery(configPath);
  const resolution =
    configPath == null || !config.isSuccess || config.data.path !== configPath
      ? undefined
      : config.data.authoringAuthority;
  const accepted = resolution?.kind === 'resolved' ? resolution.binding : undefined;
  const binding: DbtProjectFilesAuthorityBinding | undefined =
    accepted?.authority.kind === 'dbt-project-files' &&
    (canvasId == null || accepted.canvasId === canvasId)
      ? { ...accepted, authority: accepted.authority }
      : undefined;
  const graph = useDbtProjectGraphQuery(binding, { enabled });
  const projection =
    graph.isSuccess &&
    graph.data.freshness === 'fresh' &&
    graph.data.authorityBinding.canvasId === binding?.canvasId &&
    graph.data.authorityBinding.authority.kind === 'dbt-project-files' &&
    graph.data.authorityBinding.authority.projectRoot === binding.authority.projectRoot
      ? graph.data
      : undefined;
  const unavailable =
    enabled &&
    (tree.isError ||
      configurations.length > 1 ||
      (configPath != null && (config.isError || (config.isSuccess && binding == null))) ||
      (binding != null && (graph.isError || (graph.isSuccess && projection == null))));
  const loading =
    enabled &&
    !unavailable &&
    (tree.isPending ||
      (configPath != null && config.isPending) ||
      (binding != null && graph.isPending));
  return { binding, projection, unavailable, loading };
}
