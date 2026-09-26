/** Owned concern: compose the applied read-only tree and its explicit editing entry. */
import type { ComponentProps } from 'react';
import { CanvasRelationalTreeOperationShelf } from './CanvasRelationalTreeOperationShelf';
import { CanvasRelationalTreeSideInspector } from './CanvasRelationalTreeSideInspector';
import { CanvasRelationalTreeView } from './CanvasRelationalTreeView';
import { useCanvasTransformStage } from './useCanvasTransformStage';

export function CanvasRelationalTreeInspection(
  props: ComponentProps<typeof CanvasRelationalTreeSideInspector>
): JSX.Element | null {
  const { model, transformNode, copy, onExpandedChange, modelOutput } = props;
  const transformStage = useCanvasTransformStage(
    model.selectedNode?.relationId ?? null,
    model.session.applyOutputOrder,
    (relationId) => {
      model.selectRelation(relationId);
      modelOutput.setOpen(false);
      onExpandedChange(true);
    },
    model.authoringAvailable
  );
  if (model.projection == null) return null;
  return (
    <div
      data-slot="canvas-relational-tree-inspection"
      className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden"
    >
      <CanvasRelationalTreeOperationShelf
        transformStage={transformStage}
        choices={model.session.choices}
        selectedRelationId={model.selectedNode?.relationId ?? null}
        copy={copy}
        operation={model.session.seed?.operation ?? null}
        onSelectOperation={model.session.selectOperation}
        draft={model.session.seed?.draft ?? null}
        editable={model.authoringAvailable}
        onChangeDraft={model.session.setJoinDraft}
      />
      <div className="canvas-operation-workspace relative flex min-h-0 min-w-0 flex-1 overflow-hidden">
        <CanvasRelationalTreeView
          transformNode={transformNode}
          outputName={transformNode.name}
          root={model.projection.root}
          selectedLocator={model.selectedLocator}
          copy={copy}
          onSelect={model.selectTreeNode}
          onDropSource={model.authoringAvailable ? model.session.selectInput : undefined}
          onRemove={model.authoringAvailable ? model.session.removal.remove : undefined}
          onExpand={(locator) => {
            modelOutput.setOpen(false);
            model.selectTreeNode(locator);
            onExpandedChange(true);
          }}
          onOpenOutput={() => {
            onExpandedChange(false);
            modelOutput.setOpen(true);
          }}
        />
        <CanvasRelationalTreeSideInspector {...props} />
      </div>
    </div>
  );
}
