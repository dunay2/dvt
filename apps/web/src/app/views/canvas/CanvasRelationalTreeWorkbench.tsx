/** Owned concern: compose the source catalogue and central block Workbench for one Transform. */

import { forwardRef, useEffect, useState } from 'react';
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import type {
  CanvasRelationalTreeAuthoringContract,
  CanvasRelationalTreeWorkbenchCopy,
} from './canvasRelationalTreeWorkbench.types';
import { CanvasRelationalTreeSessionActions } from './CanvasRelationalTreeSessionActions';
import { CanvasRelationalJoinExpressionTree } from './CanvasRelationalJoinExpressionTree';
import { CanvasRelationalTreeEditorFrame } from './CanvasRelationalTreeEditorFrame';
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
    actionsHost?: HTMLElement | null;
  }>
>(function CanvasRelationalTreeWorkbench(
  { transformNode, nodes, edges, copy, authoring, actionsHost },
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
  const [pendingCondition, setPendingCondition] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [sourcesCollapsed, setSourcesCollapsed] = useState(false);
  useEffect(() => {
    if (!model.session.active) setPendingCondition(false);
  }, [model.session.active]);
  const sessionHandle = useCanvasRelationalTreeWorkbenchHandle(ref, model, pendingCondition);

  return (
    <div
      data-slot="canvas-relational-tree-workbench"
      className={`relative grid h-full min-h-0 min-w-0 w-full grid-cols-1 grid-rows-[auto_minmax(0,1fr)] overflow-hidden bg-(--surface-panel) md:grid-rows-1 ${sourcesCollapsed ? 'md:grid-cols-[3rem_minmax(0,1fr)]' : 'md:grid-cols-[14rem_minmax(0,1fr)]'}`}
    >
      <CanvasRelationalTreeSessionActions session={sessionHandle} copy={copy} host={actionsHost} />
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
          onPendingConditionChange={setPendingCondition}
          initiallyExpanded={expanded}
          appendInput={model.session.appendInput}
          choices={model.session.choices}
          copy={copy}
          edges={edges}
          inputs={model.inputs}
          joinDraft={model.session.joinDraft}
          initialRelationId={model.selectedNode?.relationId ?? null}
          nodes={nodes}
          operation={model.session.operation}
          primaryInputId={model.session.primaryInputId}
          secondaryInputId={model.session.secondaryInputId}
          selectedInputIds={model.session.selectedInputIds}
          transformNode={transformNode}
          onAppendJoinInput={model.session.appendJoinInput}
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
            <CanvasRelationalTreeView
              transformNode={transformNode}
              outputName={transformNode.name}
              root={model.projection.root}
              selectedLocator={model.selectedLocator}
              copy={copy}
              onSelect={model.selectTreeNode}
              onExpand={(locator) => {
                model.selectTreeNode(locator);
                setExpanded(true);
                if (model.authoringAvailable) model.session.start();
              }}
            />
          </div>
          {expanded && model.selectedNode?.operator === 'join' ? (
            <CanvasRelationalTreeEditorFrame title="INNER JOIN" onClose={() => setExpanded(false)}>
              <CanvasRelationalJoinExpressionTree
                transformNode={transformNode}
                relationId={model.selectedNode.relationId}
              />
            </CanvasRelationalTreeEditorFrame>
          ) : null}
        </div>
      )}
    </div>
  );
});
