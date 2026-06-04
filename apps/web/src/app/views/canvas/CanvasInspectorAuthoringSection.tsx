/** Owned concern: orchestrate the route-owned Inspector authoring surface for governed node details. */
import { useEffect, useMemo, useState } from 'react';

import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { graphVisualClasses } from '../../plugins/graph/graphVisualTokens';
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import {
  createCanvasInspectorNodeDraft,
  hasCanvasInspectorNodeDraftChanges,
  validateCanvasInspectorNodeDraft,
} from './canvasInspectorAuthoringModel';
import type { CanvasInspectorAuthoringContract } from './canvasInspectorAuthoring.types';
import { DbtAuthoringFields } from './DbtAuthoringFields';
import { DvtAuthoringFields } from './DvtAuthoringFields';

type CanvasInspectorAuthoringSectionProps = Readonly<{
  node: CanonicalNode;
  nodes: readonly CanonicalNode[];
  edges: readonly CanonicalEdge[];
  authoring: CanvasInspectorAuthoringContract;
}>;

export function CanvasInspectorAuthoringSection({
  node,
  nodes,
  edges,
  authoring,
}: CanvasInspectorAuthoringSectionProps) {
  const [draft, setDraft] = useState(() => createCanvasInspectorNodeDraft(node));
  const [tagsText, setTagsText] = useState(() =>
    createCanvasInspectorNodeDraft(node).tags.join(', ')
  );

  useEffect(() => {
    const nextDraft = createCanvasInspectorNodeDraft(node);
    setDraft(nextDraft);
    setTagsText(nextDraft.tags.join(', '));
  }, [node.description, node.id, node.metadata, node.name, node.tags]);

  const errors = useMemo(() => validateCanvasInspectorNodeDraft(draft), [draft]);
  const isDirty = useMemo(() => hasCanvasInspectorNodeDraftChanges(node, draft), [draft, node]);
  const canApply = authoring.canEditNode && isDirty && Object.keys(errors).length === 0;

  return (
    <section
      data-slot="node-inspector-editable-section"
      className={graphVisualClasses.contextPanelDetailsSection}
    >
      <div className="space-y-3">
        <div>
          <h3 className={graphVisualClasses.contextPanelSectionTitle}>Editable properties</h3>
          <p className={graphVisualClasses.inspectorBody}>
            Name, tags, and description saved with this canvas.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor={`inspector-node-name-${node.id}`}>Name</Label>
          <Input
            id={`inspector-node-name-${node.id}`}
            name="node-name"
            value={draft.name}
            disabled={!authoring.canEditNode}
            aria-invalid={errors.name ? 'true' : undefined}
            onChange={(event) =>
              setDraft((currentDraft) => ({
                ...currentDraft,
                name: event.target.value,
              }))
            }
          />
          {errors.name ? (
            <p className={graphVisualClasses.inspectorErrorText}>{errors.name}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor={`inspector-node-tags-${node.id}`}>Tags</Label>
          <Input
            id={`inspector-node-tags-${node.id}`}
            name="node-tags"
            value={tagsText}
            disabled={!authoring.canEditNode}
            placeholder="finance, critical"
            onChange={(event) => {
              const nextTagsText = event.target.value;
              setTagsText(nextTagsText);
              setDraft((currentDraft) => ({
                ...currentDraft,
                tags: Array.from(
                  new Set(
                    nextTagsText
                      .split(',')
                      .map((tag) => tag.trim())
                      .filter((tag) => tag.length > 0)
                  )
                ),
              }));
            }}
          />
        </div>

        <DbtAuthoringFields
          node={node}
          nodes={nodes}
          edges={edges}
          disabled={!authoring.canEditNode}
          draft={draft}
          errors={errors}
          onChange={setDraft}
        />

        <DvtAuthoringFields
          node={node}
          disabled={!authoring.canEditNode}
          draft={draft}
          errors={errors}
          onChange={setDraft}
        />

        <div className="space-y-2">
          <Label htmlFor={`inspector-node-description-${node.id}`}>Description</Label>
          <Textarea
            id={`inspector-node-description-${node.id}`}
            name="node-description"
            value={draft.description}
            disabled={!authoring.canEditNode}
            onChange={(event) =>
              setDraft((currentDraft) => ({
                ...currentDraft,
                description: event.target.value,
              }))
            }
          />
        </div>

        {!authoring.canEditNode ? (
          <p className={graphVisualClasses.inspectorBody}>
            Node details are read-only for this workspace state.
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
                setTagsText(nextDraft.tags.join(', '));
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={!canApply}
              onClick={() => {
                if (!canApply) {
                  return;
                }
                authoring.onApplyNodeDraft(draft);
              }}
            >
              Apply
            </Button>
          </div>
        ) : null}
      </div>
    </section>
  );
}
