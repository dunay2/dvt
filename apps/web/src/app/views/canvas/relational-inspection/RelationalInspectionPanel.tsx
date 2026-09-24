/** Owned concern: render the typed applied inspector without deciding operation support. */
import type { CanonicalNode } from '../../../types/canonical';
import type { CanvasRelationalTreeWorkbenchCopy } from '../canvasRelationalTreeWorkbench.types';
import { CanvasRelationalTreeEditorFrame } from '../CanvasRelationalTreeEditorFrame';
import { CanvasRelationalExpressionTree } from '../CanvasRelationalExpressionTree';
import { CanvasRelationalCrossNotice } from '../CanvasRelationalCrossNotice';
import type { RelationalInspection } from './inspectionModel';
import { CanvasRelationFields } from '../CanvasRelationFields';

type InspectionContentProps = Readonly<{
  inspection: RelationalInspection;
  transformNode: CanonicalNode;
  copy: CanvasRelationalTreeWorkbenchCopy;
}>;

function InspectionContent({
  inspection,
  transformNode,
  copy,
}: InspectionContentProps): JSX.Element | null {
  switch (inspection.kind) {
    case 'source':
      return inspection.relationId == null ? null : (
        <CanvasRelationFields relationId={inspection.relationId} />
      );
    case 'summary':
      return <p className="text-xs text-(--text-primary)">{inspection.text}</p>;
    case 'unsupported':
      return <p className="text-xs text-(--text-muted)">{copy.operationUnsupportedLabel}</p>;
    case 'cross':
      return <CanvasRelationalCrossNotice />;
    case 'expressions':
      return (
        <CanvasRelationalExpressionTree
          transformNode={transformNode}
          relationId={inspection.relationId}
        />
      );
  }
}

export function RelationalInspectionPanel({
  inspection,
  onClose,
  ...content
}: Readonly<{
  inspection: RelationalInspection | null;
  transformNode: CanonicalNode;
  copy: CanvasRelationalTreeWorkbenchCopy;
  onClose: () => void;
}>): JSX.Element | null {
  if (inspection == null) return null;
  return (
    <CanvasRelationalTreeEditorFrame
      operation={inspection.operation}
      label={inspection.kind === 'source' ? inspection.label : undefined}
      relationId={inspection.relationId}
      hasExpression={inspection.kind === 'expressions'}
      readOnly
      onClose={onClose}
    >
      <InspectionContent inspection={inspection} {...content} />
    </CanvasRelationalTreeEditorFrame>
  );
}
