/** Select the existing draft operation or Source inspector for the active card. */
import { useMemo } from 'react';
import type { CanvasRelationalTreeWorkbenchCopy } from './canvasRelationalTreeWorkbench.types';
import type {
  CanvasRelationalTreeAuthoringDto,
  CanvasRelationalTreeAuthoringActions,
} from './canvasRelationalTreeAuthoringView';
import { CanvasRelationalTreeInlineEditor } from './CanvasRelationalTreeInlineEditor';
import { CanvasStagedOperationInspector } from './CanvasStagedOperationInspector';
import { CanvasPendingSourceInspector } from './CanvasPendingSourceOutputs';
import {
  resolveCanvasStagedProducerDocument,
  resolveCanvasStagedEditingDocument,
} from './canvasStagedOperationDocument';

export type CanvasRelationalOperationDraftInspectorProps = Readonly<{
  data: CanvasRelationalTreeAuthoringDto;
  actions: CanvasRelationalTreeAuthoringActions;
  copy: CanvasRelationalTreeWorkbenchCopy;
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  onPendingConditionChange: (pending: boolean) => void;
  sourceOutputFieldsByRelationId: ReadonlyMap<string, readonly string[]>;
}>;

export function CanvasRelationalOperationDraftInspector({
  data,
  actions,
  copy,
  expanded,
  onExpandedChange,
  onPendingConditionChange,
  sourceOutputFieldsByRelationId,
}: CanvasRelationalOperationDraftInspectorProps): JSX.Element {
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
  if (staged != null)
    return (
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
    );
  if (pending != null)
    return (
      <CanvasPendingSourceInspector
        key={pending.read.binding.relationId}
        data={data}
        actions={actions}
        occurrence={pending}
        publishedFieldNames={
          sourceOutputFieldsByRelationId.get(pending.read.binding.relationId) ?? []
        }
        onClose={() => {
          actions.selectRelation(null);
          onExpandedChange(false);
        }}
        onPendingChange={onPendingConditionChange}
      />
    );
  return (
    <CanvasRelationalTreeInlineEditor
      sourceInputRecovery={data.sourceInputRecovery}
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
  );
}
