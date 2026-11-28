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
import { writeCanvasModelCompositionDrag } from '../canvasNodeDropPayload';

export function CanvasProjectElementsExplorer({
  ...props
}: CanvasProjectElementsInput & Readonly<{ projectRoot?: string }>): JSX.Element {
  const projectContext = useWorkspaceDbtProjectContext({
    enabled: props.enabled,
    projectRoot: props.projectRoot,
  });
  return <CanvasProjectElementsExplorerView {...props} projectContext={projectContext} />;
}

export function CanvasProjectElementsExplorerView({
  enabled,
  items,
  onInspectNode,
  inspectorTarget,
  catalogueScopeKey,
  presentation,
  onDragStart,
  modelCompositionScope,
  onAddModel,
  onRemoveEmptyModel,
  onImport,
  connections,
  projectRoot,
  canCreateInstances = false,
  projectContext,
}: CanvasProjectElementsInput &
  Readonly<{
    projectRoot?: string;
    projectContext: ReturnType<typeof useWorkspaceDbtProjectContext>;
  }>): JSX.Element {
  const copy = resolveCanvasExplorerCopy(useApplicationLanguageStore((state) => state.language));
  const [creationError, setCreationError] = useState(false);
  const { binding, projection, displayProjection, unavailable, loading } = projectContext;
  const currentIds = new Set(items.map((item) => item.id));
  const models = projectFileExplorerModels({
    enabled,
    projection,
    displayProjection,
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
      startFileModelPlacement(
        projection,
        model.definitionIdentity.uniqueId,
        canCreateInstances,
        event
      );
      if (writeCanvasModelCompositionDrag(event.dataTransfer, id, modelCompositionScope))
        event.dataTransfer.effectAllowed = 'copyLink';
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
        key={JSON.stringify([catalogueScopeKey, projectRoot])}
        items={mergeCanvasExplorerModels(items, models)}
        presentation={presentation}
        onAddModel={onAddModel}
        onRemoveEmptyModel={onRemoveEmptyModel}
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

function startFileModelPlacement(
  projection: ReturnType<typeof useWorkspaceDbtProjectContext>['projection'],
  uniqueId: string,
  enabled: boolean,
  event: DragEvent<HTMLButtonElement>
): void {
  if (!enabled || projection == null) throw new Error('Unavailable model.');
  event.dataTransfer.setData(
    CANONICAL_NODE_DRAG_MIME_TYPE,
    JSON.stringify(createCanvasDbtModelDefinition(projection, uniqueId))
  );
  event.dataTransfer.effectAllowed = 'copy';
}

type FileExplorerProjectionContext = Pick<
  CanvasProjectElementsInput,
  'enabled' | 'canCreateInstances' | 'inspectorTarget'
> &
  Pick<
    ReturnType<typeof useWorkspaceDbtProjectContext>,
    'projection' | 'displayProjection' | 'binding'
  >;

function projectFileExplorerModels(context: FileExplorerProjectionContext) {
  const { enabled, displayProjection, binding } = context;
  return enabled && displayProjection != null && binding != null
    ? projectCanvasExplorerFileModels(displayProjection).map((item) =>
        projectFileExplorerModel(item, context)
      )
    : [];
}

function projectFileExplorerModel(
  item: ReturnType<typeof projectCanvasExplorerFileModels>[number],
  { projection, binding, canCreateInstances, inspectorTarget }: FileExplorerProjectionContext
) {
  // A retained row is presentation only; the current publication still owns placement admission.
  const canPlace =
    canCreateInstances === true && projection?.executionTarget?.connectionRef != null;
  const selected = binding != null && isSelectedFileExplorerModel(item, binding, inspectorTarget);
  return { ...item, selected, draggable: canPlace, disabled: false };
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
