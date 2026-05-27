/** Owned concern: compose the passive Inspector view with the route-owned Inspector authoring surface. */
import { useEffect, useMemo, useState } from 'react';
import InspectorPanel from '../../components/InspectorPanel';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { graphVisualClasses } from '../../plugins/graph/graphVisualTokens';
import type { WorkspaceOption } from '../../services/config/workspaceConfig';
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import { CanvasInspectorAuthoringSection } from './CanvasInspectorAuthoringSection';
import type { CanvasInspectorAuthoringContract } from './canvasInspectorAuthoring.types';
import type { ProjectCanvasDocument, ProjectCanvasPatch } from './canvasProjectCanvasLifecycle';

type CanvasInspectorCanvasContract = ProjectCanvasDocument &
  Readonly<{
    canEdit: boolean;
    canDelete: boolean;
    executionEnvironmentOptions: readonly WorkspaceOption[];
    onApplyCanvasPatch: (patch: ProjectCanvasPatch) => void;
    onDeleteCanvas: () => void;
  }>;

type CanvasInspectorPanelProps = Readonly<{
  node: CanonicalNode | null;
  nodes: readonly CanonicalNode[];
  edges: readonly CanonicalEdge[];
  activeRunId: string | null;
  registeredPlugins?: ReadonlySet<string>;
  onHide: () => void;
  authoring: CanvasInspectorAuthoringContract;
  canvas?: CanvasInspectorCanvasContract | null;
}>;

export function CanvasInspectorPanel({
  node,
  nodes,
  edges,
  activeRunId,
  registeredPlugins,
  onHide,
  authoring,
  canvas,
}: CanvasInspectorPanelProps) {
  return (
    <InspectorPanel
      node={node}
      activeRunId={activeRunId}
      registeredPlugins={registeredPlugins}
      onHide={onHide}
      beforePanels={
        node ? (
          <CanvasInspectorAuthoringSection
            node={node}
            nodes={nodes}
            edges={edges}
            authoring={authoring}
          />
        ) : canvas != null ? (
          <CanvasInspectorCanvasSection canvas={canvas} />
        ) : null
      }
    />
  );
}

function CanvasInspectorCanvasSection({
  canvas,
}: Readonly<{ canvas: CanvasInspectorCanvasContract }>) {
  const [title, setTitle] = useState(canvas.title);
  const environmentOptions = useMemo(() => buildCanvasEnvironmentOptions(canvas), [canvas]);
  const currentEnvironmentId = useMemo(() => resolveCurrentCanvasEnvironmentId(canvas), [canvas]);
  const [environmentId, setEnvironmentId] = useState(currentEnvironmentId);

  useEffect(() => {
    setTitle(canvas.title);
    setEnvironmentId(resolveCurrentCanvasEnvironmentId(canvas));
  }, [canvas.id, canvas.title, canvas.environmentId, canvas.executionEnvironmentOptions]);

  const titleError = useMemo(
    () => (title.trim().length === 0 ? 'Canvas name is required.' : null),
    [title]
  );
  const titleDirty = title !== canvas.title;
  const environmentDirty = environmentId !== currentEnvironmentId;
  const isDirty = titleDirty || environmentDirty;
  const canApply = canvas.canEdit && isDirty && titleError == null;

  return (
    <Card className={graphVisualClasses.inspectorCard}>
      <div className="space-y-3">
        <div>
          <h3 className={graphVisualClasses.contextPanelSectionTitle}>Canvas properties</h3>
          <p className={graphVisualClasses.inspectorBody}>
            Worksheet identity and project execution context.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor={`inspector-canvas-title-${canvas.id}`}>Name</Label>
          <Input
            id={`inspector-canvas-title-${canvas.id}`}
            name="canvas-title"
            value={title}
            disabled={!canvas.canEdit}
            aria-invalid={titleError ? 'true' : undefined}
            onChange={(event) => setTitle(event.target.value)}
          />
          {titleError ? (
            <p className={graphVisualClasses.inspectorErrorText}>{titleError}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor={`inspector-canvas-environment-${canvas.id}`}>Execution environment</Label>
          {environmentOptions.length > 0 ? (
            <select
              id={`inspector-canvas-environment-${canvas.id}`}
              name="canvas-environment"
              value={environmentId}
              disabled={!canvas.canEdit}
              className={graphVisualClasses.inspectorSelectInput}
              onChange={(event) => setEnvironmentId(event.target.value)}
            >
              {environmentOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          ) : (
            <p className={graphVisualClasses.inspectorBody}>
              No execution environments are configured for this workspace.
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
          <span className={graphVisualClasses.inspectorLabel}>ID</span>
          <span className="truncate font-mono">{canvas.id}</span>
          <span className={graphVisualClasses.inspectorLabel}>Kind</span>
          <span className="truncate">{canvas.kind}</span>
          <span className={graphVisualClasses.inspectorLabel}>Permission</span>
          <span className="truncate">{canvas.defaultPermission ?? 'workspace default'}</span>
        </div>

        {!canvas.canEdit ? (
          <p className={graphVisualClasses.inspectorBody}>
            Canvas properties are read-only for this workspace state.
          </p>
        ) : null}

        <div className="flex items-center justify-between gap-2">
          <Button
            type="button"
            variant="destructive"
            size="sm"
            disabled={!canvas.canDelete}
            onClick={canvas.onDeleteCanvas}
          >
            Delete
          </Button>
          {canvas.canEdit && isDirty ? (
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setTitle(canvas.title);
                  setEnvironmentId(currentEnvironmentId);
                }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={!canApply}
                onClick={() => {
                  if (canApply) {
                    const patch: ProjectCanvasPatch = {
                      ...(titleDirty ? { title: title.trim() } : {}),
                      ...(environmentDirty ? { environmentId } : {}),
                    };
                    canvas.onApplyCanvasPatch(patch);
                  }
                }}
              >
                Apply
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    </Card>
  );
}

function resolveCurrentCanvasEnvironmentId(canvas: CanvasInspectorCanvasContract): string {
  return canvas.environmentId ?? canvas.executionEnvironmentOptions[0]?.value ?? '';
}

function buildCanvasEnvironmentOptions(
  canvas: CanvasInspectorCanvasContract
): readonly WorkspaceOption[] {
  const currentEnvironmentId = canvas.environmentId?.trim();
  if (
    currentEnvironmentId == null ||
    currentEnvironmentId.length === 0 ||
    canvas.executionEnvironmentOptions.some((option) => option.value === currentEnvironmentId)
  ) {
    return canvas.executionEnvironmentOptions;
  }

  return [
    {
      value: currentEnvironmentId,
      label: currentEnvironmentId,
    },
    ...canvas.executionEnvironmentOptions,
  ];
}
