/** Owned concern: orchestrate the route-owned Inspector authoring surface for governed node details. */
import { type Dispatch, type SetStateAction, useEffect, useMemo, useState } from 'react';

import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { inspectorVisualClasses } from '../../components/inspector/inspectorVisualTokens';
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import { formatCanvasInspectorNodeDraftError } from './canvasCopyFormatting';
import {
  createCanvasInspectorNodeDraft,
  hasCanvasInspectorNodeDraftChanges,
  validateCanvasInspectorNodeDraft,
} from './canvasInspectorAuthoringModel';
import type { CanvasInspectorAuthoringContract } from './canvasInspectorAuthoring.types';
import { canvasViewCopy } from './copy';
import { DbtAuthoringFields } from './DbtAuthoringFields';
import { DvtAuthoringFields } from './DvtAuthoringFields';

type CanvasInspectorAuthoringSectionProps = Readonly<{
  node: CanonicalNode;
  nodes: readonly CanonicalNode[];
  edges: readonly CanonicalEdge[];
  authoring: CanvasInspectorAuthoringContract;
  section?: 'all' | 'general' | 'columns' | 'code' | 'sink';
  draftController?: Readonly<{
    draft: ReturnType<typeof createCanvasInspectorNodeDraft>;
    tagsText: string;
    onDraftChange: Dispatch<SetStateAction<ReturnType<typeof createCanvasInspectorNodeDraft>>>;
    onTagsTextChange: Dispatch<SetStateAction<string>>;
    onResetDraft: () => void;
  }>;
}>;

export function CanvasInspectorAuthoringSection({
  node,
  nodes,
  edges,
  authoring,
  section = 'all',
  draftController,
}: CanvasInspectorAuthoringSectionProps) {
  const [localDraft, setLocalDraft] = useState(() => createCanvasInspectorNodeDraft(node));
  const [localTagsText, setLocalTagsText] = useState(() =>
    createCanvasInspectorNodeDraft(node).tags.join(', ')
  );
  const draft = draftController?.draft ?? localDraft;
  const tagsText = draftController?.tagsText ?? localTagsText;
  const setDraft = draftController?.onDraftChange ?? setLocalDraft;
  const setTagsText = draftController?.onTagsTextChange ?? setLocalTagsText;

  useEffect(() => {
    if (draftController != null) {
      return;
    }

    const nextDraft = createCanvasInspectorNodeDraft(node);
    setLocalDraft(nextDraft);
    setLocalTagsText(nextDraft.tags.join(', '));
  }, [draftController, node.description, node.id, node.metadata, node.name, node.tags]);

  const errors = useMemo(() => validateCanvasInspectorNodeDraft(draft), [draft]);
  const isDirty = useMemo(() => hasCanvasInspectorNodeDraftChanges(node, draft), [draft, node]);
  const canApply = authoring.canEditNode && isDirty && Object.keys(errors).length === 0;
  const showGeneral = section === 'all' || section === 'general';
  const showDvtAuthoring =
    draft.dvt != null &&
    (section === 'all' ||
      (section === 'general' && draft.dvt.kind === 'source') ||
      (section === 'columns' && draft.dvt.kind === 'sql_transform') ||
      (section === 'code' && draft.dvt.kind === 'sql_transform') ||
      (section === 'sink' && draft.dvt.kind === 'sink'));
  const showDbtAuthoring =
    draft.dbt != null &&
    (section === 'all' ||
      section === 'general' ||
      (section === 'code' && node.kind === 'dbt:model'));
  const dvtAuthoringSection = section === 'sink' ? 'general' : section;

  if (!showGeneral && !showDvtAuthoring && !showDbtAuthoring) {
    return null;
  }

  return (
    <section
      data-slot="node-inspector-editable-section"
      className={inspectorVisualClasses.contextPanelDetailsSection}
    >
      <div className="space-y-3">
        {showGeneral ? (
          <>
            <div>
              <h3 className={inspectorVisualClasses.contextPanelSectionTitle}>
                {canvasViewCopy.inspectorEditablePropertiesTitle}
              </h3>
              <p className={inspectorVisualClasses.inspectorBody}>
                {canvasViewCopy.inspectorEditablePropertiesDescription}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor={`inspector-node-name-${node.id}`}>
                {canvasViewCopy.inspectorNodeNameLabel}
              </Label>
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
                <p className={inspectorVisualClasses.inspectorErrorText}>
                  {formatCanvasInspectorNodeDraftError(errors.name, canvasViewCopy)}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor={`inspector-node-tags-${node.id}`}>
                {canvasViewCopy.inspectorNodeTagsLabel}
              </Label>
              <Input
                id={`inspector-node-tags-${node.id}`}
                name="node-tags"
                value={tagsText}
                disabled={!authoring.canEditNode}
                placeholder={canvasViewCopy.inspectorNodeTagsPlaceholder}
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
          </>
        ) : null}

        {showDbtAuthoring ? (
          <DbtAuthoringFields
            node={node}
            nodes={nodes}
            edges={edges}
            disabled={!authoring.canEditNode}
            draft={draft}
            errors={errors}
            section={section === 'code' ? 'code' : 'general'}
            onChange={setDraft}
          />
        ) : null}

        {showDvtAuthoring ? (
          <DvtAuthoringFields
            node={node}
            nodes={nodes}
            edges={edges}
            disabled={!authoring.canEditNode}
            draft={draft}
            errors={errors}
            section={dvtAuthoringSection}
            onChange={setDraft}
          />
        ) : null}

        {showGeneral ? (
          <div className="space-y-2">
            <Label htmlFor={`inspector-node-description-${node.id}`}>
              {canvasViewCopy.inspectorNodeDescriptionLabel}
            </Label>
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
        ) : null}

        {!authoring.canEditNode && showGeneral ? (
          <p className={inspectorVisualClasses.inspectorBody}>
            {canvasViewCopy.inspectorNodeReadOnlyMessage}
          </p>
        ) : null}

        {authoring.canEditNode && isDirty ? (
          <div className="flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                if (draftController != null) {
                  draftController.onResetDraft();
                  return;
                }

                const nextDraft = createCanvasInspectorNodeDraft(node);
                setLocalDraft(nextDraft);
                setLocalTagsText(nextDraft.tags.join(', '));
              }}
            >
              {canvasViewCopy.inspectorCancelLabel}
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
              {canvasViewCopy.inspectorApplyLabel}
            </Button>
          </div>
        ) : null}
      </div>
    </section>
  );
}
