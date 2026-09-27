/** Adapt one configured staged JOIN to the existing canonical JOIN property editor. */
import { useMemo } from 'react';
import { indexSubstraitRelations, type SubstraitDocument } from '@dvt/substrait-analysis';
import { CanvasRelationAnalysisContext } from './CanvasRelationAnalysisContext';
import { CanvasRelationalTreeJoinEditor } from './CanvasRelationalTreeJoinEditor';
import { decodeCanvasStagedJoin } from './canvasStagedJoinConfiguration';
import type { CanvasStagedOperation } from './canvasStagedOperation';
import { canvasJoinOperationForType, isCanvasJoinOperation } from './canvasRelationalTreeJoinType';
import type { CanvasRelationalTreeWorkbenchCopy } from './canvasRelationalTreeWorkbench.types';
import { encodeDvtSubstraitSemanticDocument } from './canvasDvtSubstraitSemanticDocument';
import { useCanvasRelationAnalysisSession } from './useCanvasRelationAnalysisSession';
import styles from './CanvasStagedOperationInspector.module.css';

function operationFor(document: SubstraitDocument, relationId: string) {
  const indexed = indexSubstraitRelations(document);
  const relation = indexed.ok
    ? indexed.index.relations.get(relationId)?.relation.relType
    : undefined;
  if (relation?.case !== 'join') return null;
  const operation = canvasJoinOperationForType(relation.value.type);
  return isCanvasJoinOperation(operation) ? operation : null;
}

export function CanvasStagedJoinInspector({
  staged,
  editingDocument,
  copy,
  onChange,
  onPendingChange,
}: Readonly<{
  staged: CanvasStagedOperation;
  editingDocument?: SubstraitDocument | null;
  copy: CanvasRelationalTreeWorkbenchCopy;
  onChange: (
    update: Pick<CanvasStagedOperation, 'operation' | 'semanticDocument'>
  ) => void | boolean;
  onPendingChange: (pending: boolean) => void;
}>): JSX.Element | null {
  const document = useMemo(
    () => editingDocument ?? decodeCanvasStagedJoin(staged.semanticDocument),
    [editingDocument, staged.semanticDocument]
  );
  const analysis = useCanvasRelationAnalysisSession(document, staged.id);
  if (document == null) return null;
  return (
    <aside data-slot="canvas-staged-operation-inspector" className={styles.inspector}>
      <p className={styles.eyebrow}>{copy.canvasNodeContextPropertiesLabel}</p>
      <CanvasRelationAnalysisContext.Provider value={analysis}>
        <CanvasRelationalTreeJoinEditor
          copy={copy}
          selectedRelationId={staged.id}
          onPendingConditionChange={onPendingChange}
          onChange={(next) => {
            const operation = operationFor(next, staged.id);
            if (operation == null) return;
            return onChange({
              operation,
              semanticDocument: encodeDvtSubstraitSemanticDocument(next),
            });
          }}
        />
      </CanvasRelationAnalysisContext.Provider>
    </aside>
  );
}
