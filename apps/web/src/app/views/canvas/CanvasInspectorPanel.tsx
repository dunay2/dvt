/** Owned concern: compose the passive Inspector view with the route-owned Inspector authoring surface. */
import { useEffect, useMemo, useState } from 'react';
import { Plus, X } from 'lucide-react';
import InspectorPanel from '../../components/InspectorPanel';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { graphVisualClasses } from '../../plugins/graph/graphVisualTokens';
import type { WorkspaceOption } from '../../services/config/workspaceConfig';
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import { CanvasInspectorAuthoringSection } from './CanvasInspectorAuthoringSection';
import type { CanvasInspectorAuthoringContract } from './canvasInspectorAuthoring.types';
import {
  createCanvasInspectorNodeDraft,
  hasCanvasInspectorNodeDraftChanges,
  validateCanvasInspectorNodeDraft,
} from './canvasInspectorAuthoringModel';
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
  const tagsEditor =
    node != null && (authoring.canEditNode || node.tags.length > 0) ? (
      <CanvasInspectorOverviewTagsEditor key={node.id} node={node} authoring={authoring} />
    ) : undefined;

  return (
    <InspectorPanel
      node={node}
      nodes={nodes}
      edges={edges}
      activeRunId={activeRunId}
      registeredPlugins={registeredPlugins}
      onHide={onHide}
      tagsEditor={tagsEditor}
      beforePanels={
        node ? (
          <CanvasInspectorAuthoringSection
            key={node.id}
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

function CanvasInspectorOverviewTagsEditor({
  node,
  authoring,
}: Readonly<{
  node: CanonicalNode;
  authoring: CanvasInspectorAuthoringContract;
}>) {
  const [draft, setDraft] = useState(() => createCanvasInspectorNodeDraft(node));
  const [newTag, setNewTag] = useState('');

  useEffect(() => {
    const nextDraft = createCanvasInspectorNodeDraft(node);
    setDraft(nextDraft);
    setNewTag('');
  }, [node.description, node.id, node.metadata, node.name, node.tags]);

  const errors = useMemo(() => validateCanvasInspectorNodeDraft(draft), [draft]);
  const isDirty = useMemo(() => hasCanvasInspectorNodeDraftChanges(node, draft), [draft, node]);
  const canApply = authoring.canEditNode && isDirty && Object.keys(errors).length === 0;
  const normalizedNewTag = newTag.trim();
  const canAddTag =
    authoring.canEditNode && normalizedNewTag.length > 0 && !draft.tags.includes(normalizedNewTag);

  return (
    <div data-slot="node-inspector-overview-tags-editor" className="space-y-2">
      {draft.tags.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {draft.tags.map((tag) => (
            <span key={tag} className="inline-flex items-center gap-1">
              <Badge variant="secondary" className="text-xs">
                {tag}
              </Badge>
              {authoring.canEditNode ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-5 rounded-full text-slate-300 hover:text-slate-50"
                  aria-label={`Remove tag ${tag}`}
                  onClick={() => {
                    setDraft((currentDraft) => ({
                      ...currentDraft,
                      tags: currentDraft.tags.filter((currentTag) => currentTag !== tag),
                    }));
                  }}
                >
                  <X className="size-3" />
                </Button>
              ) : null}
            </span>
          ))}
        </div>
      ) : null}

      {authoring.canEditNode ? (
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-2">
          <div className="space-y-2">
            <Label htmlFor={`inspector-overview-node-new-tag-${node.id}`}>New tag</Label>
            <Input
              id={`inspector-overview-node-new-tag-${node.id}`}
              name="node-overview-new-tag"
              value={newTag}
              placeholder="finance"
              onChange={(event) => setNewTag(event.target.value)}
              onKeyDown={(event) => {
                if (event.key !== 'Enter' || !canAddTag) {
                  return;
                }
                event.preventDefault();
                setDraft((currentDraft) => ({
                  ...currentDraft,
                  tags: [...currentDraft.tags, normalizedNewTag],
                }));
                setNewTag('');
              }}
            />
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!canAddTag}
            onClick={() => {
              if (!canAddTag) {
                return;
              }
              setDraft((currentDraft) => ({
                ...currentDraft,
                tags: [...currentDraft.tags, normalizedNewTag],
              }));
              setNewTag('');
            }}
          >
            <Plus className="mr-1 size-3" />
            Add tag
          </Button>
        </div>
      ) : null}

      {!authoring.canEditNode ? (
        <p className={graphVisualClasses.inspectorBody}>
          Node tags are read-only for this workspace state.
        </p>
      ) : null}

      {authoring.canEditNode && isDirty ? (
        <div className="flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              const nextDraft = createCanvasInspectorNodeDraft(node);
              setDraft(nextDraft);
              setNewTag('');
            }}
          >
            Cancel tags
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={!canApply}
            onClick={() => {
              if (canApply) {
                authoring.onApplyNodeDraft(draft);
              }
            }}
          >
            Apply tags
          </Button>
        </div>
      ) : null}
    </div>
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
    <section
      data-slot="canvas-inspector-properties-section"
      className="border-b border-slate-800 pb-4"
    >
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
    </section>
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
