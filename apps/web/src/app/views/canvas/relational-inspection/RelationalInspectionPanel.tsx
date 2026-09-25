/** Owned concern: render the typed applied inspector without deciding operation support. */
import type { CanonicalNode } from '../../../types/canonical';
import type { CanvasRelationalTreeWorkbenchCopy } from '../canvasRelationalTreeWorkbench.types';
import { CanvasRelationalTreeEditorFrame } from '../CanvasRelationalTreeEditorFrame';
import { CanvasRelationalExpressionTree } from '../CanvasRelationalExpressionTree';
import { CanvasRelationalCrossNotice } from '../CanvasRelationalCrossNotice';
import type { RelationalInspection } from './inspectionModel';
import { CanvasRelationFields } from '../CanvasRelationFields';
import { CanvasRelationOutputs } from '../CanvasRelationOutputs';
import type { SubstraitDocument } from '@dvt/substrait-analysis';
import { JoinConditionSummary } from './JoinConditionSummary';

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
      return null;
    case 'join':
      return (
        <JoinConditionSummary relationId={inspection.relationId} transformNode={transformNode} />
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
          showSummary
        />
      );
  }
}

export function RelationalInspectionPanel({
  inspection,
  onClose,
  onEdit,
  onOutputChange,
  ...content
}: Readonly<{
  inspection: RelationalInspection | null;
  transformNode: CanonicalNode;
  copy: CanvasRelationalTreeWorkbenchCopy;
  onClose: () => void;
  onEdit?: () => void;
  onOutputChange?: (document: SubstraitDocument) => boolean;
}>): JSX.Element | null {
  if (inspection == null) return null;
  const output =
    inspection.relationId == null || inspection.kind === 'unsupported' ? null : inspection.kind ===
        'source' || onOutputChange == null ? (
      <CanvasRelationFields relationId={inspection.relationId} />
    ) : (
      <CanvasRelationOutputs
        key={inspection.relationId}
        relationId={inspection.relationId}
        disabled={false}
        orderingOnly
        onChange={onOutputChange}
      />
    );
  return (
    <CanvasRelationalTreeEditorFrame
      operation={inspection.operation}
      label={inspection.kind === 'source' ? inspection.label : undefined}
      relationId={inspection.relationId}
      hasExpression={inspection.kind === 'expressions' || inspection.kind === 'join'}
      readOnly
      onEdit={inspection.kind === 'unsupported' ? undefined : onEdit}
      onClose={onClose}
      output={output}
    >
      <InspectionContent inspection={inspection} {...content} />
    </CanvasRelationalTreeEditorFrame>
  );
}
