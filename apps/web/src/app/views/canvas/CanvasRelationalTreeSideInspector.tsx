/** Owns the single fixed right-hand inspector for the applied relational tree. */
import type { CanonicalNode } from '../../types/canonical';
import type { CanvasRelationalTreeWorkbenchCopy } from './canvasRelationalTreeWorkbench.types';
import type { useCanvasRelationalTreeWorkbenchModel } from './useCanvasRelationalTreeWorkbenchModel';
import { CanvasModelOutputInspector } from './CanvasModelOutputInspector';
import { RelationalInspectionPanel } from './relational-inspection/RelationalInspectionPanel';
import { resolveRelationalInspection } from './relational-inspection/inspectionModel';

export type CanvasModelOutputInspectorState = Readonly<{
  open: boolean;
  setOpen: (open: boolean) => void;
  setPending: (pending: boolean) => void;
}>;

export function CanvasRelationalTreeSideInspector({
  model,
  transformNode,
  copy,
  expanded,
  onExpandedChange,
  modelOutput,
}: Readonly<{
  model: ReturnType<typeof useCanvasRelationalTreeWorkbenchModel>;
  transformNode: CanonicalNode;
  copy: CanvasRelationalTreeWorkbenchCopy;
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  modelOutput: CanvasModelOutputInspectorState;
}>): JSX.Element | null {
  if (model.projection == null) return null;
  if (modelOutput.open)
    return (
      <CanvasModelOutputInspector
        modelName={transformNode.name}
        root={model.projection.root}
        copy={copy}
        editable={model.authoringAvailable && !model.session.active}
        onOutputChange={model.session.applyOutputOrder}
        onPendingOutputChange={modelOutput.setPending}
        onClose={() => modelOutput.setOpen(false)}
      />
    );
  if (!expanded) return null;
  return (
    <RelationalInspectionPanel
      inspection={resolveRelationalInspection(model.selectedNode)}
      transformNode={transformNode}
      copy={copy}
      onClose={() => onExpandedChange(false)}
      onEdit={model.authoringAvailable ? model.session.start : undefined}
      onOutputChange={model.authoringAvailable ? model.session.applyOutputOrder : undefined}
    />
  );
}
