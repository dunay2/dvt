/** Owned concern: present the active authoring or inspection view of one Model. */
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import type { CanvasRelationalTreeWorkbenchCopy } from './canvasRelationalTreeWorkbench.types';
import type { CanvasRelationalTreeAuthoringContract } from './canvasRelationalTreeWorkbench.types';
import type { useCanvasRelationalTreeWorkbenchModel } from './useCanvasRelationalTreeWorkbenchModel';
import { CanvasRelationalTreeAuthoring } from './CanvasRelationalTreeAuthoring';
import { projectCanvasRelationalTreeAuthoringView } from './canvasRelationalTreeAuthoringView';
import { CanvasRelationalTreeInspection } from './CanvasRelationalTreeInspection';
import type { CanvasModelOutputInspectorState } from './CanvasRelationalTreeSideInspector';
import { CanvasRelationalFieldSelectionProvider } from './CanvasRelationalFieldSelectionProvider';
import { CanvasRelationalOperationMenuProvider } from './operation-menu/CanvasRelationalOperationMenuContext';

type CanvasRelationalTreeContentProps = Readonly<{
  model: ReturnType<typeof useCanvasRelationalTreeWorkbenchModel>;
  authoring?: CanvasRelationalTreeAuthoringContract;
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
  return (
    <div
      data-slot="canvas-relational-tree-surface"
      className="relative h-full min-h-0 w-full min-w-0 overflow-hidden"
    >
      <CanvasRelationalFieldSelectionProvider
        enabled={props.model.authoringAvailable && !props.pendingCondition}
        onChange={props.model.session.setJoinDraft}
        onConnect={props.model.session.staged.connectField}
      >
        <CanvasRelationalOperationMenuProvider
          enabled={props.model.authoringAvailable && !props.pendingCondition}
          label={props.copy.relationalTreeCanvasLabel}
        >
          <CanvasRelationalTreeContentView {...props} />
        </CanvasRelationalOperationMenuProvider>
      </CanvasRelationalFieldSelectionProvider>
    </div>
  );
}

function CanvasRelationalTreeContentView(props: CanvasRelationalTreeContentProps): JSX.Element {
  const { model } = props;
  if (model.authoringAvailable && (model.projection == null || model.session.active)) {
    return (
      <CanvasRelationalTreeAuthoring
        {...projectCanvasRelationalTreeAuthoringView(props, props.onSelectRelation)}
        onPendingConditionChange={props.onPendingConditionChange}
        expanded={props.expanded}
        onExpandedChange={props.onExpandedChange}
        copy={props.copy}
        sourceOutputFieldsByRelationId={model.sourceOutputFieldsByRelationId}
      />
    );
  }
  if (model.projection == null || model.session.restorationUnavailable)
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
      authoring={props.authoring}
      transformNode={props.transformNode}
      copy={props.copy}
      expanded={props.expanded}
      onExpandedChange={props.onExpandedChange}
      modelOutput={props.modelOutput}
    />
  );
}
