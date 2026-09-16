/** Owned concern: compose the three-region contextual Workbench for one Transform relational tree. */

import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import type {
  CanvasRelationalTreeAuthoringContract,
  CanvasRelationalTreeWorkbenchCopy,
} from './canvasRelationalTreeWorkbench.types';
import { CanvasRelationalTreeNodeDetail } from './CanvasRelationalTreeNodeDetail';
import { CanvasRelationalTreeAuthoringPanel } from './CanvasRelationalTreeAuthoringPanel';
import { CanvasRelationalTreeDraftView } from './CanvasRelationalTreeDraftView';
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

  return (
    <div
      data-slot="canvas-relational-tree-workbench"
      className="grid min-h-0 grid-cols-1 overflow-auto rounded border border-(--border-subtle) bg-(--surface-panel) lg:h-full lg:grid-cols-[12rem_minmax(18rem,1fr)_minmax(15rem,20rem)] lg:overflow-hidden"
    >
      <CanvasRelationalTreeSourceCatalogue
        items={model.catalogue}
        copy={copy}
        onSelect={model.selectCatalogueItem}
      />
      {model.pendingAuthoring && model.session.firstInputId != null ? (
        <CanvasRelationalTreeDraftView
          copy={copy}
          inputs={model.inputs}
          operation={model.session.operation}
          selectedInputIds={model.session.selectedInputIds}
        />
      ) : model.projection == null ? (
        <section
          data-slot="canvas-relational-tree-unavailable"
          className="grid min-h-64 place-items-center p-6 text-center text-sm text-(--text-muted)"
        >
          {model.unavailableMessage}
        </section>
      ) : (
        <CanvasRelationalTreeView
          root={model.projection.root}
          selectedLocator={model.selectedLocator}
          copy={copy}
          onSelect={model.selectTreeNode}
        />
      )}
      {model.pendingAuthoring ? (
        <CanvasRelationalTreeAuthoringPanel
          appendInput={model.session.appendInput}
          choices={model.session.choices}
          copy={copy}
          firstInputId={model.session.firstInputId}
          inputs={model.inputs}
          joinDraft={model.session.joinDraft}
          operation={model.session.operation}
          selectedInputIds={model.session.selectedInputIds}
          onAppendJoinInput={model.session.appendJoinInput}
          onApply={model.session.apply}
          onCancel={model.session.cancel}
          onChangeJoinDraft={model.session.setJoinDraft}
          onSelectOperation={model.session.selectOperation}
        />
      ) : (
        <CanvasRelationalTreeNodeDetail node={model.selectedNode} copy={copy} />
      )}
    </div>
  );
}
