/** Owned concern: compose the applied read-only tree and its explicit editing entry. */
import type { CanonicalNode } from '../../types/canonical';
import type { CanvasRelationalTreeWorkbenchCopy } from './canvasRelationalTreeWorkbench.types';
import type { useCanvasRelationalTreeWorkbenchModel } from './useCanvasRelationalTreeWorkbenchModel';
import { CanvasRelationalTreeOperationShelf } from './CanvasRelationalTreeOperationShelf';
import { CanvasRelationalTreeView } from './CanvasRelationalTreeView';
import { CanvasRelationalTreeEditorFrame } from './CanvasRelationalTreeEditorFrame';
import { CanvasRelationalJoinExpressionTree } from './CanvasRelationalJoinExpressionTree';

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
        operation={model.projection.root.operator === 'join' ? 'inner_join' : null}
        selectedInputCount={model.inputs.length}
        onSelectOperation={model.session.selectOperation}
      />
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <CanvasRelationalTreeView
          transformNode={transformNode}
          outputName={transformNode.name}
          root={model.projection.root}
          selectedLocator={model.selectedLocator}
          copy={copy}
          onSelect={model.selectTreeNode}
          onRemove={model.authoringAvailable ? model.session.removal.remove : undefined}
          onExpand={(locator) => {
            model.selectTreeNode(locator);
            onExpandedChange(true);
            if (model.authoringAvailable) model.session.start();
          }}
        />
      </div>
      {expanded && model.selectedNode?.operator === 'join' ? (
        <CanvasRelationalTreeEditorFrame title="INNER JOIN" onClose={() => onExpandedChange(false)}>
          <CanvasRelationalJoinExpressionTree
            transformNode={transformNode}
            relationId={model.selectedNode.relationId}
          />
        </CanvasRelationalTreeEditorFrame>
      ) : null}
    </div>
  );
}
