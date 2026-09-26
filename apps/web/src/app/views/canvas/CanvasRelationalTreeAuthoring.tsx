/** Own the authoring toolbar, viewport and inspector against the existing workbench session. */
import type { CanvasRelationalTreeWorkbenchCopy } from './canvasRelationalTreeWorkbench.types';
import type {
  CanvasRelationalTreeAuthoringDto,
  CanvasRelationalTreeAuthoringActions,
} from './canvasRelationalTreeAuthoringView';
import { CanvasRelationalTreeDraftViewport } from './CanvasRelationalTreeDraftViewport';
import { CanvasRelationalTreeInlineEditor } from './CanvasRelationalTreeInlineEditor';
import { CanvasRelationalTreeOperationShelf } from './CanvasRelationalTreeOperationShelf';
import { useCanvasTransformStage } from './useCanvasTransformStage';
import { CanvasRelationalTreeAuthoringTemplate } from './CanvasRelationalTreeAuthoring.templates';
import { PendingSourceOccurrenceProperties } from './relational-source-occurrence/PendingSourceOccurrenceProperties';
import { sourceOccurrenceAliases } from './relational-source-occurrence/sourceOccurrenceAlias';

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
  const pending =
    data.appendInput == null
      ? data.pendingSources.find((item) => item.read.binding.relationId === data.selectedPendingId)
      : undefined;
  const reservedAliases = data.pendingSources.map((item) => item.read.binding.displayName);
  const close = () => {
    actions.selectRelation(null);
    onExpandedChange(false);
  };
  const expand = (id: string | null) => {
    actions.selectRelation(id);
    onExpandedChange(true);
  };
  const transformStage = useCanvasTransformStage(
    selectedRelationId,
    actions.changeDraft,
    (id) => {
      actions.reconcileSelection(id);
      onExpandedChange(true);
    },
    data.appendInput == null && pending == null
  );
  return (
    <CanvasRelationalTreeAuthoringTemplate
      label={copy.relationalTreeCanvasLabel}
      toolbar={
        <CanvasRelationalTreeOperationShelf
          transformStage={transformStage}
          choices={data.choices}
          appending={data.appendInput != null}
          selectedRelationId={selectedRelationId}
          copy={copy}
          operation={data.operation}
          onSelectOperation={actions.selectOperation}
          draft={data.draft}
          editable
          onChangeDraft={actions.changeDraft}
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
        pending != null ? (
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
              connect: () => {
                actions.connectPending(pending.read.binding.relationId);
                onExpandedChange(true);
              },
              close,
            }}
            onPendingChange={onPendingConditionChange}
          />
        ) : (
          <CanvasRelationalTreeInlineEditor
            reservedAliases={reservedAliases}
            appendInput={data.appendInput}
            copy={copy}
            joinDraft={data.draft}
            operation={data.operation}
            onAppendJoinInput={actions.appendJoinInput}
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
