/** Edit a staged Transform against its own semantic document. */
import { useMemo } from 'react';
import type { SubstraitDocument } from '@dvt/substrait-analysis';
import type { CanonicalNode } from '../../types/canonical';
import { CanvasRelationAnalysisContext } from './CanvasRelationAnalysisContext';
import { CanvasTransformInspector } from './CanvasTransformInspector';
import type { CanvasStagedOperation } from './canvasStagedOperation';
import { decodeCanvasStagedOperation } from './canvasStagedOperationDocument';
import { encodeDvtSubstraitSemanticDocument } from './canvasDvtSubstraitSemanticDocument';
import { useCanvasRelationAnalysisSession } from './useCanvasRelationAnalysisSession';

export function CanvasStagedTransformInspector({
  staged,
  editingDocument,
  transformNode,
  onChange,
  onClose,
  onPendingChange,
}: Readonly<{
  staged: CanvasStagedOperation;
  editingDocument?: SubstraitDocument | null;
  transformNode: CanonicalNode;
  onChange: (semanticDocument: CanvasStagedOperation['semanticDocument']) => void | boolean;
  onClose: () => void;
  onPendingChange?: (pending: boolean) => void;
}>): JSX.Element | null {
  const document = useMemo(
    () => editingDocument ?? decodeCanvasStagedOperation(staged),
    [editingDocument, staged.semanticDocument]
  );
  const analysis = useCanvasRelationAnalysisSession(document, staged.id);
  if (document == null || analysis == null) return null;
  return (
    <CanvasRelationAnalysisContext.Provider value={analysis}>
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
    </CanvasRelationAnalysisContext.Provider>
  );
}
