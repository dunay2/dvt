/** Owned concern: compose the applied read-only tree and its explicit editing entry. */
import type { CanonicalNode } from '../../types/canonical';
import type { CanvasRelationalTreeWorkbenchCopy } from './canvasRelationalTreeWorkbench.types';
import type { useCanvasRelationalTreeWorkbenchModel } from './useCanvasRelationalTreeWorkbenchModel';
import { CanvasRelationalTreeOperationShelf } from './CanvasRelationalTreeOperationShelf';
import { CanvasRelationalTreeView } from './CanvasRelationalTreeView';
import { CanvasRelationalTreeEditorFrame } from './CanvasRelationalTreeEditorFrame';
import { CanvasRelationalJoinExpressionTree } from './CanvasRelationalJoinExpressionTree';
import { CanvasRelationalTreeOperatorTools } from './CanvasRelationalTreeOperatorTools';
import { CanvasRelationalCrossNotice } from './CanvasRelationalCrossNotice';

export function CanvasRelationalTreeInspection({
  model,
  transformNode,
  copy,
  expanded,
  onExpandedChange,
}: Readonly<{
  model: ReturnType<typeof useCanvasRelationalTreeWorkbenchModel>;
  transformNode: CanonicalNode;
  copy: CanvasRelationalTreeWorkbenchCopy;
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
}>): JSX.Element | null {
  if (model.projection == null) return null;
  return (
    <div
      data-slot="canvas-relational-tree-inspection"
      className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden"
    >
      <CanvasRelationalTreeOperationShelf
        choices={model.session.choices}
        copy={copy}
        hasOperands
        operation={model.session.seed?.operation ?? null}
        selectedInputCount={model.session.seed?.inputIds.length ?? 0}
        onSelectOperation={model.session.selectOperation}
      >
        <CanvasRelationalTreeOperatorTools
          draft={model.session.seed?.draft ?? null}
          editable={model.authoringAvailable}
          onChange={model.session.setJoinDraft}
        />
      </CanvasRelationalTreeOperationShelf>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
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
            model.selectTreeNode(locator);
            onExpandedChange(true);
            if (model.authoringAvailable) model.session.start();
          }}
        />
      </div>
      {expanded &&
      model.selectedNode != null &&
      (model.selectedNode.expressionRefs.length > 0 ||
        model.selectedNode.operator === 'cross' ||
        (model.authoringAvailable && model.selectedNode.operator === 'fetch')) ? (
        <CanvasRelationalTreeEditorFrame
          operation={model.selectedNode.operation ?? 'unsupported'}
          relationId={model.selectedNode.relationId}
          onClose={() => onExpandedChange(false)}
        >
          {model.selectedNode.operator === 'cross' ? (
            <CanvasRelationalCrossNotice />
          ) : (
            <CanvasRelationalJoinExpressionTree
              transformNode={transformNode}
              relationId={model.selectedNode.relationId}
            />
          )}
        </CanvasRelationalTreeEditorFrame>
      ) : null}
    </div>
  );
}
