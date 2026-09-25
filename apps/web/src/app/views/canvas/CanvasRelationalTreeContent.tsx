/** Owned concern: present the active authoring or inspection view of one Model. */
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import type { CanvasRelationalTreeWorkbenchCopy } from './canvasRelationalTreeWorkbench.types';
import type { useCanvasRelationalTreeWorkbenchModel } from './useCanvasRelationalTreeWorkbenchModel';
import { CanvasRelationalTreeBlockCanvas } from './CanvasRelationalTreeBlockCanvas';
import { CanvasRelationalTreeCommandError } from './CanvasRelationalTreeCommandError';
import { CanvasRelationalTreeInspection } from './CanvasRelationalTreeInspection';

type CanvasRelationalTreeContentProps = Readonly<{
  model: ReturnType<typeof useCanvasRelationalTreeWorkbenchModel>;
  transformNode: CanonicalNode;
  nodes: readonly CanonicalNode[];
  edges: readonly CanonicalEdge[];
  copy: CanvasRelationalTreeWorkbenchCopy;
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  onPendingConditionChange: (pending: boolean) => void;
  onSelectRelation: (relationId: string | null) => void;
  onOpenModelComposition: () => void;
}>;

export function CanvasRelationalTreeContent(props: CanvasRelationalTreeContentProps): JSX.Element {
  return (
    <>
      <CanvasRelationalTreeCommandError
        visible={props.model.session.commandState === 'error'}
        message={props.copy.relationalTreeUnavailableMessage}
      />
      <CanvasRelationalTreeContentView {...props} />
    </>
  );
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
  onSelectRelation,
  onOpenModelComposition,
}: CanvasRelationalTreeContentProps): JSX.Element {
  if (model.authoringAvailable && (model.projection == null || model.session.active)) {
    const { session } = model;
    return (
      <CanvasRelationalTreeBlockCanvas
        onPendingConditionChange={onPendingConditionChange}
        initiallyExpanded={expanded}
        appendInput={session.appendInput}
        choices={session.choices}
        copy={copy}
        edges={edges}
        inputs={model.inputs}
        joinDraft={session.joinDraft}
        selectedRelationId={model.selectedRelationId}
        onSelectRelation={onSelectRelation}
        onReconcileSelection={model.selectRelation}
        nodes={nodes}
        operation={session.operation}
        primaryInputId={session.primaryInputId}
        secondaryInputId={session.secondaryInputId}
        selectedInputIds={session.selectedInputIds}
        transformNode={transformNode}
        onAppendJoinInput={session.appendJoinInput}
        onChangeJoinDraft={session.setJoinDraft}
        onRemove={session.removal.remove}
        onPlaceInput={session.placeInput}
        onSelectInput={session.selectInput}
        onSelectOperation={session.selectOperation}
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
      onOpenModelComposition={onOpenModelComposition}
    />
  );
}
