/** Owned concern: expose authoritative project models through the existing Canvas navigation list. */
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
  resolveDbtProjectWorkspaceFilePath,
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
  onOpenFile,
}: CanvasProjectElementsInput &
  Readonly<{ projectRoot?: string; onOpenFile: (path: string) => void }>): JSX.Element {
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
  const filePaths = new Set(files.map((entry) => entry.path));
  const models =
    enabled && projection != null && binding != null
      ? projection.nodes
          .filter((node) => node.resourceType === 'model' && !currentIds.has(node.uniqueId))
          .map((node) => {
            const codePath =
              node.originalFilePath == null
                ? undefined
                : resolveDbtProjectWorkspaceFilePath(
                    binding.authority.projectRoot,
                    node.originalFilePath
                  );
            return {
              id: node.uniqueId,
              label: node.name,
              description: node.originalFilePath ?? copy.dbtModel,
              category: copy.models,
              draggable: false,
              codePath,
              disabled: codePath == null || !filePaths.has(codePath),
            };
          })
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
          else {
            const model = models.find((candidate) => candidate.id === id);
            if (model?.codePath != null && !model.disabled) onOpenFile(model.codePath);
          }
        }}
      />
    </>
  );
}
