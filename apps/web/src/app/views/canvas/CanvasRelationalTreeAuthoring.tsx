/** Own the authoring toolbar, viewport and inspector against the existing workbench session. */
import { CanvasRelationalTreeDraftViewport } from './CanvasRelationalTreeDraftViewport';
import { CanvasRelationalTreeOperationShelf } from './CanvasRelationalTreeOperationShelf';
import { CanvasRelationalTreeAuthoringTemplate } from './CanvasRelationalTreeAuthoring.templates';
import type { CanvasModelOutputInspectorState } from './CanvasRelationalTreeSideInspector';
import { CanvasDraftModelOutputInspector } from './CanvasDraftModelOutputInspector';
import { useCanvasRelationalDraftProjection } from './useCanvasRelationalDraftProjection';

import {
  CanvasRelationalOperationDraftInspector,
  type CanvasRelationalOperationDraftInspectorProps,
} from './CanvasRelationalOperationDraftInspector';

type CanvasRelationalTreeAuthoringProps = CanvasRelationalOperationDraftInspectorProps &
  Readonly<{ modelOutput: CanvasModelOutputInspectorState }>;

export function CanvasRelationalTreeAuthoring({
  data,
  actions,
  copy,
  expanded,
  onExpandedChange,
  modelOutput,
  onPendingConditionChange,
  sourceOutputFieldsByRelationId,
}: CanvasRelationalTreeAuthoringProps): JSX.Element {
  const projection = useCanvasRelationalDraftProjection(
    {
      edges: data.edges,
      joinDraft: data.draft,
      nodes: data.nodes,
      operation: data.operation,
      transformNode: data.transformNode,
    },
    data.selectedRelationId,
    actions.reconcileSelection,
    data.selectedPendingId != null || modelOutput.open
  );
  const expand = (id: string | null): void => {
    modelOutput.setOpen(false);
    actions.selectRelation(id);
    onExpandedChange(true);
  };
  return (
    <CanvasRelationalTreeAuthoringTemplate
      label={copy.relationalTreeCanvasLabel}
      toolbar={
        <CanvasRelationalTreeOperationShelf
          copy={copy}
          editable
          onStageOperation={actions.stageOperation}
        />
      }
      viewport={
        <CanvasRelationalTreeDraftViewport
          data={data}
          actions={actions}
          copy={copy}
          projection={projection}
          sourceOutputFieldsByRelationId={sourceOutputFieldsByRelationId}
          onExpandRelation={expand}
          onOpenOutput={() => modelOutput.setOpen(true)}
        />
      }
      inspector={
        <>
          <CanvasRelationalOperationDraftInspector
            data={data}
            actions={actions}
            copy={copy}
            expanded={expanded}
            onExpandedChange={onExpandedChange}
            onPendingConditionChange={onPendingConditionChange}
            sourceOutputFieldsByRelationId={sourceOutputFieldsByRelationId}
          />
          {modelOutput.open ? (
            <CanvasDraftModelOutputInspector
              data={data}
              canonicalRoot={projection.projection?.root ?? null}
              copy={copy}
              onOutputChange={actions.changeDraft}
              onPendingOutputChange={modelOutput.setPending}
              onClose={() => modelOutput.setOpen(false)}
            />
          ) : null}
        </>
      }
    />
  );
}
