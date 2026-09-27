/** Inspect a configured binary operation with the canonical properties and output controls. */
import { useMemo } from 'react';
import { indexSubstraitRelations, type SubstraitDocument } from '@dvt/substrait-analysis';
import { CanvasRelationAnalysisContext } from './CanvasRelationAnalysisContext';
import { CanvasRelationalTreeEditorFrame } from './CanvasRelationalTreeEditorFrame';
import { CanvasRelationalTreeOperationEditor } from './CanvasRelationalTreeOperationEditor';
import { CanvasRelationOutputs } from './CanvasRelationOutputs';
import { decodeCanvasStagedOperation } from './canvasStagedOperationDocument';
import type { CanvasStagedOperation } from './canvasStagedOperation';
import { canvasJoinOperationForType, isCanvasJoinOperation } from './canvasRelationalTreeJoinType';
import type { CanvasRelationalTreeWorkbenchCopy } from './canvasRelationalTreeWorkbench.types';
import { encodeDvtSubstraitSemanticDocument } from './canvasDvtSubstraitSemanticDocument';
import { useCanvasRelationAnalysisSession } from './useCanvasRelationAnalysisSession';
import { usePendingRelationEdits } from './usePendingRelationEdits';
import type { CanonicalNode } from '../../types/canonical';
import type { CanvasRelationalOperation } from './canvasRelationalOperationChoices';

function operationFor(document: SubstraitDocument, staged: CanvasStagedOperation) {
  const indexed = indexSubstraitRelations(document);
  const relation = indexed.ok
    ? indexed.index.relations.get(staged.id)?.relation.relType
    : undefined;
  if (relation?.case === 'cross' || relation?.case === 'set') return staged.operation;
  if (relation?.case !== 'join') return null;
  const operation = canvasJoinOperationForType(relation.value.type);
  return isCanvasJoinOperation(operation) ? operation : null;
}

export function CanvasStagedBinaryInspector({
  staged,
  editingDocument,
  copy,
  onChange,
  onPendingChange,
  onClose,
  transformNode,
}: Readonly<{
  staged: CanvasStagedOperation;
  editingDocument?: SubstraitDocument | null;
  copy: CanvasRelationalTreeWorkbenchCopy;
  onChange: (
    update: Pick<CanvasStagedOperation, 'operation' | 'semanticDocument'>
  ) => void | boolean;
  onPendingChange: (pending: boolean) => void;
  onClose: () => void;
  transformNode: CanonicalNode;
}>): JSX.Element | null {
  const document = useMemo(
    () => editingDocument ?? decodeCanvasStagedOperation(staged),
    [editingDocument, staged.semanticDocument]
  );
  const analysis = useCanvasRelationAnalysisSession(document, staged.id);
  const [setPropertiesPending, setOutputsPending] = usePendingRelationEdits(onPendingChange);
  if (document == null) return null;
  const change = (next: SubstraitDocument) => {
    const operation = operationFor(next, staged);
    if (operation == null) return;
    return onChange({ operation, semanticDocument: encodeDvtSubstraitSemanticDocument(next) });
  };
  return (
    <CanvasRelationAnalysisContext.Provider value={analysis}>
      <CanvasRelationalTreeEditorFrame
        dataSlot="canvas-staged-operation-inspector"
        operation={staged.operation as CanvasRelationalOperation}
        relationId={staged.id}
        hasExpression={isCanvasJoinOperation(staged.operation)}
        onClose={onClose}
        output={
          <CanvasRelationOutputs
            relationId={staged.id}
            disabled={false}
            onChange={change}
            onPendingChange={setOutputsPending}
          />
        }
      >
        <CanvasRelationalTreeOperationEditor
          copy={copy}
          draft={document}
          transformNode={transformNode}
          selectedRelationId={staged.id}
          cross={staged.operation === 'cross_join'}
          set={!isCanvasJoinOperation(staged.operation) && staged.operation !== 'cross_join'}
          onPendingConditionChange={setPropertiesPending}
          onChangeJoinDraft={change}
        />
      </CanvasRelationalTreeEditorFrame>
    </CanvasRelationAnalysisContext.Provider>
  );
}
