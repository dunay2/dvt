/** Edit a staged Transform against its own semantic document. */
import type { SubstraitDocument } from '@dvt/substrait-analysis';
import type { CanonicalNode } from '../../types/canonical';
import { CanvasTransformInspector } from './CanvasTransformInspector';
import type { CanvasStagedOperation } from './canvasStagedOperation';
import { encodeDvtSubstraitSemanticDocument } from './canvasDvtSubstraitSemanticDocument';

export function CanvasStagedTransformInspector({
  staged,
  document,
  transformNode,
  onChange,
  onClose,
  onPendingChange,
}: Readonly<{
  staged: CanvasStagedOperation;
  document: SubstraitDocument;
  transformNode: CanonicalNode;
  onChange: (semanticDocument: CanvasStagedOperation['semanticDocument']) => void | boolean;
  onClose: () => void;
  onPendingChange?: (pending: boolean) => void;
}>): JSX.Element | null {
  return (
    <CanvasTransformInspector
      relationId={staged.id}
      transformNode={transformNode}
      draft={document}
      onClose={onClose}
      onPendingChange={onPendingChange}
      onChange={(next) => {
        return onChange(encodeDvtSubstraitSemanticDocument(next));
      }}
    />
  );
}
