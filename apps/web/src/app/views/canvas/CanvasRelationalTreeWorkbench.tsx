/** Owned concern: compose the source catalogue and central block Workbench for one Transform. */

import { forwardRef, useEffect, useState } from 'react';
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
import {
  useCanvasRelationalTreeWorkbenchHandle,
  type CanvasRelationalTreeWorkbenchHandle,
} from './useCanvasRelationalTreeWorkbenchHandle';
export type { CanvasRelationalTreeWorkbenchHandle } from './useCanvasRelationalTreeWorkbenchHandle';

export function canOpenCanvasRelationalTreeWorkbench(node: CanonicalNode): boolean {
  return node.pluginId === 'dvt' && node.kind === 'dvt:transform' && node.role === 'transform';
}

export const CanvasRelationalTreeWorkbench = forwardRef<
  CanvasRelationalTreeWorkbenchHandle,
  Readonly<{
    transformNode: CanonicalNode;
    nodes: readonly CanonicalNode[];
    edges: readonly CanonicalEdge[];
    copy: CanvasRelationalTreeWorkbenchCopy;
    authoring?: CanvasRelationalTreeAuthoringContract;
  }>
>(function CanvasRelationalTreeWorkbench(
  { transformNode, nodes, edges, copy, authoring },
  ref
): JSX.Element {
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
  const [pendingCondition, setPendingCondition] = useState(false);
  const [sourcesCollapsed, setSourcesCollapsed] = useState(false);
  useEffect(() => {
    if (!model.session.active) setPendingCondition(false);
  }, [model.session.active]);
  useCanvasRelationalTreeWorkbenchHandle(ref, model, pendingCondition);

  return (
    <div
      data-slot="canvas-relational-tree-workbench"
      className={`grid h-full min-h-0 min-w-0 w-full grid-cols-1 grid-rows-[auto_minmax(0,1fr)] overflow-hidden bg-(--surface-panel) md:grid-rows-1 ${sourcesCollapsed ? 'md:grid-cols-[3rem_minmax(0,1fr)]' : 'md:grid-cols-[14rem_minmax(0,1fr)]'}`}
    >
      <CanvasRelationalTreeSourceCatalogue
        items={model.catalogue}
        collapsed={sourcesCollapsed}
        onToggle={() => setSourcesCollapsed((current) => !current)}
        copy={copy}
        draggable={model.authoringAvailable}
        onBeginDrag={model.session.start}
        onSelect={model.selectCatalogueItem}
      />
      {showAuthoring ? (
        <CanvasRelationalTreeBlockCanvas
          pendingCondition={pendingCondition}
          onPendingConditionChange={setPendingCondition}
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
          className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden"
        >
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
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
          <details className="max-h-[40%] shrink-0 overflow-auto border-t border-(--border-subtle)">
            <summary className="cursor-pointer px-4 py-2 text-xs text-(--text-muted)">
              {copy.relationalTreeDetailLabel} · {model.selectedNode?.operator.toUpperCase()} ·{' '}
              {model.selectedNode?.output.fields.length} {copy.nodePresentationColumnsLabel}
            </summary>
            <CanvasRelationalTreeNodeDetail node={model.selectedNode} copy={copy} />
          </details>
        </div>
      )}
    </div>
  );
});
