/** Owned concern: render the route-owned Inspector authoring surface for governed node details. */
import { useEffect, useMemo, useState } from 'react';

import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { graphVisualClasses } from '../../plugins/graph/graphVisualTokens';
import type { CanonicalNode } from '../../types/canonical';
import {
  createCanvasInspectorNodeDraft,
  hasCanvasInspectorNodeDraftChanges,
  validateCanvasInspectorNodeDraft,
} from './canvasInspectorAuthoringModel';
import type { CanvasInspectorAuthoringContract } from './canvasInspectorAuthoring.types';

type CanvasInspectorAuthoringSectionProps = Readonly<{
  node: CanonicalNode;
  authoring: CanvasInspectorAuthoringContract;
}>;

export function CanvasInspectorAuthoringSection({
  node,
  authoring,
}: CanvasInspectorAuthoringSectionProps) {
  const [draft, setDraft] = useState(() => createCanvasInspectorNodeDraft(node));

  useEffect(() => {
    setDraft(createCanvasInspectorNodeDraft(node));
  }, [node.description, node.id, node.name]);

  const errors = useMemo(() => validateCanvasInspectorNodeDraft(draft), [draft]);
  const isDirty = useMemo(() => hasCanvasInspectorNodeDraftChanges(node, draft), [draft, node]);
  const canApply = authoring.canEditNode && isDirty && Object.keys(errors).length === 0;

  return (
    <Card className={graphVisualClasses.inspectorCard}>
      <div className="space-y-3">
        <div>
          <h3 className={graphVisualClasses.contextPanelSectionTitle}>Node details</h3>
          <p className={graphVisualClasses.inspectorBody}>
            Name and description saved with this canvas.
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
              onClick={() => setDraft(createCanvasInspectorNodeDraft(node))}
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
    </Card>
  );
}
