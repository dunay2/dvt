/** Owned concern: compose the source catalogue and central block Workbench for one Transform. */

import { forwardRef, useEffect, useState } from 'react';
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import type {
  CanvasRelationalTreeAuthoringContract,
  CanvasRelationalTreeWorkbenchCopy,
} from './canvasRelationalTreeWorkbench.types';
import { CanvasRelationalTreeSessionActions } from './CanvasRelationalTreeSessionActions';
import { CanvasRelationalTreeInspection } from './CanvasRelationalTreeInspection';
import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';
import { resolveCanvasSemanticEditorCopy } from './canvasSemanticEditorCopy';
import { CanvasRelationalTreeBlockCanvas } from './CanvasRelationalTreeBlockCanvas';
import { CanvasRelationalTreeSourceCatalogue } from './CanvasRelationalTreeSourceCatalogue';
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
  const language = useApplicationLanguageStore((state) => state.language);
  const localCopy = resolveCanvasSemanticEditorCopy(language);

  return (
    <div
      data-slot="canvas-relational-tree-workbench"
      className={`relative grid h-full min-h-0 min-w-0 w-full grid-cols-1 grid-rows-[auto_minmax(0,1fr)] overflow-hidden bg-(--surface-panel) md:grid-rows-1 ${sourcesCollapsed ? 'md:grid-cols-[3rem_minmax(0,1fr)]' : 'md:grid-cols-[14rem_minmax(0,1fr)]'}`}
    >
      <CanvasRelationalTreeSessionActions session={sessionHandle} copy={copy} host={actionsHost} />
      {model.session.removal.error == null ? null : (
        <div
          role="alert"
          className="absolute bottom-3 left-1/4 z-30 max-w-lg rounded border border-amber-600 bg-(--surface-panel) p-3 text-sm"
        >
          {model.session.removal.error === 'dependent-condition'
            ? localCopy.removalDependency
            : model.session.removal.error === 'unsupported-projection-type'
              ? localCopy.removalUnsupportedType
              : localCopy.removalUnavailable}
          <button
            type="button"
            aria-label={copy.inspectorDvtRelationalCancel}
            className="ml-2 px-2"
            onClick={model.session.removal.clearError}
          >
            ×
          </button>
        </div>
      )}
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
          onRemove={model.session.removal.remove}
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
        <CanvasRelationalTreeInspection
          model={model}
          transformNode={transformNode}
          copy={copy}
          expanded={expanded}
          onExpandedChange={setExpanded}
        />
      )}
    </div>
  );
});
