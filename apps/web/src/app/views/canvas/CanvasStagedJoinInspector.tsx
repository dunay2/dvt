/** Adapt one configured staged JOIN to the existing canonical JOIN property editor. */
import { useMemo } from 'react';
import type { SubstraitDocument } from '@dvt/substrait-analysis';
import { CanvasRelationAnalysisContext } from './CanvasRelationAnalysisContext';
import { CanvasRelationalTreeJoinEditor } from './CanvasRelationalTreeJoinEditor';
import { decodeCanvasStagedJoin } from './canvasStagedJoinConfiguration';
import type { CanvasStagedOperation } from './canvasStagedOperation';
import { canvasJoinOperationForType, isCanvasJoinOperation } from './canvasRelationalTreeJoinType';
import type { CanvasRelationalTreeWorkbenchCopy } from './canvasRelationalTreeWorkbench.types';
import { encodeDvtSubstraitSemanticDocument } from './canvasDvtSubstraitSemanticDocument';
import { useCanvasRelationAnalysisSession } from './useCanvasRelationAnalysisSession';
import styles from './CanvasStagedOperationInspector.module.css';

function operationFor(document: SubstraitDocument) {
  const root = document.plan.relations[0]?.relType;
  const relation = root?.case === 'root' ? root.value.input?.relType : undefined;
  if (relation?.case !== 'join') return null;
  const operation = canvasJoinOperationForType(relation.value.type);
  return isCanvasJoinOperation(operation) ? operation : null;
}

export function CanvasStagedJoinInspector({
  staged,
  copy,
  onChange,
  onPendingChange,
}: Readonly<{
  staged: CanvasStagedOperation;
  copy: CanvasRelationalTreeWorkbenchCopy;
  onChange: (update: Pick<CanvasStagedOperation, 'operation' | 'semanticDocument'>) => void;
  onPendingChange: (pending: boolean) => void;
}>): JSX.Element | null {
  const document = useMemo(
    () => decodeCanvasStagedJoin(staged.semanticDocument),
    [staged.semanticDocument]
  );
  const analysis = useCanvasRelationAnalysisSession(document, staged.id);
  if (document == null) return null;
  return (
    <aside data-slot="canvas-staged-operation-inspector" className={styles.inspector}>
      <p className={styles.eyebrow}>{copy.canvasNodeContextPropertiesLabel}</p>
      <CanvasRelationAnalysisContext.Provider value={analysis}>
        <CanvasRelationalTreeJoinEditor
          copy={copy}
          selectedRelationId={analysis?.session.rootId ?? null}
          onPendingConditionChange={onPendingChange}
          onChange={(next) => {
            const operation = operationFor(next);
            if (operation == null) return;
            onChange({
              operation,
              semanticDocument: encodeDvtSubstraitSemanticDocument(next),
            });
          }}
        />
      </CanvasRelationAnalysisContext.Provider>
    </aside>
  );
}
