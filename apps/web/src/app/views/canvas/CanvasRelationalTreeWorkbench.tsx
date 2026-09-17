/** Owned concern: compose the source catalogue and central block Workbench for one Transform. */

import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import type {
  CanvasRelationalTreeAuthoringContract,
  CanvasRelationalTreeWorkbenchCopy,
} from './canvasRelationalTreeWorkbench.types';
import { CanvasRelationalTreeAuthoringPrompt } from './CanvasRelationalTreeAuthoringPrompt';
import { CanvasRelationalTreeNodeDetail } from './CanvasRelationalTreeNodeDetail';
import { CanvasRelationalTreeBlockCanvas } from './CanvasRelationalTreeBlockCanvas';
import { CanvasRelationalTreeSourceCatalogue } from './CanvasRelationalTreeSourceCatalogue';
import { CanvasRelationalTreeView } from './CanvasRelationalTreeView';
import { useCanvasRelationalTreeWorkbenchModel } from './useCanvasRelationalTreeWorkbenchModel';

export function canOpenCanvasRelationalTreeWorkbench(node: CanonicalNode): boolean {
  return node.pluginId === 'dvt' && node.kind === 'dvt:transform' && node.role === 'transform';
}

export function CanvasRelationalTreeWorkbench({
  transformNode,
  nodes,
  edges,
  copy,
  authoring,
}: Readonly<{
  transformNode: CanonicalNode;
  nodes: readonly CanonicalNode[];
  edges: readonly CanonicalEdge[];
  copy: CanvasRelationalTreeWorkbenchCopy;
  authoring?: CanvasRelationalTreeAuthoringContract;
}>): JSX.Element {
  const model = useCanvasRelationalTreeWorkbenchModel({
    transformNode,
    nodes,
    edges,
    copy,
    authoring,
  });
  const showAuthoring =
    model.authoringAvailable && (model.projection == null || model.session.active);
  const pendingInputCount = model.catalogue.filter((item) => item.state === 'pending').length;

  return (
    <div
      data-slot="canvas-relational-tree-workbench"
      className="grid h-full min-h-0 grid-cols-1 grid-rows-[auto_minmax(0,1fr)] overflow-hidden rounded border border-(--border-subtle) bg-(--surface-panel) md:grid-cols-[12rem_minmax(0,1fr)] md:grid-rows-1"
    >
      <CanvasRelationalTreeSourceCatalogue
        items={model.catalogue}
        copy={copy}
        draggable={model.authoringAvailable}
        onBeginDrag={model.session.start}
        onSelect={model.selectCatalogueItem}
      />
      {showAuthoring ? (
        <CanvasRelationalTreeBlockCanvas
          appendInput={model.session.appendInput}
          choices={model.session.choices}
          copy={copy}
          edges={edges}
          inputs={model.inputs}
          joinDraft={model.session.joinDraft}
          nodes={nodes}
          operation={model.session.operation}
          primaryInputId={model.session.primaryInputId}
          secondaryInputId={model.session.secondaryInputId}
          selectedInputIds={model.session.selectedInputIds}
          transformNode={transformNode}
          onAppendJoinInput={model.session.appendJoinInput}
          onApply={model.session.apply}
          onCancel={model.session.cancel}
          onChangeJoinDraft={model.session.setJoinDraft}
          onPlaceInput={model.session.placeInput}
          onSelectInput={model.session.selectInput}
          onSelectOperation={model.session.selectOperation}
        />
      ) : model.projection == null ? (
        <section
          data-slot="canvas-relational-tree-unavailable"
          className="grid min-h-64 place-items-center p-6 text-center text-sm text-(--text-muted)"
        >
          {model.unavailableMessage}
        </section>
      ) : (
        <div
          data-slot="canvas-relational-tree-inspection"
          className="grid h-full min-h-0 grid-cols-1 grid-rows-[minmax(16rem,1fr)_auto] overflow-hidden md:grid-cols-[minmax(0,1fr)_17rem] md:grid-rows-1"
        >
          <div className="flex min-h-0 flex-col overflow-hidden">
            {!model.authoringAvailable ? null : (
              <CanvasRelationalTreeAuthoringPrompt
                copy={copy}
                pendingInputCount={pendingInputCount}
                onStart={model.session.start}
              />
            )}
            <CanvasRelationalTreeView
              outputName={transformNode.name}
              root={model.projection.root}
              selectedLocator={model.selectedLocator}
              copy={copy}
              onSelect={model.selectTreeNode}
            />
          </div>
          <CanvasRelationalTreeNodeDetail node={model.selectedNode} copy={copy} />
        </div>
      )}
    </div>
  );
}
