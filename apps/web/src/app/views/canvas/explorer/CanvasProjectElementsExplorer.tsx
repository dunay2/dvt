/** Owned concern: expose authoritative project definitions without inventing instance admission. */
import { useApplicationLanguageStore } from '../../../stores/applicationLanguageStore';
import { resolveDbtProjectWorkspaceFilePath } from '../../code/codeViewFileSelection';
import { useWorkspaceDbtProjectContext } from '../../code/useWorkspaceDbtProjectContext';
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
  const { binding, projection, unavailable, loading } = useWorkspaceDbtProjectContext({
    enabled,
    projectRoot,
  });
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
