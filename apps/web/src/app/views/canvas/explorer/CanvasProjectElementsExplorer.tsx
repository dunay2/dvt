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
  resolveDbtProjectWorkspaceFilePath,
  resolveProjectRootScopedCodeWorkspaceFileTree,
} from '../../code/codeViewFileSelection';
import { CanvasExplorerList } from './CanvasExplorerList';
import { resolveCanvasExplorerCopy } from './canvasExplorerCopy';
import type { CanvasProjectElementsInput } from './CanvasExplorer';
import styles from './CanvasExplorer.module.css';
import { useState } from 'react';
import { CANONICAL_NODE_DRAG_MIME_TYPE } from '../../../types/canonical';
import {
  canvasDbtModelDefinitionId,
  createCanvasDbtModelDefinition,
} from '../canvasDbtModelReference';

export function CanvasProjectElementsExplorer({
  enabled,
  items,
  onSelect,
  onDragStart,
  categoryActions,
  projectRoot,
  canCreateInstances = false,
}: CanvasProjectElementsInput & Readonly<{ projectRoot?: string }>): JSX.Element {
  const copy = resolveCanvasExplorerCopy(useApplicationLanguageStore((state) => state.language));
  const [creationError, setCreationError] = useState(false);
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
          .filter(
            (node) =>
              node.resourceType === 'model' &&
              !currentIds.has(canvasDbtModelDefinitionId(binding.canvasId, node.uniqueId))
          )
          .map((node) => ({
            id: canvasDbtModelDefinitionId(binding.canvasId, node.uniqueId),
            label: node.name,
            description:
              node.originalFilePath == null
                ? undefined
                : resolveDbtProjectWorkspaceFilePath(
                    binding.authority.projectRoot,
                    node.originalFilePath
                  ),
            category: copy.models,
            draggable: canCreateInstances,
            disabled: !canCreateInstances,
            uniqueId: node.uniqueId,
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
      {creationError ? (
        <p className={styles.empty} role="alert">
          {copy.modelSchemaUnavailable}
        </p>
      ) : null}
      {unavailable || loading ? (
        <p className={styles.empty} role={unavailable ? 'alert' : 'status'}>
          {unavailable ? copy.projectModelsUnavailable : copy.projectModelsLoading}
        </p>
      ) : null}
      <CanvasExplorerList
        items={[...items, ...models]}
        categoryActions={categoryActions}
        onDragStart={(id, event) => {
          const model = models.find((item) => item.id === id);
          if (model == null) {
            onDragStart?.(id, event);
            return;
          }
          try {
            if (!canCreateInstances || projection == null) throw new Error('Unavailable model.');
            event.dataTransfer.setData(
              CANONICAL_NODE_DRAG_MIME_TYPE,
              JSON.stringify(createCanvasDbtModelDefinition(projection, model.uniqueId))
            );
            event.dataTransfer.effectAllowed = 'copy';
            setCreationError(false);
          } catch {
            event.preventDefault();
            setCreationError(true);
          }
        }}
        onSelect={(id) => {
          if (currentIds.has(id)) {
            onSelect(id);
            return;
          }
          const model = models.find((item) => item.id === id);
          try {
            if (!canCreateInstances || projection == null || model == null)
              throw new Error('Unavailable model.');
            onSelect(id, createCanvasDbtModelDefinition(projection, model.uniqueId));
            setCreationError(false);
          } catch {
            setCreationError(true);
          }
        }}
      />
    </>
  );
}
