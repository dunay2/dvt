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
  const closeOutput = (): void => modelOutput.setOpen(false);
  const inspectCard =
    <Input, Result extends string | null | void>(
      action: (input: Input) => Result
    ): ((input: Input) => Result) =>
    (input) => {
      const result = action(input);
      if (result !== null) closeOutput();
      return result;
    };
  const viewportActions = {
    ...actions,
    selectRelation: inspectCard(actions.selectRelation),
    selectPending: inspectCard(actions.selectPending),
    selectStagedOperation: inspectCard(actions.selectStagedOperation),
    stageOperation: inspectCard(actions.stageOperation),
    dropSource: inspectCard(actions.dropSource),
  };
  const expand = (id: string | null): void => {
    viewportActions.selectRelation(id);
    onExpandedChange(true);
  };
  return (
    <CanvasRelationalTreeAuthoringTemplate
      label={copy.relationalTreeCanvasLabel}
      toolbar={
        <CanvasRelationalTreeOperationShelf
          copy={copy}
          editable
          onStageOperation={viewportActions.stageOperation}
        />
      }
      viewport={
        <CanvasRelationalTreeDraftViewport
          data={data}
          actions={viewportActions}
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
              onClose={closeOutput}
            />
          ) : null}
        </>
      }
    />
  );
}
