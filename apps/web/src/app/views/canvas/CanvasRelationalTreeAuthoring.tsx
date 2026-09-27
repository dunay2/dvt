/** Own the authoring toolbar, viewport and inspector against the existing workbench session. */
import type { CanvasRelationalTreeWorkbenchCopy } from './canvasRelationalTreeWorkbench.types';
import type {
  CanvasRelationalTreeAuthoringDto,
  CanvasRelationalTreeAuthoringActions,
} from './canvasRelationalTreeAuthoringView';
import { CanvasRelationalTreeDraftViewport } from './CanvasRelationalTreeDraftViewport';
import { CanvasRelationalTreeInlineEditor } from './CanvasRelationalTreeInlineEditor';
import { CanvasRelationalTreeOperationShelf } from './CanvasRelationalTreeOperationShelf';
import { CanvasRelationalTreeAuthoringTemplate } from './CanvasRelationalTreeAuthoring.templates';
import { PendingSourceOccurrenceProperties } from './relational-source-occurrence/PendingSourceOccurrenceProperties';
import { sourceOccurrenceAliases } from './relational-source-occurrence/sourceOccurrenceAlias';
import { CanvasStagedOperationInspector } from './CanvasStagedOperationInspector';

export function CanvasRelationalTreeAuthoring({
  data,
  actions,
  copy,
  expanded,
  onExpandedChange,
  onPendingConditionChange,
}: Readonly<{
  data: CanvasRelationalTreeAuthoringDto;
  actions: CanvasRelationalTreeAuthoringActions;
  copy: CanvasRelationalTreeWorkbenchCopy;
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  onPendingConditionChange: (pending: boolean) => void;
}>): JSX.Element {
  const { selectedRelationId, transformNode } = data;
  const pending = data.pendingSources.find(
    (item) => item.read.binding.relationId === data.selectedPendingId
  );
  const staged = data.stagedOperations.find(
    (operation) => operation.id === data.selectedStagedOperationId
  );
  const reservedAliases = data.pendingSources.map((item) => item.read.binding.displayName);
  const close = () => {
    actions.selectRelation(null);
    onExpandedChange(false);
  };
  const expand = (id: string | null) => {
    actions.selectRelation(id);
    onExpandedChange(true);
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
          onExpandRelation={expand}
        />
      }
      inspector={
        staged != null ? (
          <CanvasStagedOperationInspector
            staged={staged}
            draft={data.draft}
            copy={copy}
            onChange={actions.changeDraft}
            onComplete={() => actions.removeStagedOperation(staged.id)}
            onRemove={() => actions.removeStagedOperation(staged.id)}
            onPendingChange={onPendingConditionChange}
          />
        ) : pending != null ? (
          <PendingSourceOccurrenceProperties
            key={pending.read.binding.relationId}
            occurrence={pending}
            occupied={
              new Set([
                ...sourceOccurrenceAliases(data.draft?.sidecar.relations ?? []),
                ...data.pendingSources
                  .filter((item) => item !== pending)
                  .map((item) => item.read.binding.displayName),
              ])
            }
            actions={{
              rename: (alias) => actions.renamePending(pending.read.binding.relationId, alias),
              close,
            }}
            onPendingChange={onPendingConditionChange}
          />
        ) : (
          <CanvasRelationalTreeInlineEditor
            reservedAliases={reservedAliases}
            copy={copy}
            joinDraft={data.draft}
            operation={data.operation}
            onChangeJoinDraft={actions.changeDraft}
            onPendingConditionChange={onPendingConditionChange}
            selectedRelationId={selectedRelationId}
            transformNode={transformNode}
            expanded={expanded}
            onClose={() => onExpandedChange(false)}
          />
        )
      }
    />
  );
}
