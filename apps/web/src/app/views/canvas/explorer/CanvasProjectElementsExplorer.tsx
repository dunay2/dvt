/** Owned concern: expose authoritative project definitions without inventing instance admission. */
import {
  useWorkspaceFileContentQuery,
  useWorkspaceFileTreeQuery,
} from '../../../queries/workspaceQueries';
import { useDbtProjectGraphQuery } from '../../../queries/dbtProjectQueries';
import { useApplicationLanguageStore } from '../../../stores/applicationLanguageStore';
import type { DbtProjectFilesAuthorityBinding } from '../../../ports/dbtProjectGraph';
import {
  flattenCodeWorkspaceFiles,
  resolveProjectRootScopedCodeWorkspaceFileTree,
} from '../../code/codeViewFileSelection';
import { CanvasExplorerList } from './CanvasExplorerList';
import { resolveCanvasExplorerCopy } from './canvasExplorerCopy';
import type { CanvasProjectElementsInput } from './CanvasExplorer';
import styles from './CanvasExplorer.module.css';

export function CanvasProjectElementsExplorer({
  enabled,
  items,
  onSelect,
  onDragStart,
  categoryActions,
  projectRoot,
}: CanvasProjectElementsInput & Readonly<{ projectRoot?: string }>): JSX.Element {
  const copy = resolveCanvasExplorerCopy(useApplicationLanguageStore((state) => state.language));
  const tree = useWorkspaceFileTreeQuery({ enabled });
  const entries =
    projectRoot == null
      ? (tree.data ?? [])
      : resolveProjectRootScopedCodeWorkspaceFileTree(tree.data ?? [], projectRoot);
  const files = flattenCodeWorkspaceFiles(entries);
  const configurations = files.filter((entry) => entry.name === 'dbt_project.yml');
  const configPath =
    enabled && tree.isSuccess && configurations.length === 1 ? configurations[0]?.path : undefined;
  const config = useWorkspaceFileContentQuery(configPath);
  const resolution =
    configPath == null || !config.isSuccess ? undefined : config.data.authoringAuthority;
  const accepted = resolution?.kind === 'resolved' ? resolution.binding : undefined;
  const binding: DbtProjectFilesAuthorityBinding | undefined =
    accepted?.authority.kind === 'dbt-project-files'
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
  const currentIds = new Set(items.map((item) => item.id));
  const models =
    enabled && projection != null && binding != null
      ? projection.nodes
          .filter((node) => node.resourceType === 'model' && !currentIds.has(node.uniqueId))
          .map((node) => ({
            id: node.uniqueId,
            label: node.name,
            description: copy.externalModelInstanceUnavailable,
            category: copy.models,
            draggable: false,
            disabled: true,
          }))
      : [];
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
  return (
    <>
      {unavailable || loading ? (
        <p className={styles.empty} role={unavailable ? 'alert' : 'status'}>
          {unavailable ? copy.projectModelsUnavailable : copy.projectModelsLoading}
        </p>
      ) : null}
      <CanvasExplorerList
        items={[...items, ...models]}
        categoryActions={categoryActions}
        onDragStart={onDragStart}
        onSelect={(id) => {
          if (currentIds.has(id)) onSelect(id);
        }}
      />
    </>
  );
}
