/** Owned concern: expose authoritative project definitions without inventing instance admission. */
import { useApplicationLanguageStore } from '../../../stores/applicationLanguageStore';
import { useWorkspaceDbtProjectContext } from '../../code/useWorkspaceDbtProjectContext';
import { CanvasExplorerList } from './CanvasExplorerList';
import { resolveCanvasExplorerCopy } from './canvasExplorerCopy';
import type { CanvasProjectElementsInput } from './CanvasExplorer';
import styles from './CanvasExplorer.module.css';
import { useState } from 'react';
import { CANONICAL_NODE_DRAG_MIME_TYPE } from '../../../types/canonical';
import { createCanvasDbtModelDefinition } from '../canvasDbtModelReference';
import { projectCanvasExplorerFileModels, mergeCanvasExplorerModels } from './canvasExplorerItems';

export function CanvasProjectElementsExplorer({
  enabled,
  items,
  onSelect,
  onDragStart,
  onAddModel,
  onImport,
  connections,
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
      ? projectCanvasExplorerFileModels(projection).map((item) => {
          // Unbound logical Models remain visible; the existing factory owns full output admission.
          const canPlace = canCreateInstances && projection.executionTarget?.connectionRef != null;
          return { ...item, draggable: canPlace, disabled: !canPlace };
        })
      : [];
  return (
    <CanvasExplorerList
      items={mergeCanvasExplorerModels(items, models)}
      onAddModel={onAddModel}
      onImport={onImport}
      connections={connections}
      countKnown={!loading && !unavailable}
      pending={loading}
      status={
        creationError || unavailable || loading ? (
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
          </>
        ) : undefined
      }
      onDragStart={(id, event) => {
        if (currentIds.has(id)) {
          onDragStart?.(id, event);
          return;
        }
        const model = models.find((item) => item.id === id);
        if (model == null) {
          onDragStart?.(id, event);
          return;
        }
        try {
          if (!canCreateInstances || projection == null) throw new Error('Unavailable model.');
          event.dataTransfer.setData(
            CANONICAL_NODE_DRAG_MIME_TYPE,
            JSON.stringify(
              createCanvasDbtModelDefinition(projection, model.definitionIdentity.uniqueId)
            )
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
          onSelect(
            id,
            createCanvasDbtModelDefinition(projection, model.definitionIdentity.uniqueId)
          );
          setCreationError(false);
        } catch {
          setCreationError(true);
        }
      }}
    />
  );
}
