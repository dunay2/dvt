/** Own the authoring toolbar, viewport and inspector against the existing workbench session. */
import { useMemo } from 'react';
import type { CanvasRelationalTreeWorkbenchCopy } from './canvasRelationalTreeWorkbench.types';
import type {
  CanvasRelationalTreeAuthoringDto,
  CanvasRelationalTreeAuthoringActions,
} from './canvasRelationalTreeAuthoringView';
import { CanvasRelationalTreeDraftViewport } from './CanvasRelationalTreeDraftViewport';
import { CanvasRelationalTreeInlineEditor } from './CanvasRelationalTreeInlineEditor';
import { CanvasRelationalTreeOperationShelf } from './CanvasRelationalTreeOperationShelf';
import { CanvasRelationalTreeAuthoringTemplate } from './CanvasRelationalTreeAuthoring.templates';
import { CanvasStagedOperationInspector } from './CanvasStagedOperationInspector';
import { CanvasPendingSourceInspector } from './CanvasPendingSourceOutputs';
import {
  resolveCanvasStagedProducerDocument,
  resolveCanvasStagedEditingDocument,
} from './canvasStagedOperationDocument';

export function CanvasRelationalTreeAuthoring({
  data,
  actions,
  copy,
  expanded,
  onExpandedChange,
  onPendingConditionChange,
  sourceOutputFieldsByRelationId,
}: Readonly<{
  data: CanvasRelationalTreeAuthoringDto;
  actions: CanvasRelationalTreeAuthoringActions;
  copy: CanvasRelationalTreeWorkbenchCopy;
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  onPendingConditionChange: (pending: boolean) => void;
  sourceOutputFieldsByRelationId: ReadonlyMap<string, readonly string[]>;
}>): JSX.Element {
  const { selectedPendingId: pendingId, selectedStagedOperationId: stagedId } = data;
  const pending = data.pendingSources.find((item) => item.read.binding.relationId === pendingId);
  const staged = data.stagedOperations.find((operation) => operation.id === stagedId);
  const { editingDocument, producerDocument } = useMemo(
    () => ({
      editingDocument:
        staged == null ? null : resolveCanvasStagedEditingDocument(staged, data.stagedOperations),
      producerDocument: resolveCanvasStagedProducerDocument({
        relationId: staged?.inputs[0] ?? null,
        canonical: data.draft,
        operations: data.stagedOperations,
        sources: data.pendingSources,
      }),
    }),
    [staged, data.draft, data.stagedOperations, data.pendingSources]
  );
  const expand = (id: string | null, open = true) => {
    actions.selectRelation(id);
    onExpandedChange(open);
  };
  return (
    <CanvasRelationalTreeAuthoringTemplate
      label={copy.relationalTreeCanvasLabel}
      toolbar={
        <CanvasRelationalTreeOperationShelf
          copy={copy}
          editable
          onStageOperation={actions.stageOperation}
        />
      }
      viewport={
        <CanvasRelationalTreeDraftViewport
          data={data}
          actions={actions}
          copy={copy}
          sourceOutputFieldsByRelationId={sourceOutputFieldsByRelationId}
          onExpandRelation={expand}
        />
      }
      inspector={
        staged != null ? (
          <CanvasStagedOperationInspector
            binding={data.analysisBinding}
            staged={staged}
            editingDocument={editingDocument}
            producerDocument={producerDocument}
            transformNode={data.transformNode}
            copy={copy}
            onClose={actions.clearStagedOperationSelection}
            onPendingChange={onPendingConditionChange}
            onUpdate={(update) => actions.updateStagedOperation(staged.id, update)}
            onReconfigure={() => actions.updateStagedOperation(staged.id, 'reconfigure')}
          />
        ) : pending != null ? (
          <CanvasPendingSourceInspector
            key={pending.read.binding.relationId}
            data={data}
            actions={actions}
            occurrence={pending}
            publishedFieldNames={
              sourceOutputFieldsByRelationId.get(pending.read.binding.relationId) ?? []
            }
            onClose={() => expand(null, false)}
            onPendingChange={onPendingConditionChange}
          />
        ) : (
          <CanvasRelationalTreeInlineEditor
            sourceOutputFieldsByRelationId={sourceOutputFieldsByRelationId}
            reservedAliases={data.pendingSources.map((item) => item.read.binding.displayName)}
            copy={copy}
            joinDraft={data.draft}
            operation={data.operation}
            onChangeJoinDraft={actions.changeDraft}
            onSelectRelation={actions.reconcileSelection}
            onPendingConditionChange={onPendingConditionChange}
            selectedRelationId={data.selectedRelationId}
            transformNode={data.transformNode}
            expanded={expanded}
            onClose={() => onExpandedChange(false)}
          />
        )
      }
    />
  );
}
