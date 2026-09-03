/** Owned concern: orchestrate the route-owned Inspector authoring surface for governed node details. */
import { useMemo } from 'react';

import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { inspectorVisualClasses } from '../../components/inspector/inspectorVisualTokens';
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import { formatCanvasInspectorNodeDraftError } from './canvasCopyFormatting';
import {
  hasCanvasInspectorNodeDraftChanges,
  validateCanvasInspectorNodeDraft,
} from './canvasInspectorAuthoringModel';
import type { CanvasInspectorAuthoringContract } from './canvasInspectorAuthoring.types';
import { canvasViewCopy } from './copy';
import { DbtAuthoringFields } from './DbtAuthoringFields';
import { DvtAuthoringFields } from './DvtAuthoringFields';
import type { CanvasNodeWorkbenchDraftController } from './useCanvasNodeWorkbenchDraftController';
import { ObjectFilePostgresAuthoringFields } from '../../plugins/objectFilePostgres/ObjectFilePostgresAuthoringFields';
import { HttpJsonArtifactAuthoringFields } from '../../plugins/httpJson/HttpJsonArtifactAuthoringFields';

type CanvasInspectorAuthoringSectionProps = Readonly<{
  node: CanonicalNode;
  nodes: readonly CanonicalNode[];
  edges: readonly CanonicalEdge[];
  authoring: CanvasInspectorAuthoringContract;
  section?: 'all' | 'general' | 'columns' | 'code' | 'sink';
  draftController: CanvasNodeWorkbenchDraftController;
}>;

export function CanvasInspectorAuthoringSection({
  node,
  nodes,
  edges,
  authoring,
  section = 'all',
  draftController,
}: CanvasInspectorAuthoringSectionProps) {
  const draft = draftController.draft;
  const tagsText = draftController.tagsText;
  const setDraft = draftController.onDraftChange;
  const setTagsText = draftController.onTagsTextChange;

  const errors = useMemo(
    () =>
      validateCanvasInspectorNodeDraft(draft, {
        node,
        nodes,
        edges,
        workspaceScope: authoring.workspaceScope,
      }),
    [authoring.workspaceScope, draft, edges, node, nodes]
  );
  const isDirty = useMemo(() => hasCanvasInspectorNodeDraftChanges(node, draft), [draft, node]);
  const canApply = authoring.canEditNode && isDirty && Object.keys(errors).length === 0;
  const showGeneral = section === 'all' || section === 'general';
  const showDvtAuthoring =
    draft.dvt != null &&
    (section === 'all' ||
      (section === 'general' && draft.dvt.kind === 'source') ||
      (section === 'code' && draft.dvt.kind === 'transform') ||
      (section === 'columns' && (draft.dvt.kind === 'transform' || draft.dvt.kind === 'source')) ||
      (section === 'sink' && draft.dvt.kind === 'sink'));
  const showDbtAuthoring =
    (draft.dbt != null || draft.dbtTest != null) &&
    (section === 'all' ||
      section === 'general' ||
      (section === 'code' && node.kind === 'dbt:model'));
  const showObjectFilePostgresAuthoring =
    draft.objectFilePostgres != null && (section === 'all' || section === 'general');
  const showHttpJsonArtifactAuthoring =
    draft.httpJsonArtifact != null && (section === 'all' || section === 'general');
  const dvtAuthoringSection =
    section === 'code'
      ? 'code'
      : section === 'columns'
        ? 'columns'
        : section === 'all'
          ? 'all'
          : 'general';
  const commitDbtModelDraft = (nextDraft: typeof draft): void => {
    setDraft(nextDraft);
    const nextErrors = validateCanvasInspectorNodeDraft(nextDraft, {
      node,
      nodes,
      edges,
      workspaceScope: authoring.workspaceScope,
    });
    if (!authoring.canEditNode || Object.keys(nextErrors).length > 0) return;
    authoring.onApplyNodeDraft(nextDraft);
    draftController.onDraftSubmitted(nextDraft);
  };
  const commitCurrentDbtModelDraft = (): void => {
    if (node.kind === 'dbt:model') commitDbtModelDraft(draft);
  };

  if (
    !showGeneral &&
    !showDvtAuthoring &&
    !showDbtAuthoring &&
    !showObjectFilePostgresAuthoring &&
    !showHttpJsonArtifactAuthoring
  ) {
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
                onBlur={commitCurrentDbtModelDraft}
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
                onChange={(event) => setTagsText(event.target.value)}
                onBlur={commitCurrentDbtModelDraft}
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
            onCommitModelChange={commitDbtModelDraft}
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

        {showObjectFilePostgresAuthoring && draft.objectFilePostgres ? (
          <ObjectFilePostgresAuthoringFields
            nodeId={node.id}
            disabled={!authoring.canEditNode}
            draft={draft.objectFilePostgres}
            errors={errors.objectFilePostgres}
            onChange={(objectFilePostgres) =>
              setDraft((currentDraft) => ({ ...currentDraft, objectFilePostgres }))
            }
          />
        ) : null}

        {showHttpJsonArtifactAuthoring && draft.httpJsonArtifact ? (
          <HttpJsonArtifactAuthoringFields
            nodeId={node.id}
            disabled={!authoring.canEditNode}
            draft={draft.httpJsonArtifact}
            errors={errors.httpJsonArtifact}
            onChange={(httpJsonArtifact) =>
              setDraft((currentDraft) => ({ ...currentDraft, httpJsonArtifact }))
            }
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
              onBlur={commitCurrentDbtModelDraft}
            />
          </div>
        ) : null}

        {!authoring.canEditNode && showGeneral ? (
          <p className={inspectorVisualClasses.inspectorBody}>
            {canvasViewCopy.inspectorNodeReadOnlyMessage}
          </p>
        ) : null}

        {authoring.canEditNode && isDirty && !(node.kind === 'dbt:model' && showGeneral) ? (
          <div className="flex items-center justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={draftController.onResetDraft}>
              {canvasViewCopy.inspectorCancelLabel}
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={!canApply}
              onClick={() => {
                if (!canApply) {
                  return;
                }
                authoring.onApplyNodeDraft(draft);
                draftController.onDraftSubmitted(draft);
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
