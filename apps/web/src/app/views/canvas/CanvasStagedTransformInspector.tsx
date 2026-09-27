/** Edit a staged Transform against its own semantic document. */
import { useMemo } from 'react';
import type { CanonicalNode } from '../../types/canonical';
import { CanvasRelationAnalysisContext } from './CanvasRelationAnalysisContext';
import { CanvasTransformInspector } from './CanvasTransformInspector';
import type { CanvasStagedOperation } from './canvasStagedOperation';
import {
  assignCanvasStagedRoot,
  decodeCanvasStagedOperation,
} from './canvasStagedOperationDocument';
import { encodeDvtSubstraitSemanticDocument } from './canvasDvtSubstraitSemanticDocument';
import { useCanvasRelationAnalysisSession } from './useCanvasRelationAnalysisSession';
import styles from './CanvasStagedOperationInspector.module.css';

export function CanvasStagedTransformInspector({
  staged,
  transformNode,
  onChange,
  onClose,
}: Readonly<{
  staged: CanvasStagedOperation;
  transformNode: CanonicalNode;
  onChange: (semanticDocument: CanvasStagedOperation['semanticDocument']) => void;
  onClose: () => void;
}>): JSX.Element | null {
  const document = useMemo(() => decodeCanvasStagedOperation(staged), [staged.semanticDocument]);
  const analysis = useCanvasRelationAnalysisSession(document, staged.id);
  if (document == null || analysis == null) return null;
  return (
    <aside data-slot="canvas-staged-operation-inspector" className={styles.inspector}>
      <CanvasRelationAnalysisContext.Provider value={analysis}>
        <CanvasTransformInspector
          relationId={staged.id}
          transformNode={transformNode}
          draft={document}
          onClose={onClose}
          onChange={(next) => {
            onChange(encodeDvtSubstraitSemanticDocument(assignCanvasStagedRoot(next, staged.id)));
          }}
        />
      </CanvasRelationAnalysisContext.Provider>
    </aside>
  );
}
