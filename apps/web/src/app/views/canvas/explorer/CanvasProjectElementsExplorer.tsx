/** Owned concern: expose authoritative project definitions without inventing instance admission. */
import { useApplicationLanguageStore } from '../../../stores/applicationLanguageStore';
import { useWorkspaceDbtProjectContext } from '../../code/useWorkspaceDbtProjectContext';
import { CanvasExplorerList } from './CanvasExplorerList';
import { CanvasExplorerCatalogPanel } from './CanvasExplorerDocuments';
import { resolveCanvasExplorerCopy } from './canvasExplorerCopy';
import type { CanvasProjectElementsInput } from './CanvasExplorer.types';
import styles from './CanvasExplorer.module.css';
import { useState, type DragEvent } from 'react';
import { CANONICAL_NODE_DRAG_MIME_TYPE } from '../../../types/canonical';
import { createCanvasDbtModelDefinition } from '../canvasDbtModelReference';
import { projectCanvasExplorerFileModels, mergeCanvasExplorerModels } from './canvasExplorerItems';

export function CanvasProjectElementsExplorer({
  enabled,
  items,
  onInspectNode,
  inspectorTarget,
  catalogueScopeKey,
  presentation,
  onDragStart,
  modelAction,
  onAddModel,
  onRemoveEmptyModel,
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
  const models = projectFileExplorerModels({
    enabled,
    projection,
    binding,
    canCreateInstances,
    inspectorTarget,
  });
  function dragModel(id: string, event: DragEvent<HTMLButtonElement>): void {
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
  }

  function selectModel(id: string) {
    if (currentIds.has(id)) {
      return onInspectNode({ kind: 'canonical-node', nodeId: id });
    }
    const model = models.find((item) => item.id === id);
    if (binding == null || model == null) return;
    return onInspectNode({
      kind: 'dbt-file-model',
      binding,
      uniqueId: model.definitionIdentity.uniqueId,
    });
  }

  return (
    <CanvasExplorerCatalogPanel key={catalogueScopeKey} copy={copy}>
      <CanvasExplorerList
        key={JSON.stringify([
          catalogueScopeKey,
          projectRoot,
          binding?.canvasId,
          binding?.authority.projectRoot,
        ])}
        items={mergeCanvasExplorerModels(items, models)}
        presentation={presentation}
        onAddModel={onAddModel}
        onRemoveEmptyModel={onRemoveEmptyModel}
        modelAction={modelAction}
        onImport={onImport}
        connections={connections}
        countKnown={!loading && !unavailable}
        pending={loading}
        status={
          [creationError, unavailable, loading].some(Boolean) ? (
            <ProjectElementsStatus
              creationError={creationError}
              unavailable={unavailable}
              loading={loading}
              copy={copy}
            />
          ) : undefined
        }
        onDragStart={dragModel}
        onSelect={selectModel}
      />
    </CanvasExplorerCatalogPanel>
  );
}

function projectFileExplorerModels({
  enabled,
  projection,
  binding,
  canCreateInstances,
  inspectorTarget,
}: Pick<CanvasProjectElementsInput, 'enabled' | 'canCreateInstances' | 'inspectorTarget'> &
  Pick<ReturnType<typeof useWorkspaceDbtProjectContext>, 'projection' | 'binding'>) {
  return enabled && projection != null && binding != null
    ? projectCanvasExplorerFileModels(projection).map((item) => {
        // Unbound logical Models remain visible; the existing factory owns full output admission.
        const canPlace = canCreateInstances && projection.executionTarget?.connectionRef != null;
        const selected = isSelectedFileExplorerModel(item, binding, inspectorTarget);
        return { ...item, selected, draggable: canPlace, disabled: false };
      })
    : [];
}

function ProjectElementsStatus({
  creationError,
  unavailable,
  loading,
  copy,
}: Readonly<{
  creationError: boolean;
  unavailable: boolean;
  loading: boolean;
  copy: ReturnType<typeof resolveCanvasExplorerCopy>;
}>) {
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
    </>
  );
}

function isSelectedFileExplorerModel(
  item: ReturnType<typeof projectCanvasExplorerFileModels>[number],
  binding: NonNullable<ReturnType<typeof useWorkspaceDbtProjectContext>['binding']>,
  target: CanvasProjectElementsInput['inspectorTarget']
): boolean {
  if (target?.kind !== 'dbt-file-model') return false;
  if (target.binding.canvasId !== binding.canvasId) return false;
  if (target.binding.authority.projectRoot !== binding.authority.projectRoot) return false;
  return target.uniqueId === item.definitionIdentity.uniqueId;
}
