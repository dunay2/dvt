/**
 * Owned concern: compose the single inspector for the applied relational tree.
 * @baseline GH-3596: only retained final JOIN Output selection survives disconnection.
 * @decision Read the narrow permission from the existing canonical session.
 * @consequence General editor and Source controls keep their existing authoring guards.
 * @version 1.1.0
 */
import type { CanonicalNode } from '../../types/canonical';
import type { CanvasRelationalTreeWorkbenchCopy } from './canvasRelationalTreeWorkbench.types';
import type { useCanvasRelationalTreeWorkbenchModel } from './useCanvasRelationalTreeWorkbenchModel';
import { CanvasModelOutputInspector } from './CanvasModelOutputInspector';
import { RelationalInspectionPanel } from './relational-inspection/RelationalInspectionPanel';
import { resolveRelationalInspection } from './relational-inspection/inspectionModel';
import { CanvasTransformInspector } from './CanvasTransformInspector';
import { CanvasSourceOccurrenceOutputs } from './CanvasSourceOccurrenceOutputs';
import type { CanvasRelationalTreeAuthoringContract } from './canvasRelationalTreeWorkbench.types';

export type CanvasModelOutputInspectorState = Readonly<{
  open: boolean;
  setOpen: (open: boolean) => void;
  setPending: (pending: boolean) => void;
}>;

export function CanvasRelationalTreeSideInspector({
  model,
  authoring,
  transformNode,
  copy,
  expanded,
  onExpandedChange,
  modelOutput,
}: Readonly<{
  model: ReturnType<typeof useCanvasRelationalTreeWorkbenchModel>;
  authoring?: CanvasRelationalTreeAuthoringContract;
  transformNode: CanonicalNode;
  copy: CanvasRelationalTreeWorkbenchCopy;
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  modelOutput: CanvasModelOutputInspectorState;
}>): JSX.Element | null {
  if (model.projection == null) return null;
  const analysis = model.session.analysis;
  const retainedOutputEditable =
    authoring?.canEditNode === true &&
    !model.session.restorationUnavailable &&
    analysis?.document != null &&
    analysis.error == null &&
    analysis.session.canEditRetainedJoinOutput(model.projection.root.relationId ?? '');
  if (modelOutput.open)
    return (
      <CanvasModelOutputInspector
        modelName={transformNode.name}
        root={model.projection.root}
        copy={copy}
        editable={(model.authoringAvailable || retainedOutputEditable) && !model.session.active}
        onOutputChange={model.session.applyOutputOrder}
        onPendingOutputChange={modelOutput.setPending}
        onClose={() => modelOutput.setOpen(false)}
      />
    );
  if (!expanded) return null;
  if (model.selectedNode?.operator === 'project' && model.selectedNode.relationId != null)
    return (
      <CanvasTransformInspector
        key={model.selectedNode.relationId}
        relationId={model.selectedNode.relationId}
        transformNode={transformNode}
        onChange={model.authoringAvailable ? model.session.applyOutputOrder : undefined}
        onClose={() => onExpandedChange(false)}
        onPendingChange={modelOutput.setPending}
      />
    );
  const inspection = resolveRelationalInspection(model.selectedNode);
  const selectedProducerId = model.projection.inputs.find(
    (input) => input.relationId === inspection?.relationId
  )?.sourceNodeId;
  const sourceInput = model.inputs.find((input) => input.nodeId === selectedProducerId);
  const publishedFieldNames =
    (inspection?.relationId == null
      ? undefined
      : model.sourceOutputFieldsByRelationId.get(inspection.relationId)) ?? [];
  return (
    <RelationalInspectionPanel
      key={inspection?.relationId ?? inspection?.operation}
      inspection={inspection}
      sourceOutput={
        inspection?.kind === 'source' && sourceInput != null ? (
          <CanvasSourceOccurrenceOutputs
            input={sourceInput}
            publishedFieldNames={publishedFieldNames}
            consumerNodeId={transformNode.id}
            onMapInput={model.authoringAvailable ? authoring?.onMapInput : undefined}
            onRemoveInput={model.authoringAvailable ? authoring?.onRemoveInput : undefined}
          />
        ) : undefined
      }
      transformNode={transformNode}
      copy={copy}
      onClose={() => onExpandedChange(false)}
      onEdit={model.authoringAvailable ? model.session.start : undefined}
      onOutputChange={model.authoringAvailable ? model.session.applyOutputOrder : undefined}
    />
  );
}
