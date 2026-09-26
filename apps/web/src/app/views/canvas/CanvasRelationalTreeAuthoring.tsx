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
    data.appendInput == null
  );
  return (
    <section
      data-slot="canvas-relational-tree-block-canvas"
      aria-label={copy.relationalTreeCanvasLabel}
      className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden"
    >
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
      <div className="canvas-operation-workspace relative flex min-h-0 min-w-0 flex-1 overflow-hidden">
        <CanvasRelationalTreeDraftViewport
          data={data}
          actions={actions}
          copy={copy}
          onExpandRelation={expand}
        />
        <CanvasRelationalTreeInlineEditor
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
      </div>
    </section>
  );
}
