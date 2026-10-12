/** Owned concern: orchestrate the route-owned Inspector authoring surface for governed node details. */

import { Button } from '../../components/ui/button';
import { inspectorVisualClasses } from '../../components/inspector/inspectorVisualTokens';
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import { useCanvasInspectorDraftSubmission } from './useCanvasInspectorDraftSubmission';
import type { CanvasInspectorAuthoringContract } from './canvasInspectorAuthoring.types';
import { canvasViewCopy } from './copy';
import { CanvasInspectorMetadataFields } from './CanvasInspectorMetadataFields';
import { DbtAuthoringFields } from './DbtAuthoringFields';
import { DvtAuthoringFields } from './DvtAuthoringFields';
import type { CanvasNodeWorkbenchDraftController } from './useCanvasNodeWorkbenchDraftController';
import { ObjectFilePostgresAuthoringFields } from '../../plugins/objectFilePostgres/ObjectFilePostgresAuthoringFields';
import { HttpJsonArtifactAuthoringFields } from '../../plugins/httpJson/HttpJsonArtifactAuthoringFields';
import { isDbtCompatibleModel } from './canvasDbtAuthoringModel';

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
  const setDraft = draftController.onDraftChange;

  const { errors, isDirty, canApply, commitDbtModelDraft, commitCurrentDbtModelDraft, applyDraft } =
    useCanvasInspectorDraftSubmission({ node, nodes, edges, authoring, draftController });
  const showGeneral = section === 'all' || section === 'general';
  const showDvtAuthoring =
    draft.dvt != null &&
    (section === 'all' ||
      (section === 'general' && (draft.dvt.kind === 'source' || draft.dvt.kind === 'transform')) ||
      (section === 'code' && draft.dvt.kind === 'transform') ||
      (section === 'columns' && (draft.dvt.kind === 'transform' || draft.dvt.kind === 'source')) ||
      (section === 'sink' && draft.dvt.kind === 'sink'));
  const showDbtAuthoring =
    (draft.dbt != null || draft.dbtTest != null) &&
    (section === 'all' ||
      section === 'general' ||
      (section === 'code' && isDbtCompatibleModel(node)));
  const showObjectFilePostgresAuthoring =
    draft.objectFilePostgres != null && (section === 'all' || section === 'general');
  const showHttpJsonArtifactAuthoring =
    draft.httpJsonArtifact != null && (section === 'all' || section === 'general');
  const showSemanticAuthoringIssue =
    draft.semanticAuthoringIssue != null &&
    (section === 'all' || section === 'general' || section === 'columns' || section === 'code');
  const dvtAuthoringSection =
    section === 'code'
      ? 'code'
      : section === 'columns'
        ? 'columns'
        : section === 'all'
          ? 'all'
          : 'general';

  if (
    !showGeneral &&
    !showDvtAuthoring &&
    !showDbtAuthoring &&
    !showObjectFilePostgresAuthoring &&
    !showHttpJsonArtifactAuthoring &&
    !showSemanticAuthoringIssue
  ) {
    return null;
  }

  return (
    <section
      data-slot="node-inspector-editable-section"
      className={inspectorVisualClasses.contextPanelDetailsSection}
    >
      <div className="space-y-3">
        <CanvasInspectorMetadataFields
          model={{
            nodeId: node.id,
            draft,
            tagsText: draftController.tagsText,
            errors,
            disabled: !authoring.canEditNode,
            visible: showGeneral,
          }}
          actions={{
            onDraftChange: setDraft,
            onTagsTextChange: draftController.onTagsTextChange,
            onBlur: commitCurrentDbtModelDraft,
          }}
        >
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

          {showSemanticAuthoringIssue ? (
            <div
              data-slot="canvas-inspector-semantic-authoring-issue"
              className={inspectorVisualClasses.contextPanelDetailsSection}
              role="status"
            >
              <p className={inspectorVisualClasses.inspectorTitle}>
                {canvasViewCopy.inspectorSemanticAuthoringUnavailableTitle}
              </p>
              <p className={inspectorVisualClasses.inspectorBody}>
                {draft.semanticAuthoringIssue === 'invalid_document'
                  ? canvasViewCopy.inspectorSemanticAuthoringInvalidMessage
                  : canvasViewCopy.inspectorSemanticAuthoringUnsupportedMessage}
              </p>
            </div>
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
        </CanvasInspectorMetadataFields>

        {authoring.canEditNode && isDirty && !(isDbtCompatibleModel(node) && showGeneral) ? (
          <div className="flex items-center justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={draftController.onResetDraft}>
              {canvasViewCopy.inspectorCancelLabel}
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={!canApply}
              onClick={applyDraft}
            >
              {canvasViewCopy.inspectorApplyLabel}
            </Button>
          </div>
        ) : null}
      </div>
    </section>
  );
}
