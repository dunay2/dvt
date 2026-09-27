/** Owned concern: present the active authoring or inspection view of one Model. */
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import type { CanvasRelationalTreeWorkbenchCopy } from './canvasRelationalTreeWorkbench.types';
import type { useCanvasRelationalTreeWorkbenchModel } from './useCanvasRelationalTreeWorkbenchModel';
import { CanvasRelationalTreeAuthoring } from './CanvasRelationalTreeAuthoring';
import { projectCanvasRelationalTreeAuthoringView } from './canvasRelationalTreeAuthoringView';
import { CanvasRelationalTreeInspection } from './CanvasRelationalTreeInspection';
import type { CanvasModelOutputInspectorState } from './CanvasRelationalTreeSideInspector';

type CanvasRelationalTreeContentProps = Readonly<{
  model: ReturnType<typeof useCanvasRelationalTreeWorkbenchModel>;
  transformNode: CanonicalNode;
  nodes: readonly CanonicalNode[];
  edges: readonly CanonicalEdge[];
  copy: CanvasRelationalTreeWorkbenchCopy;
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  onPendingConditionChange: (pending: boolean) => void;
  pendingCondition: boolean;
  onSelectRelation: (relationId: string | null) => void;
  modelOutput: CanvasModelOutputInspectorState;
}>;

export function CanvasRelationalTreeContent(props: CanvasRelationalTreeContentProps): JSX.Element {
  return <CanvasRelationalTreeContentView {...props} />;
}

function CanvasRelationalTreeContentView({
  model,
  transformNode,
  nodes,
  edges,
  copy,
  expanded,
  onExpandedChange,
  onPendingConditionChange,
  pendingCondition,
  onSelectRelation,
  modelOutput,
}: CanvasRelationalTreeContentProps): JSX.Element {
  if (model.authoringAvailable && (model.projection == null || model.session.active)) {
    return (
      <CanvasRelationalTreeAuthoring
        {...projectCanvasRelationalTreeAuthoringView(
          { model, transformNode, nodes, edges, pendingCondition },
          onSelectRelation
        )}
        onPendingConditionChange={onPendingConditionChange}
        expanded={expanded}
        onExpandedChange={onExpandedChange}
        copy={copy}
      />
    );
  }
  if (model.projection == null)
    return (
      <section
        data-slot="canvas-relational-tree-unavailable"
        className="grid min-h-64 place-items-center p-6 text-center text-sm text-(--text-muted)"
      >
        {model.unavailableMessage}
      </section>
    );
  return (
    <CanvasRelationalTreeInspection
      model={model}
      transformNode={transformNode}
      copy={copy}
      expanded={expanded}
      onExpandedChange={onExpandedChange}
      modelOutput={modelOutput}
    />
  );
}
