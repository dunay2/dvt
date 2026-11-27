/** Owned concern: present the active authoring or inspection view of one Model. */
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import type { CanvasRelationalTreeWorkbenchCopy } from './canvasRelationalTreeWorkbench.types';
import type { CanvasRelationalTreeAuthoringContract } from './canvasRelationalTreeWorkbench.types';
import type { useCanvasRelationalTreeWorkbenchModel } from './useCanvasRelationalTreeWorkbenchModel';
import { CanvasJoinTypeChangeProvider } from './CanvasJoinTypeChangeContext';
import { CanvasRelationalTreeAuthoring } from './CanvasRelationalTreeAuthoring';
import { projectCanvasRelationalTreeAuthoringView } from './canvasRelationalTreeAuthoringView';
import { CanvasRelationalTreeInspection } from './CanvasRelationalTreeInspection';
import type { CanvasModelOutputInspectorState } from './CanvasRelationalTreeSideInspector';
import { CanvasRelationalFieldSelectionProvider } from './CanvasRelationalFieldSelectionProvider';
import { CanvasRelationalOperationMenuProvider } from './operation-menu/CanvasRelationalOperationMenuContext';
import type { CanvasTransformSqlQueryBinding } from '../../ports/canvasTransformSql';

type CanvasRelationalTreeContentProps = Readonly<{
  codeProjection?: CanvasTransformSqlQueryBinding;
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
  const authoringView = projectCanvasRelationalTreeAuthoringView(props, props.onSelectRelation);
  const enabled = props.model.authoringAvailable && !props.pendingCondition;
  return (
    <div
      data-slot="canvas-relational-tree-surface"
      className="relative h-full min-h-0 w-full min-w-0 overflow-hidden"
    >
      <CanvasRelationalFieldSelectionProvider
        enabled={enabled}
        onChange={props.model.session.setJoinDraft}
        onConnect={props.model.session.staged.connectField}
      >
        <CanvasRelationalOperationMenuProvider
          enabled={enabled}
          label={props.copy.relationalTreeCanvasLabel}
        >
          <CanvasJoinTypeChangeProvider enabled={enabled} view={authoringView}>
            <CanvasRelationalTreeContentView {...props} authoringView={authoringView} />
          </CanvasJoinTypeChangeProvider>
        </CanvasRelationalOperationMenuProvider>
      </CanvasRelationalFieldSelectionProvider>
    </div>
  );
}

function CanvasRelationalTreeContentView(
  props: CanvasRelationalTreeContentProps & {
    authoringView: ReturnType<typeof projectCanvasRelationalTreeAuthoringView>;
  }
): JSX.Element {
  const { model } = props;
  const showsDraft = model.projection == null || model.session.active;
  if (model.authoringAvailable && showsDraft) {
    return (
      <CanvasRelationalTreeAuthoring
        {...props.authoringView}
        onPendingConditionChange={props.onPendingConditionChange}
        expanded={props.expanded}
        onExpandedChange={props.onExpandedChange}
        modelOutput={props.modelOutput}
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
  return <CanvasRelationalTreeInspection {...props} />;
}
